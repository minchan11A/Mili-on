/**
 * 시드 데이터셋 공통 처리.
 * 시드는 기준일(SEED_BASE_DATE) 기준으로 만들어집니다. 시연 당일에도 "최근 4주 급증", "7일 전 이수"가
 * 그대로 보이도록, 불러올 때 모든 날짜를 (오늘 - 기준일)만큼 평행 이동합니다.
 */
import type { Dataset } from '../types';

export const SEED_BASE_DATE = '2026-11-20T00:00:00.000Z';

const DATE_FIELDS: Record<keyof Dataset, string[]> = {
  ranges: ['createdAt'], users: ['createdAt'], records: ['completedAt'], reviews: ['createdAt'],
  issues: ['updatedAt'], proposals: ['createdAt', 'updatedAt'], empathies: ['createdAt'], history: ['createdAt'],
  replies: ['createdAt'], solutions: ['createdAt', 'decidedAt', 'generatedAt'], bestPractices: ['completedAt'],
  guides: ['createdAt'], questions: ['createdAt'], answers: ['createdAt'], reports: ['createdAt'], audits: ['createdAt'],
};

export function startOfTodayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** 시드 날짜를 오늘 기준으로 옮긴 복사본 */
export function shiftDataset(ds: Dataset, now = new Date()): Dataset {
  const delta = startOfTodayUtc(now).getTime() - new Date(SEED_BASE_DATE).getTime();
  if (delta === 0) return structuredClone(ds);
  const out = {} as Dataset;
  (Object.keys(DATE_FIELDS) as Array<keyof Dataset>).forEach((k) => {
    const fields = DATE_FIELDS[k];
    (out as unknown as Record<string, unknown[]>)[k] = (ds[k] as unknown as Array<Record<string, unknown>>).map((row) => {
      const copy: Record<string, unknown> = { ...row };
      for (const f of fields) {
        const v = copy[f];
        if (typeof v === 'string' && v) copy[f] = new Date(new Date(v).getTime() + delta).toISOString();
      }
      return copy;
    });
  });
  return out;
}

export function emptyDataset(): Dataset {
  return {
    ranges: [], users: [], records: [], reviews: [], issues: [], proposals: [], empathies: [], history: [],
    replies: [], solutions: [], bestPractices: [], guides: [], questions: [], answers: [], reports: [], audits: [],
  };
}

export const DATASET_KEYS = Object.keys(DATE_FIELDS) as Array<keyof Dataset>;
