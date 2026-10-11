/**
 * 시드 데이터셋 공통 처리.
 * 시드(seed/)는 기준일(meta.json의 dataAsOf, KST) 기준으로 만들어집니다. 시연 당일에도 "최근 4주 급증", "7일 전 이수"가
 * 그대로 보이도록, 불러올 때 모든 날짜를 (오늘 - 기준일)만큼 날짜 단위로 평행 이동합니다.
 * 시드 원문(제안 본문 등)에는 마스킹 시연용 가상 단대호·인물·전화번호가 들어 있으므로,
 * 앱에 올릴 때 작성 시점과 같은 보안 필터(toStorableText)를 거칩니다.
 */
import { toStorableText } from '../masking';
import type { Dataset } from '../types';

/** 시드 기준일 00:00 KST */
export const SEED_BASE_DATE = '2026-10-11T00:00:00+09:00';
const KST = 9 * 3_600_000;

const DATE_FIELDS: Record<keyof Dataset, string[]> = {
  ranges: ['createdAt'], users: ['createdAt'], records: ['completedAt'], reviews: ['createdAt'],
  issues: ['updatedAt'], proposals: ['createdAt', 'updatedAt'], empathies: ['createdAt'], history: ['createdAt'],
  replies: ['createdAt'], solutions: ['createdAt', 'decidedAt', 'generatedAt'], bestPractices: ['completedAt'],
  guides: ['createdAt'], questions: ['createdAt'], answers: ['createdAt'], reports: ['createdAt'], audits: ['createdAt'],
};

/** 오늘 00:00 (KST) */
export function startOfTodayKst(now = new Date()): Date {
  const k = new Date(now.getTime() + KST);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST);
}

/** 시드 날짜를 오늘 기준으로 옮긴 복사본 */
export function shiftDataset(ds: Dataset, now = new Date()): Dataset {
  const delta = startOfTodayKst(now).getTime() - new Date(SEED_BASE_DATE).getTime();
  if (delta === 0) return structuredClone(ds);
  const out = {} as Dataset;
  (Object.keys(DATE_FIELDS) as Array<keyof Dataset>).forEach((k) => {
    const fields = DATE_FIELDS[k];
    (out as unknown as Record<string, unknown[]>)[k] = (ds[k] as unknown as Array<Record<string, unknown>>).map((row) => {
      const copy: Record<string, unknown> = { ...row };
      for (const f of fields) {
        const v = copy[f];
        if (typeof v === 'string' && v) copy[f] = new Date(new Date(v).getTime() + delta).toISOString();
        // 권익위 권고 날짜(recommendedAt)는 실제 날짜이므로 옮기지 않음
        if (k === 'bestPractices' && f === 'recommendedAt') copy[f] = v;
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

/** 시드 원문을 저장 시점과 같은 보안 필터로 가림. 차단 대상이 섞여 있으면 숨김 처리 */
export function sanitizeDataset(ds: Dataset): Dataset {
  const clean = (t: string | null | undefined): { text: string | null; blocked: boolean } => {
    if (!t) return { text: t ?? null, blocked: false };
    const r = toStorableText(t);
    return r.ok ? { text: r.text, blocked: false } : { text: '(보안 검사로 가려진 내용)', blocked: true };
  };
  return {
    ...ds,
    proposals: ds.proposals.map((p) => {
      const t = clean(p.title), b = clean(p.body);
      return { ...p, title: t.text ?? '', body: b.text ?? '', state: t.blocked || b.blocked ? 'HIDDEN_BY_ADMIN' : p.state };
    }),
    reviews: ds.reviews.map((r) => ({ ...r, comment: clean(r.comment).text })),
    guides: ds.guides.map((g) => ({ ...g, body: clean(g.body).text ?? '' })),
    questions: ds.questions.map((q) => ({ ...q, body: clean(q.body).text ?? '' })),
    answers: ds.answers.map((a) => ({ ...a, body: clean(a.body).text ?? '' })),
    replies: ds.replies.map((r) => ({ ...r, body: clean(r.body).text ?? '' })),
  };
}

/** 시드 파일 묶음 → Dataset (시연 모드 import, prisma/seed.ts 공용) */
export interface SeedFiles {
  ranges: unknown[]; users: unknown[]; 'training-records': unknown[]; reviews: unknown[]; proposals: unknown[];
  'proposal-empathies': unknown[]; 'status-history': unknown[]; 'official-replies': unknown[]; issues: unknown[];
  'best-practices': unknown[]; guides: unknown[]; questions: unknown[]; answers: unknown[];
}

export function datasetFromSeed(f: SeedFiles): Dataset {
  const ds = {
    // 시드의 description은 시나리오 메모("주인공: …")라 화면에 내보내지 않음
    ranges: (f.ranges as Array<Record<string, unknown>>).map((r) => ({ ...r, description: null })), users: f.users, records: f['training-records'], reviews: f.reviews, proposals: f.proposals,
    empathies: f['proposal-empathies'], history: f['status-history'], replies: f['official-replies'],
    // 시드 이슈의 표시용 캐시 값(proposalCount 등)은 쓰지 않고 앱이 계산
    issues: (f.issues as Array<Record<string, unknown>>).map(({ proposalCount: _a, empathyCount: _b, rangeCount: _c, ...rest }) => rest),
    bestPractices: f['best-practices'], guides: f.guides, questions: f.questions, answers: f.answers,
    solutions: [], reports: [], audits: [],
  } as unknown as Dataset;
  return sanitizeDataset(ds);
}
