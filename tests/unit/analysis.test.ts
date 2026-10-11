import { describe, expect, it } from 'vitest';
import { findSimilar, similarity, SIMILARITY_THRESHOLD } from '@/lib/analysis/similarity';
import { explainPriority, priorityScore } from '@/lib/analysis/priority';
import { detectSpike, DAY } from '@/lib/analysis/stats';

describe('similarity', () => {
  it('유사 문장은 0.3 이상', () => {
    expect(similarity('점심 배식 줄이 너무 길어요', '점심 배식 줄이 너무 길어서 힘들어요')).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    expect(similarity('셔틀버스가 부족해요', '셔틀버스 부족 증차 부탁')).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  });
  it('무관 문장은 0.3 미만', () => {
    expect(similarity('점심 배식 줄이 너무 길어요', '화장실 휴지가 없어요')).toBeLessThan(SIMILARITY_THRESHOLD);
    expect(similarity('훈련비 입금이 늦어요', '주차 공간이 부족해요')).toBeLessThan(SIMILARITY_THRESHOLD);
  });
  it('마스킹 토큰은 유사도에 쓰지 않음', () => {
    expect(similarity('[부대] [장비]', '[부대] [장비]')).toBe(0);
  });
  it('같은 훈련장·카테고리 안에서 상위 3건, 제목(altTexts)도 비교', () => {
    const pool = [
      { id: '1', rangeId: 'a', category: 'MEAL', text: '점심 배식 줄이 너무 길어요 배식구가 하나뿐이라 30분 넘게 기다렸습니다 오후 교육 전 쉴 시간이 없어요', altTexts: ['점심 배식 줄이 너무 길어요'] },
      { id: '2', rangeId: 'b', category: 'MEAL', text: '점심 배식 줄이 너무 길어요' },
      { id: '3', rangeId: 'a', category: 'FACILITY', text: '점심 배식 줄이 너무 길어요' },
      { id: '4', rangeId: 'a', category: 'MEAL', text: '메뉴가 매번 같아요' },
    ];
    expect(findSimilar(pool, { rangeId: 'a', category: 'MEAL', text: '배식 줄이 너무 길어요' }).map((x) => x.id)).toEqual(['1']);
  });
});

describe('priority', () => {
  it('공식대로 계산', () => {
    const b = priorityScore({ proposalCount: 7, empathyCount: 8, avgSentiment: 2, isSafety: false, recentRatio: 0.2 });
    expect(b.score).toBe(8);   // log2(16)=4 × 2 × 1 × 1
    expect(explainPriority(b)).toContain('= 8');
  });
  it('안전 1.5배, 최근성 1.2배 (50% 경계 포함)', () => {
    const base = { proposalCount: 7, empathyCount: 8, avgSentiment: 2 };
    expect(priorityScore({ ...base, isSafety: true, recentRatio: 0 }).score).toBe(12);
    expect(priorityScore({ ...base, isSafety: false, recentRatio: 0.5 }).score).toBe(9.6);
    expect(priorityScore({ ...base, isSafety: false, recentRatio: 0.49 }).score).toBe(8);
  });
});

describe('급증 감지', () => {
  const now = new Date('2026-11-20T00:00:00Z');
  const ago = (d: number) => new Date(now.getTime() - d * DAY).toISOString();
  it('최근 4주 10건, 이전 12주 주평균 대비 1.8배 이상이면 급증', () => {
    const dates = [...Array(10)].map((_, i) => ago(i + 1)).concat([...Array(12)].map((_, i) => ago(30 + i * 7)));
    const r = detectSpike('MEAL', dates, now);
    expect(r.recentCount).toBe(10);
    expect(r.ratio).toBe(2.5);   // 2.5 / 1.0
    expect(r.isSpike).toBe(true);
  });
  it('최근 4주 9건이면 비율이 높아도 급증 아님 (경계값)', () => {
    const r = detectSpike('MEAL', [...Array(9)].map((_, i) => ago(i + 1)), now);
    expect(r.isSpike).toBe(false);
  });
  it('비율 1.8 미만이면 급증 아님', () => {
    const dates = [...Array(10)].map((_, i) => ago(i + 1)).concat([...Array(24)].map((_, i) => ago(29 + i * 3.4)));
    expect(detectSpike('MEAL', dates, now).isSpike).toBe(false);
  });
});
