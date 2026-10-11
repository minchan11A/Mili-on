import 'server-only';
import type { Prisma } from '@prisma/client';
import type { Change, TableName } from '../core/mutations';
import { prisma } from './db';
import { toDbRow, MODEL_OF } from './mapping';

/** lib/core/mutations.ts가 만든 변경 목록을 한 트랜잭션으로 DB에 반영 */
export async function persistChanges(changes: Change[]): Promise<void> {
  if (!changes.length) return;
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const ch of changes) {
    const delegate = (prisma as unknown as Record<string, { upsert: (a: unknown) => Prisma.PrismaPromise<unknown>; deleteMany: (a: unknown) => Prisma.PrismaPromise<unknown> }>)[MODEL_OF[ch.table as TableName]];
    if (ch.op === 'delete') {
      ops.push(delegate.deleteMany({ where: ch.match }));
      continue;
    }
    const data = toDbRow(ch.table, ch.row);
    const where = ch.table === 'empathies'
      ? { userId_proposalId: { userId: data.userId, proposalId: data.proposalId } }
      : { id: data.id };
    ops.push(delegate.upsert({ where, create: data, update: data }));
  }
  await prisma.$transaction(ops);
}
