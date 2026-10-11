import 'server-only';
import { AI_RATE_LIMIT_PER_MIN } from '../constants';

/** AI 호출 API: 사용자당 분당 5회 (간단한 메모리 레이트 리밋, 명세 §7) */
const hits = new Map<string, number[]>();

export function checkAiRateLimit(userId: string, limit = AI_RATE_LIMIT_PER_MIN): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= limit) { hits.set(userId, recent); return false; }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}
