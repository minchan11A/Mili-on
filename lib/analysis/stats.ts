/**
 * 평균 점수, 추세, 급증 감지 (명세 §5.4).
 * 급증: 카테고리별 "최근 4주 주평균 / 이전 12주 주평균" ≥ 1.8 이고 최근 4주 건수 ≥ 10
 */
import type { Category, Trend } from '../types';

export const DAY = 86_400_000;
export const SPIKE_RATIO = 1.8;
export const SPIKE_MIN_RECENT = 10;

export function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
export const round1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);
export const round2 = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);

export function daysBetween(a: string | Date, b: string | Date): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY);
}

export function monthKey(d: string | Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
}

/** now 기준 최근 n개월 키 (오래된 것 → 최근) */
export function lastMonths(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

export function trendOf(delta: number | null, eps = 0.1): Trend {
  if (delta === null) return 'flat';
  if (delta > eps) return 'up';
  if (delta < -eps) return 'down';
  return 'flat';
}

export interface SpikeResult { category: Category; ratio: number; recentCount: number; recentWeekly: number; baseWeekly: number; isSpike: boolean }

/** createdAt 목록으로 급증 판정 */
export function detectSpike(category: Category, dates: Array<string | Date>, now = new Date()): SpikeResult {
  const t = now.getTime();
  let recent = 0, base = 0;
  for (const d of dates) {
    const age = (t - new Date(d).getTime()) / DAY;
    if (age < 0) continue;
    if (age < 28) recent++;
    else if (age < 28 + 84) base++;
  }
  const recentWeekly = recent / 4;
  const baseWeekly = base / 12;
  const ratio = baseWeekly === 0 ? (recent > 0 ? Infinity : 0) : recentWeekly / baseWeekly;
  return {
    category, recentCount: recent,
    recentWeekly: Math.round(recentWeekly * 100) / 100, baseWeekly: Math.round(baseWeekly * 100) / 100,
    ratio: Number.isFinite(ratio) ? Math.round(ratio * 10) / 10 : 99,
    isSpike: ratio >= SPIKE_RATIO && recent >= SPIKE_MIN_RECENT,
  };
}
