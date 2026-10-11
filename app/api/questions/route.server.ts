import { z } from 'zod';
import { askQuestion } from '@/lib/core/mutations';
import { AppError, listQuestions } from '@/lib/core/queries';
import { getLlmProvider } from '@/lib/llm';
import { maskText } from '@/lib/masking';
import { body, context, handle, json, write } from '@/lib/server/handler';
import { checkAiRateLimit } from '@/lib/server/ratelimit';

const Input = z.object({ rangeId: z.string(), body: z.string().min(1).max(300) });

/** 질문 + AI 1차 답변. 상용 AI를 쓸 때도 질문은 마스킹 후 전송하고, 근거 가이드가 없으면 답하지 않음 */
export const POST = handle(async (req: Request) => {
  const input = await body(req, Input);
  const c = await context();
  const { provider } = getLlmProvider();
  let ai: { body: string; sourceGuideIds: string[]; provider: string } | null | undefined;
  if (provider.name !== 'cache' && c.viewer) {
    if (!checkAiRateLimit(c.viewer.id)) throw new AppError('AI 호출은 1분에 5회까지 가능합니다', 429, 'RATE_LIMIT');
    const m = maskText(input.body);
    if (!m.blocked) {
      const guides = c.ds.guides.filter((g) => g.rangeId === input.rangeId && g.state === 'VISIBLE')
        .map((g) => ({ id: g.id, section: g.section, body: maskText(g.body).masked }));
      try {
        const a = await provider.answerQuestion({ question: m.masked, guides });
        ai = a ? { ...a, provider: provider.name } : null;
      } catch { ai = undefined; /* 실패 시 오프라인 키워드 답변으로 대체 */ }
    }
  }
  const { result, ctx } = await write(c, (mc) => askQuestion(mc, input.rangeId, input.body, ai));
  return json(listQuestions(ctx, input.rangeId).find((q) => q.id === result.id), 201);
});
