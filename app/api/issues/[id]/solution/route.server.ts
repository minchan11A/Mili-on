import { buildSolutionFlowInput } from '@/lib/core/ai';
import { recordSolution } from '@/lib/core/mutations';
import { AppError, ForbiddenError, canHandleIssue, solutionView } from '@/lib/core/queries';
import { getLlmProvider } from '@/lib/llm';
import { loadCachedSolution, NoCacheError } from '@/lib/llm/cache';
import { prepareSolutionRequest, runSolutionFlow } from '@/lib/llm/flow';
import { SolutionGenerationError } from '@/lib/llm/types';
import { recordAudit } from '@/lib/server/audit';
import { context, handle, json, write, type RouteParams } from '@/lib/server/handler';
import { checkAiRateLimit } from '@/lib/server/ratelimit';

export const maxDuration = 60;

/** AI 대책 생성 (명세 §5.3 호출 흐름). 마스킹 → 공급자 호출 → 복원 → 저장. vault는 저장하지 않음 */
export const POST = handle(async (_req: Request, { params }: RouteParams<{ id: string }>) => {
  const issueId = (await params).id;
  const c = await context();
  if (!canHandleIssue(c, issueId)) throw new ForbiddenError('이 이슈의 AI 대책을 생성할 권한이 없습니다');
  if (!checkAiRateLimit(c.viewer!.id)) throw new AppError('AI 호출은 1분에 5회까지 가능합니다. 잠시 후 다시 시도하세요', 429, 'RATE_LIMIT');

  const { provider, fallbackNotice } = getLlmProvider();
  const input = buildSolutionFlowInput(c, issueId);
  const cached = provider.name === 'cache' ? await loadCachedSolution(issueId) : null;
  if (provider.name === 'cache' && !cached) throw new AppError('이 이슈는 사전 생성 캐시가 없고 AI 키도 설정되지 않았습니다', 404, 'NO_CACHE');

  let flow;
  try {
    flow = await runSolutionFlow(provider, input);
  } catch (e) {
    // 실패해도 외부로 나간 텍스트는 감사 로그에 남김
    const prep = prepareSolutionRequest(input, provider.name);
    for (const a of prep.audits) await recordAudit(a);
    if (e instanceof NoCacheError) throw new AppError(e.message, 404, 'NO_CACHE');
    if (e instanceof SolutionGenerationError) throw new AppError(e.message, 502, 'AI_FAILED');
    throw new AppError(`AI 초안 생성 실패: ${(e as Error).message}`, 502, 'AI_FAILED');
  }
  const { result, ctx } = await write(c, (mc) => recordSolution(mc, {
    issueId, provider: provider.name, maskedRequest: flow.maskedRequest, solution: flow.solution,
    generatedAt: cached?.generatedAt ?? null, reviewed: cached?.reviewed, audits: flow.audits,
  }));
  return json(solutionView(ctx, ctx.ds.solutions.find((s) => s.id === result.id)!, { fallbackNotice, blockedCount: flow.blockedCount }), 201);
});
