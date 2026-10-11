import 'server-only';
import type { MaskingAuditRec } from '../types';
import { prisma } from './db';

/** 마스킹 감사 로그: 외부로 나간 텍스트만 기록. 원문·vault는 저장하지 않음 */
export async function recordAudit(a: Omit<MaskingAuditRec, 'id' | 'createdAt'>) {
  await prisma.maskingAudit.create({ data: { ...a, entityCounts: a.entityCounts } });
}
