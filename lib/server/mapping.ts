/** 도메인 테이블 ↔ Prisma 모델 매핑 (시드 스크립트와 서버 공용) */
import type { TableName } from '../core/mutations';

export const MODEL_OF: Record<TableName, string> = {
  ranges: 'trainingRange', users: 'user', records: 'trainingRecord', reviews: 'review', issues: 'issue',
  proposals: 'proposal', empathies: 'proposalEmpathy', history: 'statusHistory', replies: 'officialReply',
  solutions: 'aiSolution', bestPractices: 'bestPractice', guides: 'guideEntry', questions: 'question',
  answers: 'answer', reports: 'report', audits: 'maskingAudit',
};

const DATE_KEYS = new Set(['createdAt', 'updatedAt', 'completedAt', 'decidedAt', 'generatedAt']);

/** ISO 문자열 날짜를 Date로, undefined 제거 */
export function toDbRow(_table: TableName, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    out[k] = DATE_KEYS.has(k) && typeof v === 'string' ? new Date(v) : v;
  }
  return out;
}
