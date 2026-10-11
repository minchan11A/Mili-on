/**
 * 우선순위 점수 (명세 §5.4). "AI가 정했다"가 아니라 공식이 보이게 근거를 함께 돌려줍니다.
 *   priority = log2(1 + 제안수 + 공감수) × 평균 불만강도(1~3) × (안전 관련 ? 1.5 : 1) × 최근성
 *   최근성 = 최근 30일 제안 비율이 50% 이상이면 1.2, 아니면 1.0
 */
import type { PriorityBreakdown } from '../types';

export const SAFETY_KEYWORDS = ['부상', '안전', '미끄럼', '미끄러', '식중독', '화재', '감전', '추락', '낙상', '골절', '열사병', '저체온', '배탈'];

export function isSafetyText(...texts: Array<string | null | undefined>): boolean {
  return texts.some((t) => !!t && SAFETY_KEYWORDS.some((k) => t.includes(k)));
}

export interface PriorityInput {
  proposalCount: number;
  empathyCount: number;
  avgSentiment: number;      // 1~3
  isSafety: boolean;
  recentRatio: number;       // 최근 30일 제안 비율 0~1
}

export function priorityScore(i: PriorityInput): PriorityBreakdown {
  const volume = Math.log2(1 + i.proposalCount + i.empathyCount);
  const sentiment = Math.min(3, Math.max(1, i.avgSentiment || 1));
  const safety = i.isSafety ? 1.5 : 1;
  const recency = i.recentRatio >= 0.5 ? 1.2 : 1.0;
  const score = Math.round(volume * sentiment * safety * recency * 100) / 100;
  return { volume: Math.round(volume * 100) / 100, sentiment: Math.round(sentiment * 100) / 100, safety, recency, score, proposals: i.proposalCount, empathies: i.empathyCount };
}

export function explainPriority(b: PriorityBreakdown): string {
  return `log2(1 + 제안 ${b.proposals} + 공감 ${b.empathies}) = ${b.volume} × 불만강도 ${b.sentiment} × 안전 ${b.safety} × 최근성 ${b.recency} = ${b.score}`;
}
