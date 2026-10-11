/**
 * data/demo/*.json 을 DB에 넣습니다. 이미 데이터가 있으면 건너뜁니다. (명세 §8.1, §11)
 * 날짜는 시연 모드와 똑같이 "오늘 기준"으로 평행 이동해 넣습니다.
 * 모든 시드 계정 비밀번호: SEED_PASSWORD 환경변수 (기본 demo1234)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { shiftDataset } from '../lib/core/dataset';
import { hashPassword } from '../lib/server/password';
import { toDbRow } from '../lib/server/mapping';
import type { Dataset } from '../lib/types';

const prisma = new PrismaClient();
const dir = join(process.cwd(), 'data', 'demo');
const read = <T,>(f: string): T => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T;

async function main() {
  if ((await prisma.trainingRange.count()) > 0) {
    console.log('이미 데이터가 있어 시드를 건너뜁니다.');
    return;
  }
  const qna = read<{ questions: Dataset['questions']; answers: Dataset['answers'] }>('qna.json');
  const ds = shiftDataset({
    ranges: read('ranges.json'), users: read('users.json'), records: read('records.json'), reviews: read('reviews.json'),
    issues: read('issues.json'), proposals: read('proposals.json'), empathies: read('empathies.json'), history: read('history.json'),
    replies: read('replies.json'), bestPractices: read('best-practices.json'), guides: read('guides.json'),
    questions: qna.questions, answers: qna.answers, audits: read('audits.json'), solutions: [], reports: [],
  });
  const pw = hashPassword(process.env.SEED_PASSWORD || 'demo1234');
  const rows = <T extends object>(t: keyof Dataset, xs: T[]) => xs.map((x) => toDbRow(t, x as Record<string, unknown>));

  // 외래키 순서대로
  await prisma.trainingRange.createMany({ data: rows('ranges', ds.ranges) as never });
  await prisma.user.createMany({ data: rows('users', ds.users.map((u) => ({ ...u, passwordHash: pw }))) as never });
  await prisma.trainingRecord.createMany({ data: rows('records', ds.records) as never });
  await prisma.review.createMany({ data: rows('reviews', ds.reviews) as never });
  await prisma.issue.createMany({ data: rows('issues', ds.issues) as never });
  await prisma.proposal.createMany({ data: rows('proposals', ds.proposals) as never });
  await prisma.proposalEmpathy.createMany({ data: rows('empathies', ds.empathies) as never });
  await prisma.statusHistory.createMany({ data: rows('history', ds.history) as never });
  await prisma.officialReply.createMany({ data: rows('replies', ds.replies) as never });
  await prisma.bestPractice.createMany({ data: rows('bestPractices', ds.bestPractices) as never });
  await prisma.guideEntry.createMany({ data: rows('guides', ds.guides) as never });
  await prisma.question.createMany({ data: rows('questions', ds.questions) as never });
  await prisma.answer.createMany({ data: rows('answers', ds.answers) as never });
  await prisma.maskingAudit.createMany({ data: rows('audits', ds.audits) as never });
  console.log(`시드 완료: 훈련장 ${ds.ranges.length}, 사용자 ${ds.users.length}, 제안 ${ds.proposals.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
