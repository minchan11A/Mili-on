/**
 * AI 대책 생성 흐름 (명세 §5.3). 서버 API와 build-ai-cache 스크립트가 같이 씁니다.
 *  1. 대표 제안 20건 선택 (공감 많은 순 + 최신)
 *  2. 각 제안에 maskText. 차단된 제안은 제외하고 감사 기록 대상으로 돌려줌
 *  3. vault를 하나로 합침 (같은 원문이면 같은 토큰)
 *  4. 공급자 호출  5. 응답 문자열 전체 restoreText  6. 사례 id 후처리
 * vault는 이 함수 밖으로 나가지 않습니다.
 */
import { countEntities, createSharedVault, maskText, restoreDeep } from '../masking';
import type { Category, Solution, Trend } from '../types';
import { buildSolutionPrompt } from './prompts';
import { postProcessSolution } from './schema';
import type { LlmProvider, SolutionInput } from './types';

export interface FlowProposal { id: string; title: string; body: string; empathyCount: number; createdAt: string }

export interface SolutionFlowInput {
  issueId: string; category: Category; subtopic: string;
  proposals: FlowProposal[];
  stats: { proposalCount: number; empathyCount: number; rangeCount: number; trend: Trend };
  bestPractices: Array<{ id: string; title: string; before: string; after: string }>;
}

export interface AuditEntry {
  purpose: 'AI_SOLUTION'; maskedText: string; entityCounts: Record<string, number>;
  blocked: boolean; blockReasons: string[]; provider: string;
}

export interface SolutionFlowResult {
  solution: Solution;
  /** 외부로 나간 텍스트 원문 (마스킹 후 프롬프트 전체) */
  maskedRequest: string;
  audits: AuditEntry[];
  blockedCount: number;
  usedProposalIds: string[];
}

export function selectRepresentative(proposals: FlowProposal[], limit = 20): FlowProposal[] {
  return [...proposals]
    .sort((a, b) => b.empathyCount - a.empathyCount || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function prepareSolutionRequest(input: SolutionFlowInput, providerName: string) {
  const sv = createSharedVault();
  const masked: string[] = [];
  const audits: AuditEntry[] = [];
  const usedProposalIds: string[] = [];
  let blockedCount = 0;
  let entityCounts: Record<string, number> = {};
  for (const p of selectRepresentative(input.proposals)) {
    const r = maskText(`${p.title} - ${p.body}`, { sharedVault: sv });
    if (r.blocked) {
      blockedCount++;
      // 차단 건은 외부로 나가지 않음. 감사 로그에는 "차단됨"만 남기고 원문은 저장하지 않음
      audits.push({ purpose: 'AI_SOLUTION', maskedText: '(차단되어 전송하지 않음)', entityCounts: countEntities(r.entities), blocked: true, blockReasons: r.blockReasons, provider: providerName });
      continue;
    }
    masked.push(r.masked);
    usedProposalIds.push(p.id);
    for (const [k, v] of Object.entries(countEntities(r.entities))) entityCounts[k] = (entityCounts[k] ?? 0) + v;
  }
  // 사례 텍스트도 마스킹해서 같은 vault 사용
  const bestPractices = input.bestPractices.map((b) => ({
    id: b.id,
    title: maskText(b.title, { sharedVault: sv }).masked,
    before: maskText(b.before, { sharedVault: sv }).masked,
    after: maskText(b.after, { sharedVault: sv }).masked,
  }));
  const solutionInput: SolutionInput = {
    issueId: input.issueId, category: input.category, subtopic: input.subtopic,
    maskedProposals: masked, stats: input.stats, bestPractices,
  };
  const maskedRequest = buildSolutionPrompt(solutionInput);
  audits.push({ purpose: 'AI_SOLUTION', maskedText: maskedRequest, entityCounts, blocked: false, blockReasons: [], provider: providerName });
  entityCounts = {};
  return { solutionInput, maskedRequest, audits, blockedCount, usedProposalIds, vault: sv.vault };
}

export async function runSolutionFlow(provider: LlmProvider, input: SolutionFlowInput): Promise<SolutionFlowResult> {
  const prep = prepareSolutionRequest(input, provider.name);
  const raw = await provider.generateSolution(prep.solutionInput);
  const restored = restoreDeep(raw, prep.vault);
  const solution = postProcessSolution(restored, input.bestPractices.map((b) => b.id));
  return { solution, maskedRequest: prep.maskedRequest, audits: prep.audits, blockedCount: prep.blockedCount, usedProposalIds: prep.usedProposalIds };
}
