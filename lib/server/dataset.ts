import 'server-only';
import type { Dataset } from '../types';
import { prisma } from './db';

/**
 * DB 전체를 도메인 Dataset으로 읽기 (공모전 규모: 수천 행).
 * 읽기 집계를 시연 모드와 같은 코드(lib/core/queries.ts)로 하기 위함입니다.
 * 운영 규모가 커지면 쿼리별 SQL 집계로 바꿉니다.
 */
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

function datesToIso<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? iso(v) : v;
  return out as T;
}

export async function loadDataset(): Promise<Dataset> {
  const [
    ranges, users, records, reviews, issues, proposals, empathies, history, replies, solutions,
    bestPractices, guides, questions, answers, reports, audits,
  ] = await prisma.$transaction([
    prisma.trainingRange.findMany(),
    prisma.user.findMany({ omit: { passwordHash: true } }),
    prisma.trainingRecord.findMany(),
    prisma.review.findMany(),
    prisma.issue.findMany(),
    prisma.proposal.findMany(),
    prisma.proposalEmpathy.findMany(),
    prisma.statusHistory.findMany(),
    prisma.officialReply.findMany(),
    prisma.aiSolution.findMany(),
    prisma.bestPractice.findMany(),
    prisma.guideEntry.findMany(),
    prisma.question.findMany(),
    prisma.answer.findMany(),
    prisma.report.findMany(),
    prisma.maskingAudit.findMany(),
  ]);
  const m = <T extends Record<string, unknown>>(xs: T[]) => xs.map(datesToIso);
  return {
    ranges: m(ranges), users: m(users), records: m(records), reviews: m(reviews), issues: m(issues),
    proposals: m(proposals), empathies: m(empathies), history: m(history), replies: m(replies),
    solutions: m(solutions), bestPractices: m(bestPractices), guides: m(guides), questions: m(questions),
    answers: m(answers), reports: m(reports), audits: m(audits),
  } as unknown as Dataset;
}
