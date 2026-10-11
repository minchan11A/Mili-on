/**
 * 가상 시드 데이터 생성 (명세 §8.1).
 * 고정 난수 시드('milaind-2026')로 매번 같은 결과가 나옵니다.
 * 출력: data/demo/*.json  (시연 모드는 직접 사용, 서버 모드는 prisma/seed.ts가 DB에 넣음)
 * 날짜는 SEED_BASE_DATE 기준이며, 불러올 때 오늘 기준으로 평행 이동됩니다.
 *
 * 실행: npx tsx scripts/generate-seed.ts
 */
import { mkdirSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import seedrandom from 'seedrandom';
import { SEED_BASE_DATE } from '../lib/core/dataset';
import { toStorableText } from '../lib/masking';
import { RANGE_TRAINING_TYPES, SUBTOPICS } from '../lib/constants';
import { isSafetyText, priorityScore } from '../lib/analysis/priority';
import type {
  AnswerRec, BestPracticeRec, Category, Dataset, EmpathyRec, GuideRec, IssueRec, MaskingAuditRec, OfficialReplyRec,
  ProposalRec, ProposalStatus, QuestionRec, RangeRec, RangeType, ReviewRec, StatusHistoryRec, TrainingRecordRec, UserRec,
} from '../lib/types';
import {
  BEST_PRACTICES, CLOSERS, GUIDE_TEMPLATES, ISSUE_TITLE, OPENERS, PROPOSAL_TEXT, QUESTIONS, REPLY_TEXT,
  REVIEW_COMMENTS, SENSITIVE_PREFIXES, STATUS_NOTES,
} from './seed-texts';
import { AI_DRAFTS } from './seed-ai-drafts';
import { prepareSolutionRequest } from '../lib/llm/flow';
import { answerFromGuides } from '../lib/llm/qna';

const rng = seedrandom('milaind-2026');
const rand = () => rng();
const randInt = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const chance = (p: number) => rand() < p;
function weighted<T>(items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) { if ((r -= w) <= 0) return v; }
  return items[items.length - 1][0];
}
function normal(mean: number, sd: number) {
  const u = 1 - rand(), v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clampScore = (x: number) => Math.max(1, Math.min(5, Math.round(x)));

const BASE = new Date(SEED_BASE_DATE).getTime();
const DAY = 86_400_000;
const daysAgo = (d: number, hour = 9) => new Date(BASE - d * DAY + hour * 3_600_000 + randInt(0, 59) * 60_000).toISOString();
const ageOf = (iso: string) => (BASE - new Date(iso).getTime()) / DAY;

/* ───────────────────────── 훈련장 24곳 ───────────────────────── */

type Axis = 'scoreTransport' | 'scoreMeal' | 'scoreFacility' | 'scoreOperation' | 'scoreComm';
interface RangeSpec {
  letter: string; type: RangeType; sido: string; sigungu: string; lat: number; lng: number;
  mountain?: boolean; weight: number; profile: Partial<Record<Axis, number>>;
  /** 개선 완료 후 지표가 오른 훈련장: [지표, 이전 평균, 이후 평균, 개선 시점(일 전)] */
  improved?: [Axis, number, number, number];
}

const RANGE_SPECS: RangeSpec[] = [
  { letter: 'A', type: 'MOBILIZATION', sido: '경기도', sigungu: '가평군', lat: 37.831, lng: 127.510, weight: 3, profile: { scoreMeal: 2.2 } },
  { letter: 'B', type: 'REGIONAL', sido: '서울특별시', sigungu: '노원구', lat: 37.654, lng: 127.056, weight: 2, profile: { scoreFacility: 3.3 } },
  { letter: 'C', type: 'REGIONAL', sido: '부산광역시', sigungu: '해운대구', lat: 35.163, lng: 129.163, weight: 1.5, profile: {} },
  { letter: 'D', type: 'MOBILIZATION', sido: '대구광역시', sigungu: '수성구', lat: 35.858, lng: 128.630, weight: 2, profile: {}, improved: ['scoreMeal', 2.5, 4.3, 150] },
  { letter: 'E', type: 'REGIONAL', sido: '인천광역시', sigungu: '서구', lat: 37.545, lng: 126.676, weight: 1.5, profile: { scoreComm: 3.0 } },
  { letter: 'F', type: 'REGIONAL', sido: '광주광역시', sigungu: '북구', lat: 35.174, lng: 126.912, weight: 1.2, profile: {} },
  { letter: 'G', type: 'MOBILIZATION', sido: '대전광역시', sigungu: '유성구', lat: 36.362, lng: 127.356, weight: 1.8, profile: { scoreOperation: 3.1 } },
  { letter: 'H', type: 'REGIONAL', sido: '울산광역시', sigungu: '울주군', lat: 35.562, lng: 129.243, weight: 1, profile: { scoreTransport: 3.0 } },
  { letter: 'I', type: 'REGIONAL', sido: '세종특별자치시', sigungu: '세종시', lat: 36.480, lng: 127.289, weight: 0.12, profile: {} },
  { letter: 'J', type: 'MOBILIZATION', sido: '강원도', sigungu: '인제군', lat: 38.069, lng: 128.170, mountain: true, weight: 2, profile: { scoreTransport: 2.0, scoreFacility: 3.2 } },
  { letter: 'K', type: 'REGIONAL', sido: '강원도', sigungu: '화천군', lat: 38.106, lng: 127.708, mountain: true, weight: 1.2, profile: { scoreTransport: 2.1 } },
  { letter: 'L', type: 'REGIONAL', sido: '충청북도', sigungu: '단양군', lat: 36.984, lng: 128.366, mountain: true, weight: 1, profile: { scoreTransport: 2.3 } },
  { letter: 'M', type: 'MOBILIZATION', sido: '충청북도', sigungu: '청주시', lat: 36.642, lng: 127.489, weight: 2, profile: {}, improved: ['scoreFacility', 2.4, 4.1, 120] },
  { letter: 'N', type: 'REGIONAL', sido: '충청남도', sigungu: '천안시', lat: 36.815, lng: 127.114, weight: 1.4, profile: {} },
  { letter: 'O', type: 'REGIONAL', sido: '전라북도', sigungu: '전주시', lat: 35.824, lng: 127.148, weight: 1.2, profile: { scoreMeal: 4.4 } },
  { letter: 'P', type: 'REGIONAL', sido: '전라북도', sigungu: '무주군', lat: 36.007, lng: 127.661, mountain: true, weight: 0.9, profile: { scoreTransport: 2.2 } },
  { letter: 'Q', type: 'MOBILIZATION', sido: '전라남도', sigungu: '순천시', lat: 34.950, lng: 127.487, weight: 1.5, profile: { scoreComm: 4.2 } },
  { letter: 'R', type: 'REGIONAL', sido: '전라남도', sigungu: '목포시', lat: 34.811, lng: 126.392, weight: 1, profile: { scoreFacility: 3.0 } },
  { letter: 'S', type: 'REGIONAL', sido: '경상북도', sigungu: '봉화군', lat: 36.893, lng: 128.732, mountain: true, weight: 0.9, profile: { scoreTransport: 2.0 } },
  { letter: 'T', type: 'MOBILIZATION', sido: '경상북도', sigungu: '포항시', lat: 36.019, lng: 129.343, weight: 1.6, profile: {} },
  { letter: 'U', type: 'MOBILIZATION', sido: '경상남도', sigungu: '창원시', lat: 35.228, lng: 128.681, weight: 1.6, profile: { scoreOperation: 3.2 } },
  { letter: 'V', type: 'REGIONAL', sido: '경상남도', sigungu: '거창군', lat: 35.687, lng: 127.909, mountain: true, weight: 0.9, profile: { scoreTransport: 2.3 } },
  { letter: 'W', type: 'REGIONAL', sido: '제주특별자치도', sigungu: '제주시', lat: 33.500, lng: 126.531, weight: 0.12, profile: {} },
  { letter: 'X', type: 'REGIONAL', sido: '경기도', sigungu: '수원시', lat: 37.263, lng: 127.028, weight: 2.2, profile: {} },
];

const rangeId = (letter: string) => `range-${letter.toLowerCase()}`;
const DEFAULT_SCORE: Record<Axis, number> = { scoreTransport: 3.7, scoreMeal: 3.6, scoreFacility: 3.6, scoreOperation: 3.5, scoreComm: 3.7 };
const AXES = Object.keys(DEFAULT_SCORE) as Axis[];

const ranges: RangeRec[] = RANGE_SPECS.map((s, i) => ({
  id: rangeId(s.letter),
  code: `R-${s.letter}${String(i + 1).padStart(2, '0')}`,
  name: `${s.letter}훈련장`,
  type: s.type, sido: s.sido, sigungu: s.sigungu, lat: s.lat, lng: s.lng,
  description: `${s.sido} ${s.sigungu} 소재 ${s.type === 'MOBILIZATION' ? '동원훈련장' : '지역방위 훈련장'} (가명, 위치는 시군구 중심점)${s.mountain ? ' · 산간 지역' : ''}`,
  createdAt: daysAgo(800),
}));
const specByRange = new Map(RANGE_SPECS.map((s) => [rangeId(s.letter), s]));

/* ───────────────────────── 사용자 ───────────────────────── */

const AGE_BANDS = ['20대 초반', '20대 후반', '30대 초반', '30대 후반'];
const users: UserRec[] = [];
users.push({ id: 'u-demo', role: 'RESERVIST', nickname: '예비군_0417', ageBand: '20대 후반', loginId: 'reservist', createdAt: daysAgo(400) });
const nickSet = new Set(['0417']);
for (let i = 0; i < 199; i++) {
  let n: string;
  do { n = String(randInt(1000, 9999)); } while (nickSet.has(n));
  nickSet.add(n);
  users.push({ id: `u-${String(i + 1).padStart(4, '0')}`, role: 'RESERVIST', nickname: `예비군_${n}`, ageBand: pick(AGE_BANDS), loginId: `reservist${i + 1}`, createdAt: daysAgo(randInt(380, 700)) });
}
for (const r of ranges) {
  users.push({ id: `mgr-${r.id.slice(6)}`, role: 'RANGE_MANAGER', nickname: `${r.name} 담당자`, loginId: `manager-${r.id.slice(6)}`, managedRangeId: r.id, createdAt: daysAgo(600) });
}
users.push({ id: 'policy-1', role: 'POLICY_ADMIN', nickname: '정책 담당자', loginId: 'policy', createdAt: daysAgo(600) });
const reservists = users.filter((u) => u.role === 'RESERVIST');
const others = reservists.filter((u) => u.id !== 'u-demo');
const managerOf = (rid: string) => `mgr-${rid.slice(6)}`;

/* ───────────────────────── 이수 기록 ───────────────────────── */

const records: TrainingRecordRec[] = [];
let recSeq = 0;
const newRecordId = () => `rec-${String(++recSeq).padStart(4, '0')}`;
// 시연 예비군: A훈련장 7일 전 이수 (평가 가능), D훈련장 200일 전 (이미 평가), X훈련장 40일 전 (기간 만료)
records.push({ id: newRecordId(), userId: 'u-demo', rangeId: 'range-a', trainingType: 'MOBILIZATION', completedAt: daysAgo(7, 17) });
records.push({ id: newRecordId(), userId: 'u-demo', rangeId: 'range-d', trainingType: 'MOBILIZATION', completedAt: daysAgo(200, 17) });
records.push({ id: newRecordId(), userId: 'u-demo', rangeId: 'range-x', trainingType: 'BASIC', completedAt: daysAgo(40, 17) });
const rangeWeights: Array<[string, number]> = RANGE_SPECS.map((s) => [rangeId(s.letter), s.weight]);
for (const u of others) {
  const n = weighted([[3, 4], [2, 4], [4, 1]]);
  for (let k = 0; k < n; k++) {
    const rid = weighted(rangeWeights);
    const spec = specByRange.get(rid)!;
    records.push({ id: newRecordId(), userId: u.id, rangeId: rid, trainingType: pick(RANGE_TRAINING_TYPES[spec.type]), completedAt: daysAgo(randInt(3, 360), 17) });
  }
}

/* ───────────────────────── 만족도 평가 ───────────────────────── */

const reviews: ReviewRec[] = [];
let rvSeq = 0;
for (const rec of records) {
  if (rec.userId === 'u-demo' && rec.rangeId !== 'range-d') continue;   // 시연용: A는 아직 미평가
  if (!chance(rec.userId === 'u-demo' ? 1 : 0.8)) continue;
  const spec = specByRange.get(rec.rangeId)!;
  const createdAt = new Date(new Date(rec.completedAt).getTime() + randInt(0, 9) * DAY + randInt(1, 6) * 3_600_000).toISOString();
  if (new Date(createdAt).getTime() > BASE) continue;
  const scores = {} as Record<Axis, number>;
  for (const ax of AXES) {
    let mean = spec.profile[ax] ?? DEFAULT_SCORE[ax];
    if (spec.improved && spec.improved[0] === ax) mean = ageOf(createdAt) > spec.improved[3] ? spec.improved[1] : spec.improved[2];
    scores[ax] = clampScore(normal(mean, 0.75));
  }
  let comment: string | null = null;
  if (chance(0.45)) {
    const worst = AXES.reduce((a, b) => (scores[a] <= scores[b] ? a : b));
    const raw = scores[worst] <= 2 ? pick(REVIEW_COMMENTS[worst]) : pick(REVIEW_COMMENTS.good);
    const stored = toStorableText(raw);
    comment = stored.ok ? stored.text : null;
  }
  reviews.push({ id: `rv-${String(++rvSeq).padStart(4, '0')}`, userId: rec.userId, rangeId: rec.rangeId, recordId: rec.id, ...scores, comment, state: 'VISIBLE', createdAt });
}

/* ───────────────────────── 이슈 ───────────────────────── */

const CAT_CODE: Record<Category, string> = {
  TRANSPORT: 'TRN', MEAL: 'MEAL', FACILITY: 'FAC', OPERATION: 'OPS', EQUIPMENT: 'EQP', COMMUNICATION: 'COM', COMPENSATION: 'CMP', ETC: 'ETC',
};
const issues: IssueRec[] = [];
const issueKey = (c: Category, s: string) => `${c}|${s}`;
const issueIdByKey = new Map<string, string>();
(Object.keys(SUBTOPICS) as Category[]).forEach((cat) => {
  SUBTOPICS[cat].forEach((sub, i) => {
    const id = `ISS-${CAT_CODE[cat]}-${String(i + 1).padStart(2, '0')}`;
    issueIdByKey.set(issueKey(cat, sub), id);
    issues.push({ id, category: cat, subtopic: sub, title: ISSUE_TITLE[issueKey(cat, sub)] ?? sub, summary: null, priorityScore: 0, isSafety: false, updatedAt: daysAgo(1) });
  });
});
export const HERO_ISSUE_ID = issueIdByKey.get('MEAL|배식 대기시간')!;

/* ───────────────────────── 개선 제안 ───────────────────────── */

// 카테고리 분포: 식사 1위, 교통 2위
const CATEGORY_PLAN: Array<[Category, number]> = [
  ['MEAL', 90], ['TRANSPORT', 62], ['FACILITY', 46], ['OPERATION', 36], ['EQUIPMENT', 20],
  ['COMMUNICATION', 24], ['COMPENSATION', 20], ['ETC', 8],
];
const SUBTOPIC_WEIGHT: Record<string, number> = {
  'MEAL|배식 대기시간': 5, 'MEAL|식사량': 1.3, 'MEAL|메뉴 다양성': 1, 'MEAL|식당 위생': 0.9,
  'TRANSPORT|셔틀 부족': 3, 'TRANSPORT|셔틀 시간': 1.5, 'TRANSPORT|주차 공간': 1.2, 'TRANSPORT|대중교통 안내': 1,
  'FACILITY|화장실 청결': 1.6, 'FACILITY|냉난방': 1.4, 'FACILITY|휴게 공간': 1.2, 'FACILITY|탈의 공간': 0.6,
  'OPERATION|대기시간': 2.5, 'OPERATION|일정 지연': 1, 'OPERATION|조기 퇴소 기준': 0.8, 'OPERATION|교육 내용': 0.8,
};

function rangeFor(cat: Category, sub: string): string {
  const w: Array<[string, number]> = RANGE_SPECS.map((s) => {
    let x = s.weight;
    if (cat === 'TRANSPORT') x *= s.mountain ? 4 : 0.5;              // 교통 문제는 산간에 몰림
    if (cat === 'MEAL' && s.letter === 'A') x *= sub === '배식 대기시간' ? 6 : 2;   // 주인공 훈련장
    if (cat === 'MEAL' && s.letter === 'D') x *= 0.4;
    if (cat === 'FACILITY' && s.letter === 'M') x *= 0.4;
    if (s.profile.scoreFacility && cat === 'FACILITY' && s.profile.scoreFacility < 3.4) x *= 2;
    if (s.profile.scoreOperation && cat === 'OPERATION' && s.profile.scoreOperation < 3.4) x *= 2;
    if (s.profile.scoreComm && cat === 'COMMUNICATION' && s.profile.scoreComm < 3.4) x *= 2;
    return [rangeId(s.letter), x];
  });
  return weighted(w);
}

function proposalAge(cat: Category, sub: string): number {
  // 식사·급식: 최근 4주 급증
  if (cat === 'MEAL' && chance(sub === '배식 대기시간' ? 0.55 : 0.4)) return randInt(1, 27);
  // 나머지는 12개월에 고르게, 최근 쪽이 약간 많게
  return Math.floor(Math.pow(rand(), 1.15) * 360) + 1;
}

function statusFor(age: number, hero: boolean): ProposalStatus {
  if (hero && age < 40) return weighted([['RECEIVED', 6], ['REVIEWING', 4]]);
  if (age < 14) return weighted([['RECEIVED', 8], ['REVIEWING', 2]]);
  if (age < 60) return weighted([['RECEIVED', 3], ['REVIEWING', 4], ['PLANNED', 2], ['DONE', 0.7], ['LONG_TERM', 0.3]]);
  return weighted([['RECEIVED', 1.2], ['REVIEWING', 1.6], ['PLANNED', 1.4], ['DONE', 4], ['LONG_TERM', 1.8]]);
}

function makeText(key: string): { title: string; body: string } {
  const t = PROPOSAL_TEXT[key];
  let body = pick(OPENERS) + pick(t.bodies) + pick(CLOSERS);
  if (chance(0.15)) body = `${pick(SENSITIVE_PREFIXES)} ${body}`;      // 마스킹 시연용 표현 (저장 시 가려짐)
  const stored = toStorableText(body);
  if (!stored.ok) throw new Error(`시드에 차단 대상이 들어갔습니다: ${body}`);
  return { title: pick(t.titles), body: stored.text };
}

const proposals: ProposalRec[] = [];
const history: StatusHistoryRec[] = [];
const replies: OfficialReplyRec[] = [];
let pSeq = 0, hSeq = 0, rpSeq = 0;
const STATUS_ORDER: ProposalStatus[] = ['RECEIVED', 'REVIEWING', 'PLANNED', 'DONE'];

for (const [cat, count] of CATEGORY_PLAN) {
  const subs = SUBTOPICS[cat];
  for (let k = 0; k < count; k++) {
    const sub = weighted(subs.map((s) => [s, SUBTOPIC_WEIGHT[issueKey(cat, s)] ?? 1] as [string, number]));
    const key = issueKey(cat, sub);
    const rid = rangeFor(cat, sub);
    const age = proposalAge(cat, sub);
    const createdAt = daysAgo(age, randInt(9, 20));
    const hero = key === 'MEAL|배식 대기시간' && rid === 'range-a';
    const status = statusFor(age, hero);
    const { title, body } = makeText(key);
    const id = `p-${String(++pSeq).padStart(4, '0')}`;
    const sentiment = cat === 'MEAL' && sub === '배식 대기시간' ? weighted([[3, 6], [2, 3], [1, 1]]) : weighted([[3, 3], [2, 5], [1, 2]]);
    // 작성자: 해당 훈련장 이수자 중에서
    const candidates = records.filter((r) => r.rangeId === rid && r.userId !== 'u-demo').map((r) => r.userId);
    const authorId = candidates.length ? pick(candidates) : pick(others).id;

    // 상태 이력
    const path: ProposalStatus[] = status === 'LONG_TERM' ? ['RECEIVED', 'REVIEWING', 'LONG_TERM'] : STATUS_ORDER.slice(0, STATUS_ORDER.indexOf(status) + 1);
    let t = new Date(createdAt).getTime();
    const span = Math.max(1, age - 1) * DAY;
    let prev: ProposalStatus | null = null;
    for (let s = 0; s < path.length; s++) {
      if (s > 0) t += Math.floor(span / path.length * (0.6 + rand() * 0.6));
      t = Math.min(t, BASE - 3_600_000);
      history.push({
        id: `h-${String(++hSeq).padStart(5, '0')}`, proposalId: id, from: prev, to: path[s],
        note: s === 0 ? null : pick(STATUS_NOTES[path[s]] ?? ['상태를 변경했습니다.']),
        actorId: s === 0 ? authorId : managerOf(rid), createdAt: new Date(t).toISOString(),
      });
      prev = path[s];
    }
    const updatedAt = new Date(t).toISOString();
    if (['PLANNED', 'DONE', 'LONG_TERM'].includes(status) && chance(0.75)) {
      replies.push({ id: `rp-${String(++rpSeq).padStart(4, '0')}`, targetType: 'PROPOSAL', targetId: id, authorId: managerOf(rid), body: pick(REPLY_TEXT[status]), createdAt: updatedAt });
    }
    proposals.push({
      id, rangeId: rid, authorId, category: cat, subtopic: sub, title, body, status, sentiment,
      issueId: issueIdByKey.get(key) ?? null, state: 'VISIBLE', createdAt, updatedAt,
    });
  }
}

// 평가 공식 답변 (약 15%)
for (const rv of reviews) {
  if (rv.comment && chance(0.2)) {
    replies.push({ id: `rp-${String(++rpSeq).padStart(4, '0')}`, targetType: 'REVIEW', targetId: rv.id, authorId: managerOf(rv.rangeId), body: pick(REPLY_TEXT.REVIEW), createdAt: new Date(new Date(rv.createdAt).getTime() + 2 * DAY).toISOString() });
  }
}

/* ───────────────────────── 공감 ───────────────────────── */

const empathies: EmpathyRec[] = [];
for (const p of proposals) {
  const key = `${p.category}|${p.subtopic}`;
  const base = key === 'MEAL|배식 대기시간' ? 9 : (SUBTOPIC_WEIGHT[key] ?? 1) >= 2.5 ? 6 : 3.5;
  const n = Math.max(0, Math.round(normal(base, base * 0.5)));
  const used = new Set<string>([p.authorId]);
  for (let i = 0; i < n; i++) {
    const u = pick(others).id;
    if (used.has(u)) continue;
    used.add(u);
    const pAge = ageOf(p.createdAt);
    empathies.push({ userId: u, proposalId: p.id, createdAt: daysAgo(Math.max(0, pAge - rand() * Math.min(pAge, 20)), randInt(9, 22)) });
  }
}

/* ───────────────────────── 이슈 우선순위 ───────────────────────── */

const empCount = new Map<string, number>();
for (const e of empathies) empCount.set(e.proposalId, (empCount.get(e.proposalId) ?? 0) + 1);
for (const iss of issues) {
  const ps = proposals.filter((p) => p.issueId === iss.id);
  iss.isSafety = isSafetyText(iss.subtopic, ...ps.map((p) => p.body));
  if (!ps.length) continue;
  const recent = ps.filter((p) => ageOf(p.createdAt) <= 30).length / ps.length;
  const b = priorityScore({
    proposalCount: ps.length, empathyCount: ps.reduce((s, p) => s + (empCount.get(p.id) ?? 0), 0),
    avgSentiment: ps.reduce((s, p) => s + (p.sentiment ?? 2), 0) / ps.length, isSafety: iss.isSafety, recentRatio: recent,
  });
  iss.priorityScore = b.score;
}

/* ───────────────────────── 개선 사례 ───────────────────────── */

const bestPractices: BestPracticeRec[] = BEST_PRACTICES.map((b, i) => {
  const rid = rangeId(b.range);
  const src = proposals.find((p) => p.rangeId === rid && p.category === b.category && p.status === 'DONE');
  return {
    id: `bp-${String(i + 1).padStart(2, '0')}`, rangeId: rid, category: b.category, title: b.title, before: b.before, after: b.after,
    completedAt: daysAgo(b.monthsAgo * 30 + randInt(0, 10), 15), sourceProposalId: src?.id ?? null,
  };
});

/* ───────────────────────── 가이드 · Q&A ───────────────────────── */

const guides: GuideRec[] = [];
const questions: QuestionRec[] = [];
const answers: AnswerRec[] = [];
let gSeq = 0, qSeq = 0, aSeq = 0;
for (const r of ranges) {
  const count = randInt(8, 15);
  const official = GUIDE_TEMPLATES.filter((g) => g.official);
  const tips = GUIDE_TEMPLATES.filter((g) => !g.official);
  const chosen = [...official.slice(0, randInt(4, official.length)), ...tips.sort(() => rand() - 0.5).slice(0, Math.max(0, count - 4))].slice(0, count);
  for (const g of chosen) {
    guides.push({
      id: `g-${String(++gSeq).padStart(4, '0')}`, rangeId: r.id, section: g.section, body: g.body, isOfficial: g.official,
      authorId: g.official ? managerOf(r.id) : pick(others).id, helpfulCount: g.official ? randInt(5, 40) : randInt(0, 30),
      state: 'VISIBLE', createdAt: daysAgo(randInt(30, 300)),
    });
  }
  const rangeGuides = guides.filter((g) => g.rangeId === r.id);
  const qs = [...QUESTIONS].sort(() => rand() - 0.5).slice(0, randInt(3, 6));
  for (const q of qs) {
    const qid = `q-${String(++qSeq).padStart(4, '0')}`;
    const createdAt = daysAgo(randInt(5, 200), randInt(9, 22));
    questions.push({ id: qid, rangeId: r.id, authorId: pick(others).id, body: q.q, createdAt });
    const ai = answerFromGuides({ question: q.q, guides: rangeGuides.map((g) => ({ id: g.id, section: g.section, body: g.body })) });
    if (ai) answers.push({ id: `a-${String(++aSeq).padStart(4, '0')}`, questionId: qid, authorId: null, isAi: true, body: ai.body, sourceGuideIds: ai.sourceGuideIds, createdAt });
    if (q.human) answers.push({ id: `a-${String(++aSeq).padStart(4, '0')}`, questionId: qid, authorId: pick(others).id, isAi: false, body: q.human, sourceGuideIds: [], createdAt: new Date(new Date(createdAt).getTime() + 5 * 3_600_000).toISOString() });
  }
}

/* ───────────────────────── 감사 로그 (과거 이력 예시) ───────────────────────── */

const audits: MaskingAuditRec[] = [
  { id: 'au-0001', purpose: 'AI_SUMMARY', maskedText: '카테고리: 교통·접근성 / 세부 주제: 셔틀 부족\n1. [부대] 쪽 훈련장인데 버스 정류장에서 훈련장까지 걸어서 40분입니다...', entityCounts: { UNIT: 1 }, blocked: false, blockReasons: [], provider: 'cache', createdAt: daysAgo(12, 14) },
  { id: 'au-0002', purpose: 'AI_QNA', maskedText: '[질문] 셔틀버스는 어디서 타나요?', entityCounts: {}, blocked: false, blockReasons: [], provider: 'cache', createdAt: daysAgo(9, 11) },
  { id: 'au-0003', purpose: 'AI_SOLUTION', maskedText: '(차단되어 전송하지 않음)', entityCounts: { FACILITY: 1 }, blocked: true, blockReasons: ['주요 시설 위치 언급'], provider: 'cache', createdAt: daysAgo(6, 16) },
];

/* ───────────────────────── 출력 ───────────────────────── */

const ds: Dataset = {
  ranges, users, records, reviews, issues, proposals, empathies, history, replies,
  solutions: [], bestPractices, guides, questions, answers, reports: [], audits,
};

const outDir = join(process.cwd(), 'data', 'demo');
mkdirSync(join(outDir, 'ai-cache'), { recursive: true });
const write = (name: string, value: unknown) => writeFileSync(join(outDir, name), JSON.stringify(value, null, 1) + '\n');

write('ranges.json', ranges);
write('users.json', users);
write('records.json', records);
write('reviews.json', reviews);
write('proposals.json', proposals);
write('empathies.json', empathies);
write('history.json', history);
write('replies.json', replies);
write('issues.json', issues);
write('best-practices.json', bestPractices);
write('guides.json', guides);
write('qna.json', { questions, answers });
write('audits.json', audits);
write('meta.json', { baseDate: SEED_BASE_DATE, seed: 'milaind-2026', heroIssueId: HERO_ISSUE_ID, heroRangeId: 'range-a', demoReservistId: 'u-demo' });

/* ───────────── AI 대책 캐시 초안: 우선순위 상위 10개 + 주인공 이슈 ───────────── */

const top = [...issues].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 10).map((i) => i.id);
if (!top.includes(HERO_ISSUE_ID)) top.push(HERO_ISSUE_ID);
const cacheDir = join(outDir, 'ai-cache');
const existing = existsSync(cacheDir) ? readdirSync(cacheDir) : [];
const cachedIds: string[] = [];
for (const issueId of top) {
  const iss = issues.find((i) => i.id === issueId)!;
  const draft = AI_DRAFTS[`${iss.category}|${iss.subtopic}`];
  if (!draft) { console.warn(`초안 없음: ${issueId} ${iss.subtopic}`); continue; }
  const file = join(cacheDir, `${issueId}.json`);
  const ps = proposals.filter((p) => p.issueId === issueId);
  const cases = bestPractices.filter((b) => b.category === iss.category).map((b) => ({ id: b.id, title: b.title, before: b.before, after: b.after }));
  const prep = prepareSolutionRequest({
    issueId, category: iss.category, subtopic: iss.subtopic,
    proposals: ps.map((p) => ({ id: p.id, title: p.title, body: p.body, empathyCount: empCount.get(p.id) ?? 0, createdAt: p.createdAt })),
    stats: { proposalCount: ps.length, empathyCount: ps.reduce((s, p) => s + (empCount.get(p.id) ?? 0), 0), rangeCount: new Set(ps.map((p) => p.rangeId)).size, trend: 'up' },
    bestPractices: cases,
  }, 'cache:seed-draft');
  const solution = { ...draft, referencedCases: draft.referencedCases.filter((c) => cases.some((b) => b.id === c.bestPracticeId)) };
  writeFileSync(file, JSON.stringify({
    issueId, solution, maskedRequest: prep.maskedRequest, provider: 'cache:seed-draft', generatedAt: SEED_BASE_DATE, reviewed: false,
    note: '시드 생성기가 만든 초안입니다. 발표 전 scripts/build-ai-cache.ts로 상용 AI 응답을 생성·검수해 교체하세요.',
  }, null, 1) + '\n');
  cachedIds.push(issueId);
}
for (const f of existing) {
  if (f !== 'index.json' && f.endsWith('.json') && !cachedIds.includes(f.replace('.json', ''))) unlinkSync(join(cacheDir, f));
}
writeFileSync(join(cacheDir, 'index.json'), JSON.stringify({ issueIds: cachedIds }, null, 1) + '\n');

const statusCount = proposals.reduce<Record<string, number>>((m, p) => ((m[p.status] = (m[p.status] ?? 0) + 1), m), {});
console.log({
  ranges: ranges.length, users: users.length, records: records.length, reviews: reviews.length, proposals: proposals.length,
  empathies: empathies.length, issues: issues.length, bestPractices: bestPractices.length, guides: guides.length,
  questions: questions.length, answers: answers.length, statusCount,
  topIssues: [...issues].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5).map((i) => `${i.title} ${i.priorityScore}`),
  cached: cachedIds,
});
