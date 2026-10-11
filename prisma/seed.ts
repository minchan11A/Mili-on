/**
 * data/demo/*.json (seed/ 파이프라인 산출물)을 DB에 넣습니다. 이미 데이터가 있으면 건너뜁니다. (명세 §8.1, §11)
 * 시연 모드와 똑같이: 원문은 보안 필터를 거쳐 저장하고, 날짜는 "오늘 기준"으로 평행 이동합니다.
 * 시드 계정 비밀번호: SEED_PASSWORD 환경변수 (기본 demo1234). Supabase로 가입한 사용자는 비밀번호를 저장하지 않습니다.
 * 이미 데이터가 있어도 SEED_PASSWORD가 있으면 시드 계정 비밀번호를 그 값으로 다시 맞춥니다(변수를 바꾸고 재배포하면 반영).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { datasetFromSeed, shiftDataset, type SeedFiles } from '../lib/core/dataset';
import { hashPassword } from '../lib/server/password';
import { toDbRow } from '../lib/server/mapping';
import type { Dataset } from '../lib/types';

const prisma = new PrismaClient();
const dir = join(process.cwd(), 'data', 'demo');
const read = (f: string) => JSON.parse(readFileSync(join(dir, `${f}.json`), 'utf8')) as unknown[];

async function main() {
  const seedPassword = process.env.SEED_PASSWORD?.trim();
  if ((await prisma.trainingRange.count()) > 0) {
    console.log('이미 데이터가 있어 시드를 건너뜁니다.');
    if (seedPassword) {
      const { count } = await prisma.user.updateMany({ where: { authId: null, passwordHash: { not: null } }, data: { passwordHash: hashPassword(seedPassword) } });
      console.log(`시드 계정 ${count}명의 비밀번호를 SEED_PASSWORD로 맞췄습니다.`);
    }
    return;
  }
  const names: Array<keyof SeedFiles> = ['ranges', 'users', 'training-records', 'reviews', 'proposals', 'proposal-empathies', 'status-history', 'official-replies', 'issues', 'best-practices', 'guides', 'questions', 'answers'];
  const files = Object.fromEntries(names.map((n) => [n, read(n)])) as unknown as SeedFiles;
  const ds = shiftDataset(datasetFromSeed(files));
  const pw = hashPassword(seedPassword || 'demo1234');
  const rows = <T extends object>(t: keyof Dataset, xs: T[]) => xs.map((x) => toDbRow(t, x as Record<string, unknown>));

  // 외래키 순서대로
  await prisma.trainingRange.createMany({ data: rows('ranges', ds.ranges) as never });
  await prisma.user.createMany({ data: rows('users', ds.users.map((u) => ({ ...u, passwordHash: pw }))) as never });
  await prisma.trainingRecord.createMany({ data: rows('records', ds.records) as never });
  await prisma.review.createMany({ data: rows('reviews', ds.reviews.map((r) => ({ ...r, answers: r.answers ?? undefined }))) as never });
  await prisma.issue.createMany({ data: rows('issues', ds.issues) as never });
  await prisma.proposal.createMany({ data: rows('proposals', ds.proposals) as never });
  await prisma.proposalEmpathy.createMany({ data: rows('empathies', ds.empathies) as never });
  await prisma.statusHistory.createMany({ data: rows('history', ds.history) as never });
  await prisma.officialReply.createMany({ data: rows('replies', ds.replies) as never });
  await prisma.bestPractice.createMany({ data: rows('bestPractices', ds.bestPractices) as never });
  await prisma.guideEntry.createMany({ data: rows('guides', ds.guides) as never });
  await prisma.question.createMany({ data: rows('questions', ds.questions) as never });
  await prisma.answer.createMany({ data: rows('answers', ds.answers) as never });
  console.log(`시드 완료: 훈련장 ${ds.ranges.length}, 사용자 ${ds.users.length}, 제안 ${ds.proposals.length}, 평가 ${ds.reviews.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
