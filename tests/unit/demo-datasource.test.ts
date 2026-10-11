import { beforeEach, describe, expect, it } from 'vitest';
import { demoDataSource, __resetDemoStoreForTest } from '@/lib/data/demo';
import { seedDataset } from '@/lib/data/seed';
import { shiftDataset } from '@/lib/core/dataset';

describe('시연 DataSource: 평가 자격', () => {
  beforeEach(() => __resetDemoStoreForTest(shiftDataset(seedDataset()), 'RESERVIST'));

  it('A훈련장 7일 전 이수 → 평가 가능', async () => {
    const r = await demoDataSource.getReviewEligibility('range-a');
    expect(r.eligible).toBe(true);
  });
  it('이수 기록 없음', async () => {
    expect((await demoDataSource.getReviewEligibility('range-b')).reason).toBe('이 훈련장 이수 기록이 없습니다');
  });
  it('30일 초과', async () => {
    expect((await demoDataSource.getReviewEligibility('range-x')).reason).toBe('평가 기간(30일)이 지났습니다');
  });
  it('이미 평가함 (중복)', async () => {
    expect((await demoDataSource.getReviewEligibility('range-d')).reason).toBe('이미 평가했습니다');
    const el = await demoDataSource.getReviewEligibility('range-a');
    await demoDataSource.createReview({ rangeId: 'range-a', recordId: el.recordId!, scoreTransport: 4, scoreMeal: 2, scoreFacility: 3, scoreOperation: 4, scoreComm: 4 });
    expect((await demoDataSource.getReviewEligibility('range-a')).reason).toBe('이미 평가했습니다');
  });
});

describe('시연 DataSource: 제안·권한', () => {
  beforeEach(() => __resetDemoStoreForTest(shiftDataset(seedDataset()), 'RESERVIST'));

  it('제안은 마스킹된 본문으로 저장되고 이슈에 묶임', async () => {
    const p = await demoDataSource.createProposal({ rangeId: 'range-a', category: 'MEAL', subtopic: '배식 대기시간', title: '배식 줄', body: '○사단 식당 배식 줄이 너무 길어요' });
    expect(p.body).toBe('[부대] 식당 배식 줄이 너무 길어요');
    expect(p.issueId).toBe('ISS-MEAL-01');
    expect(p.status).toBe('RECEIVED');
  });
  it('좌표가 있으면 422 BLOCKED', async () => {
    await expect(demoDataSource.createProposal({ rangeId: 'range-a', category: 'MEAL', title: '위치', body: '37.5123, 127.0456 식당' })).rejects.toMatchObject({ status: 422, code: 'BLOCKED' });
  });
  it('예비군은 상태 변경 불가, A 담당자는 다른 훈련장 상태 변경 불가', async () => {
    const page = await demoDataSource.listProposals({ rangeId: 'range-b', pageSize: 1 });
    await expect(demoDataSource.updateProposalStatus(page.items[0].id, 'PLANNED', '메모')).rejects.toMatchObject({ status: 403 });
    await demoDataSource.switchRole!('RANGE_MANAGER');
    await expect(demoDataSource.updateProposalStatus(page.items[0].id, 'PLANNED', '메모')).rejects.toMatchObject({ status: 403 });
  });
  it('담당자 상태 변경은 메모 필수', async () => {
    await demoDataSource.switchRole!('RANGE_MANAGER');
    const page = await demoDataSource.listProposals({ rangeId: 'range-a', status: 'RECEIVED', pageSize: 1 });
    await expect(demoDataSource.updateProposalStatus(page.items[0].id, 'REVIEWING', '')).rejects.toMatchObject({ status: 400 });
    const d = await demoDataSource.updateProposalStatus(page.items[0].id, 'REVIEWING', '현장 확인');
    expect(d.status).toBe('REVIEWING');
    expect(d.history.at(-1)?.note).toBe('현장 확인');
  });
  it('담당자 화면에는 작성자 별명 대신 통계 속성', async () => {
    await demoDataSource.switchRole!('RANGE_MANAGER');
    const page = await demoDataSource.listProposals({ rangeId: 'range-a', pageSize: 3 });
    for (const p of page.items) expect(p.authorLabel).toMatch(/^예비군\(/);
  });
  it('신고 3회 누적 시 자동 숨김', async () => {
    const page = await demoDataSource.listProposals({ rangeId: 'range-c', pageSize: 1 });
    const id = page.items[0].id;
    for (const role of ['RESERVIST', 'RANGE_MANAGER', 'POLICY_ADMIN'] as const) {
      await demoDataSource.switchRole!(role);
      await demoDataSource.report('PROPOSAL', id, '테스트');
    }
    await demoDataSource.switchRole!('RESERVIST');
    await expect(demoDataSource.getProposal(id)).rejects.toMatchObject({ status: 404 });
  });
});
