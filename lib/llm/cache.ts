/**
 * 사전 생성 AI 응답 캐시 (명세 §8.2). 브라우저·서버 공용.
 * data/demo/ai-cache/{issueId}.json 은 scripts/build-ai-cache.ts 가 만들고 사람이 검수합니다.
 */
import cacheIndex from '../../data/demo/ai-cache/index.json';
import { CATEGORY_LABEL } from '../constants';
import type { Solution } from '../types';
import { answerFromGuides } from './qna';
import type { LlmProvider, QnaInput, SolutionInput, SummaryInput } from './types';

export interface CachedSolutionFile {
  issueId: string;
  solution: Solution;
  maskedRequest: string;
  provider: string;
  generatedAt: string;
  reviewed?: boolean;
}

export const CACHED_ISSUE_IDS: ReadonlySet<string> = new Set((cacheIndex as { issueIds: string[] }).issueIds);

export function hasCachedSolution(issueId: string): boolean {
  return CACHED_ISSUE_IDS.has(issueId);
}

export async function loadCachedSolution(issueId: string): Promise<CachedSolutionFile | null> {
  if (!hasCachedSolution(issueId) || !/^[A-Za-z0-9_-]+$/.test(issueId)) return null;
  const mod = await import(`../../data/demo/ai-cache/${issueId}.json`);
  return (mod.default ?? mod) as CachedSolutionFile;
}

export class NoCacheError extends Error {
  constructor(public readonly issueId: string) { super('이 이슈는 시연 캐시가 없습니다'); }
}

export const cacheProvider: LlmProvider = {
  name: 'cache',
  async generateSolution(input: SolutionInput) {
    const f = await loadCachedSolution(input.issueId);
    if (!f) throw new NoCacheError(input.issueId);
    return f.solution;
  },
  async summarizeIssue(input: SummaryInput) {
    return `${CATEGORY_LABEL[input.category]} 분야 "${input.subtopic}" 관련 제안이 ${input.maskedProposals.length}건 모였습니다. (요약은 사전 생성 캐시가 없어 자동 문구로 표시합니다)`;
  },
  async answerQuestion(input: QnaInput) {
    return answerFromGuides(input);
  },
};
