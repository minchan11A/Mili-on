import { describe, expect, it } from 'vitest';
import { parseSolutionText, postProcessSolution, validateSolution } from '@/lib/llm/schema';
import { runSolutionFlow, prepareSolutionRequest } from '@/lib/llm/flow';
import type { LlmProvider } from '@/lib/llm/types';
import type { Solution } from '@/lib/types';

const ok: Solution = {
  problemSummary: '배식 대기가 깁니다',
  immediateActions: [{ action: '조별 시간 분산', owner: '교육 담당' }],
  shortTerm: [{ action: '배식구 증설', expectedEffect: '대기 단축' }],
  longTerm: [{ task: '식당 동선 재설계', budgetNeeded: true }],
  referencedCases: [{ bestPracticeId: 'bp-01', why: '같은 문제' }],
  needsVerification: ['공간 여건'],
  confidence: 'high',
};

describe('SolutionSchema', () => {
  it('정상 JSON 통과 (코드펜스·잡문이 섞여도)', () => {
    expect(validateSolution(ok).ok).toBe(true);
    expect(parseSolutionText('```json\n' + JSON.stringify(ok) + '\n```').ok).toBe(true);
  });
  it('필드 누락 거부', () => {
    const { confidence: _c, ...missing } = ok;
    expect(validateSolution(missing).ok).toBe(false);
    expect(validateSolution({ ...ok, immediateActions: Array(6).fill(ok.immediateActions[0]) }).ok).toBe(false);
  });
  it('존재하지 않는 사례 id 제거', () => {
    const s = postProcessSolution({ ...ok, referencedCases: [...ok.referencedCases, { bestPracticeId: 'bp-99', why: '지어냄' }] }, ['bp-01']);
    expect(s.referencedCases.map((c) => c.bestPracticeId)).toEqual(['bp-01']);
  });
});

describe('AI 대책 흐름 (마스킹 → 호출 → 복원)', () => {
  const input = {
    issueId: 'ISS-1', category: 'MEAL' as const, subtopic: '배식 대기시간',
    proposals: [
      { id: 'p1', title: '배식 줄', body: '3사단 식당 배식 줄이 길어요. 문의 010-1234-5678', empathyCount: 5, createdAt: '2026-11-01' },
      { id: 'p2', title: '좌표', body: '37.5123, 127.0456 근처 식당', empathyCount: 9, createdAt: '2026-11-02' },
    ],
    stats: { proposalCount: 2, empathyCount: 14, rangeCount: 1, trend: 'up' as const },
    bestPractices: [{ id: 'bp-01', title: '배식구 증설', before: '1개', after: '2개' }],
  };
  it('차단 제안은 제외, 외부로는 마스킹본만, 응답은 복원', async () => {
    let sent = '';
    const provider: LlmProvider = {
      name: 'test',
      async generateSolution(i) { sent = i.maskedProposals.join('\n'); return { ...ok, problemSummary: '[부대_1] 배식 개선', referencedCases: [{ bestPracticeId: 'bp-99', why: 'x' }] }; },
      async summarizeIssue() { return ''; },
      async answerQuestion() { return null; },
    };
    const r = await runSolutionFlow(provider, input);
    expect(sent).toContain('[부대_1]');
    expect(sent).not.toContain('3사단');
    expect(sent).not.toContain('010-1234');
    expect(sent).not.toContain('37.5123');
    expect(r.blockedCount).toBe(1);
    expect(r.solution.problemSummary).toBe('3사단 배식 개선');
    expect(r.solution.referencedCases).toEqual([]);
    expect(r.maskedRequest).not.toContain('3사단');
    expect(r.audits.some((a) => a.blocked)).toBe(true);
  });
  it('감사 로그에는 원문이 남지 않음', () => {
    const prep = prepareSolutionRequest(input, 'test');
    for (const a of prep.audits) expect(a.maskedText).not.toMatch(/3사단|010-1234|37\.5123/);
  });
});
