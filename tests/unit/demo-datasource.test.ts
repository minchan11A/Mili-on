import { beforeEach, describe, expect, it } from 'vitest';
import { demoDataSource, __resetDemoStoreForTest } from '@/lib/data/demo';
import { seedDataset } from '@/lib/data/seed';
import { shiftDataset } from '@/lib/core/dataset';
import { SURVEY_QUESTIONS } from '@/lib/survey';

const A = 'rng_R_A01';
const allAnswers = (v: (id: string) => number) => Object.fromEntries(SURVEY_QUESTIONS.map((q) => [q.id, v(q.id)]));

describe('시드 적재', () => {
  it('원문 속 가상 단대호·인물·전화번호는 저장 형식([부대] 등)으로 가려짐', () => {
    const ds = seedDataset();
    const p = ds.proposals.find((x) => x.id === 'prp_00012')!;
    expect(p.body).toContain('[부대]');
    expect(p.body).not.toMatch(/제\d+대대/);
    expect(ds.proposals.every((x) => !/010-\d{4}-\d{4}/.test(x.body))).toBe(true);
  });
  it('날짜는 오늘 기준으로 이동 (시연 사용자 이수 7일 전 유지)', () => {
    const ds = shiftDataset(seedDataset());
    const rec = ds.records.find((r) => r.id === 'rec_demo')!;
    const days = (Date.now() - new Date(rec.completedAt).getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(5.5);
    expect(days).toBeLessThan(8);
  });
});

describe('시연 DataSource: 설문(평가) 자격', () => {
  beforeEach(() => __resetDemoStoreForTest(shiftDataset(seedDataset()), 'RESERVIST'));

  it('A훈련장 7일 전 이수 → 평가 가능', async () => {
    expect((await demoDataSource.getReviewEligibility(A)).eligible).toBe(true);
  });
  it('이수 기록 없으면 본인 입력으로 참여 가능', async () => {
    const r = await demoDataSource.getReviewEligibility('rng_R_B02');
    expect(r).toMatchObject({ eligible: false, reason: '이 훈련장 이수 기록이 없습니다', canSelfReport: true });
  });
  it('설문 응답 → 지표 점수, 중복 평가 차단', async () => {
    const el = await demoDataSource.getReviewEligibility(A);
    const rv = await demoDataSource.createReview({
      rangeId: A, recordId: el.recordId, comment: '점심 줄이 길어요, 일찍 가세요',
      answers: allAnswers((id) => (id.startsWith('meal') ? 1 : 5)),
    });
    expect(rv.scores.scoreMeal).toBe(1);
    expect(rv.scores.scoreTransport).toBe(5);
    expect((await demoDataSource.getReviewEligibility(A)).reason).toBe('이미 평가했습니다');
  });
  it('문항을 빠뜨리면 거부', async () => {
    const el = await demoDataSource.getReviewEligibility(A);
    const answers = allAnswers(() => 3);
    delete answers[SURVEY_QUESTIONS[0].id];
    await expect(demoDataSource.createReview({ rangeId: A, recordId: el.recordId, answers })).rejects.toMatchObject({ status: 400 });
  });
  it('본인 입력: 30일 이내만, 같은 날 같은 훈련장은 한 번만', async () => {
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
    await expect(demoDataSource.createReview({ rangeId: 'rng_R_B02', selfReport: { trainingType: 'MOBILIZATION', completedAt: old }, answers: allAnswers(() => 4) }))
      .rejects.toMatchObject({ status: 400 });
    const recent = new Date(Date.now() - 3 * 86_400_000).toISOString();
    await demoDataSource.createReview({ rangeId: 'rng_R_B02', selfReport: { trainingType: 'MOBILIZATION', completedAt: recent }, answers: allAnswers(() => 4) });
    await expect(demoDataSource.createReview({ rangeId: 'rng_R_B02', selfReport: { trainingType: 'MOBILIZATION', completedAt: recent }, answers: allAnswers(() => 4) }))
      .rejects.toMatchObject({ status: 400 });
  });
  it('전하고 싶은 말도 보안 필터 (좌표면 차단)', async () => {
    const el = await demoDataSource.getReviewEligibility(A);
    await expect(demoDataSource.createReview({ rangeId: A, recordId: el.recordId, answers: allAnswers(() => 3), comment: '37.5123, 127.0456 여기' }))
      .rejects.toMatchObject({ status: 422, code: 'BLOCKED' });
  });
});

describe('시연 DataSource: 제안·권한', () => {
  beforeEach(() => __resetDemoStoreForTest(shiftDataset(seedDataset()), 'RESERVIST'));

  it('제안은 마스킹된 본문으로 저장되고 이슈에 묶임', async () => {
    const p = await demoDataSource.createProposal({ rangeId: A, category: 'MEAL', subtopic: '배식 대기시간', title: '배식 줄', body: '○사단 식당 배식 줄이 너무 길어요' });
    expect(p.body).toBe('[부대] 식당 배식 줄이 너무 길어요');
    expect(p.issueId).toBe('iss_001');
    expect(p.status).toBe('RECEIVED');
  });
  it('좌표가 있으면 422 BLOCKED', async () => {
    await expect(demoDataSource.createProposal({ rangeId: A, category: 'MEAL', title: '위치', body: '37.5123, 127.0456 식당' })).rejects.toMatchObject({ status: 422, code: 'BLOCKED' });
  });
  it('예비군은 상태 변경 불가, A 담당자는 다른 훈련장 상태 변경 불가', async () => {
    const page = await demoDataSource.listProposals({ rangeId: 'rng_R_B02', pageSize: 1 });
    await expect(demoDataSource.updateProposalStatus(page.items[0].id, 'PLANNED', '메모')).rejects.toMatchObject({ status: 403 });
    await demoDataSource.switchRole!('RANGE_MANAGER');
    await expect(demoDataSource.updateProposalStatus(page.items[0].id, 'PLANNED', '메모')).rejects.toMatchObject({ status: 403 });
  });
  it('담당자 상태 변경은 메모 필수', async () => {
    await demoDataSource.switchRole!('RANGE_MANAGER');
    const page = await demoDataSource.listProposals({ rangeId: A, status: 'RECEIVED', pageSize: 1 });
    await expect(demoDataSource.updateProposalStatus(page.items[0].id, 'REVIEWING', '')).rejects.toMatchObject({ status: 400 });
    const d = await demoDataSource.updateProposalStatus(page.items[0].id, 'REVIEWING', '현장 확인');
    expect(d.status).toBe('REVIEWING');
    expect(d.history.at(-1)?.note).toBe('현장 확인');
  });
  it('담당자 화면에는 작성자 별명 대신 통계 속성', async () => {
    await demoDataSource.switchRole!('RANGE_MANAGER');
    const page = await demoDataSource.listProposals({ rangeId: A, pageSize: 3 });
    for (const p of page.items) expect(p.authorLabel).toMatch(/^예비군\(/);
  });
  it('신고 3회 누적 시 자동 숨김', async () => {
    const page = await demoDataSource.listProposals({ rangeId: 'rng_R_C03', pageSize: 1 });
    const id = page.items[0].id;
    for (const role of ['RESERVIST', 'RANGE_MANAGER', 'POLICY_ADMIN'] as const) {
      await demoDataSource.switchRole!(role);
      await demoDataSource.report('PROPOSAL', id, '테스트');
    }
    await demoDataSource.switchRole!('RESERVIST');
    await expect(demoDataSource.getProposal(id)).rejects.toMatchObject({ status: 404 });
  });
  it('대시보드 1위 이슈는 배식 대기시간, 급증 알림에 식사·급식', async () => {
    await demoDataSource.switchRole!('POLICY_ADMIN');
    const d = await demoDataSource.getDashboard();
    expect(d.topIssues[0].subtopic).toBe('배식 대기시간');
    expect(d.spikes.map((s) => s.category)).toContain('MEAL');
  });
});
