import { z } from 'zod';
import type { Solution } from '../types';

export const SolutionSchema = z.object({
  problemSummary: z.string().max(400),
  immediateActions: z.array(z.object({          // 예산 없이 바로
    action: z.string(), owner: z.string(), note: z.string().optional(),
  })).max(5),
  shortTerm: z.array(z.object({                 // 분기 내
    action: z.string(), expectedEffect: z.string(),
  })).max(5),
  longTerm: z.array(z.object({                  // 예산 반영 필요
    task: z.string(), budgetNeeded: z.boolean(), note: z.string().optional(),
  })).max(5),
  referencedCases: z.array(z.object({
    bestPracticeId: z.string(), why: z.string(),
  })),
  needsVerification: z.array(z.string()),       // 담당자가 확인할 사항
  confidence: z.enum(['low', 'medium', 'high']),
});

/** AI 응답 문자열에서 JSON을 꺼내 검증. 코드펜스나 앞뒤 잡문이 있어도 첫 { ~ 마지막 } 사이를 씀. */
export function parseSolutionText(text: string): { ok: true; value: Solution } | { ok: false; error: string } {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: 'JSON 없음' };
  let data: unknown;
  try { data = JSON.parse(text.slice(start, end + 1)); } catch (e) { return { ok: false, error: `JSON 파싱 실패: ${(e as Error).message}` }; }
  return validateSolution(data);
}

export function validateSolution(data: unknown): { ok: true; value: Solution } | { ok: false; error: string } {
  const r = SolutionSchema.safeParse(data);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  return { ok: true, value: r.data as Solution };
}

/** 후처리: 입력으로 주지 않은 사례 id 제거 (명세 §5.3) */
export function postProcessSolution(s: Solution, allowedCaseIds: string[]): Solution {
  const allowed = new Set(allowedCaseIds);
  const seen = new Set<string>();
  return {
    ...s,
    referencedCases: s.referencedCases.filter((c) => {
      if (!allowed.has(c.bestPracticeId) || seen.has(c.bestPracticeId)) return false;
      seen.add(c.bestPracticeId);
      return true;
    }),
  };
}
