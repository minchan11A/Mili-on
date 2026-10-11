import { z } from 'zod';
import { askQuestion } from '@/lib/core/mutations';
import { listQuestions } from '@/lib/core/queries';
import { body, context, handle, json, write } from '@/lib/server/handler';

const Input = z.object({ rangeId: z.string(), body: z.string().min(1).max(300) });

/**
 * 질문 + 자동 1차 답변. 상용 AI(Gemini 등)는 부르지 않고, 그 훈련장 가이드에서 근거를 찾아 답합니다
 * (lib/llm/qna.ts의 키워드 매칭). 근거 가이드가 없으면 "담당자 답변을 기다리는 중"으로 둡니다.
 */
export const POST = handle(async (req: Request) => {
  const input = await body(req, Input);
  const { result, ctx } = await write(await context(), (mc) => askQuestion(mc, input.rangeId, input.body));
  return json(listQuestions(ctx, input.rangeId).find((q) => q.id === result.id), 201);
});
