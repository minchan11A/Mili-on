/**
 * 이슈 → AI 대책 흐름 입력 만들기 (두 모드 공용)
 */
import type { SolutionFlowInput } from '../llm/flow';
import { indexOf, issueView, NotFoundError, type Ctx } from './queries';

export function buildSolutionFlowInput(c: Ctx, issueId: string): SolutionFlowInput {
  const v = issueView(c, issueId);
  const iss = c.ds.issues.find((i) => i.id === issueId);
  if (!v || !iss) throw new NotFoundError('이슈를 찾을 수 없습니다');
  const ix = indexOf(c.ds);
  const ps = (ix.proposalsByIssue.get(issueId) ?? []).filter((p) => p.state === 'VISIBLE');
  return {
    issueId, category: iss.category, subtopic: iss.subtopic,
    proposals: ps.map((p) => ({ id: p.id, title: p.title, body: p.body, empathyCount: ix.empathyCount.get(p.id) ?? 0, createdAt: p.createdAt })),
    stats: { proposalCount: v.proposalCount, empathyCount: v.empathyCount, rangeCount: v.rangeCount, trend: v.trend },
    // 근거 후보: 같은 카테고리의 개선 사례
    bestPractices: c.ds.bestPractices.filter((b) => b.category === iss.category).map((b) => ({ id: b.id, title: b.title, before: b.before, after: b.after })),
  };
}
