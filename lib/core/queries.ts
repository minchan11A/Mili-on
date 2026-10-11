/**
 * 읽기 쿼리 (두 모드 공용, 순수 함수).
 * 시연 모드는 메모리 store의 Dataset을, 서버 모드는 DB에서 읽은 Dataset 스냅샷을 넘깁니다.
 * 그래서 화면에 보이는 집계(평균 점수, 추세, 우선순위, 급증)는 두 모드에서 똑같이 계산됩니다.
 */
import { detectSpike, daysBetween, lastMonths, mean, monthKey, round1, round2, trendOf, DAY } from '../analysis/stats';
import { isSafetyText, priorityScore } from '../analysis/priority';
import { findSimilar } from '../analysis/similarity';
import {
  CATEGORIES, GUIDE_SECTION_LABEL, MIN_REVIEWS_FOR_SCORE, OVERDUE_DAYS, REVIEW_WINDOW_DAYS, SCORE_AXES, TRAINING_TYPE_LABEL,
} from '../constants';
import { hasCachedSolution } from '../llm/cache';
import type {
  AiSolutionRec, AiSolutionView, BestPracticeView, Category, DashboardData, Dataset, GuideView, HomeStats, IssueDetail,
  IssueQuery, IssueView, MaskingAuditView, Page, ProposalDetail, ProposalQuery, ProposalRec, ProposalStatus, ProposalView,
  QuestionView, RangeDetail, RangeFilter, RangeSummary, ReviewRec, ReviewView, ScoreSet, TrendData, TrendQuery, Viewer,
} from '../types';

export interface Ctx { ds: Dataset; viewer: Viewer | null; now?: Date }

const nowOf = (c: Ctx) => c.now ?? new Date();
const isManager = (v: Viewer | null) => v?.role === 'RANGE_MANAGER' || v?.role === 'POLICY_ADMIN';

/* ───────────────────────── 인덱스 (Dataset 참조별 캐시) ───────────────────────── */

interface Index {
  rangeById: Map<string, Dataset['ranges'][number]>;
  userById: Map<string, Dataset['users'][number]>;
  recordById: Map<string, Dataset['records'][number]>;
  empathyCount: Map<string, number>;
  empathized: Set<string>;   // `${userId}|${proposalId}`
  replyByTarget: Map<string, Dataset['replies'][number]>;
  historyByProposal: Map<string, Dataset['history']>;
  proposalsByIssue: Map<string, ProposalRec[]>;
  guideById: Map<string, Dataset['guides'][number]>;
  reportCount: Map<string, number>;
}
const indexCache = new WeakMap<Dataset, { version: string; index: Index }>();

/** 데이터가 바뀌면 길이가 바뀌므로 간단한 버전 문자열로 무효화 (상태 변경은 store가 새 배열을 만들어 참조가 바뀜) */
const versionOf = (ds: Dataset) =>
  [ds.proposals, ds.empathies, ds.replies, ds.history, ds.reviews, ds.guides, ds.reports, ds.solutions].map((a) => a.length).join('.');

export function indexOf(ds: Dataset): Index {
  const v = versionOf(ds);
  const hit = indexCache.get(ds);
  if (hit && hit.version === v) return hit.index;
  const index: Index = {
    rangeById: new Map(ds.ranges.map((r) => [r.id, r])),
    userById: new Map(ds.users.map((u) => [u.id, u])),
    recordById: new Map(ds.records.map((r) => [r.id, r])),
    empathyCount: new Map(),
    empathized: new Set(),
    replyByTarget: new Map(ds.replies.map((r) => [`${r.targetType}|${r.targetId}`, r])),
    historyByProposal: new Map(),
    proposalsByIssue: new Map(),
    guideById: new Map(ds.guides.map((g) => [g.id, g])),
    reportCount: new Map(),
  };
  for (const e of ds.empathies) {
    index.empathyCount.set(e.proposalId, (index.empathyCount.get(e.proposalId) ?? 0) + 1);
    index.empathized.add(`${e.userId}|${e.proposalId}`);
  }
  for (const h of ds.history) {
    const list = index.historyByProposal.get(h.proposalId) ?? [];
    list.push(h);
    index.historyByProposal.set(h.proposalId, list);
  }
  for (const p of ds.proposals) {
    if (!p.issueId) continue;
    const list = index.proposalsByIssue.get(p.issueId) ?? [];
    list.push(p);
    index.proposalsByIssue.set(p.issueId, list);
  }
  for (const r of ds.reports) index.reportCount.set(`${r.targetType}|${r.targetId}`, (index.reportCount.get(`${r.targetType}|${r.targetId}`) ?? 0) + 1);
  indexCache.set(ds, { version: v, index });
  return index;
}

/* ───────────────────────── 공통 라벨 ───────────────────────── */

/** 담당자 화면에는 별명도 숨기고 통계 속성만 (명세 §9) */
export function authorLabel(c: Ctx, userId: string, rangeId?: string): string {
  const ix = indexOf(c.ds);
  const u = ix.userById.get(userId);
  if (!u) return '알 수 없음';
  if (u.role === 'RANGE_MANAGER') return u.nickname;
  if (u.role === 'POLICY_ADMIN') return '정책 담당자';
  if (isManager(c.viewer)) {
    const rec = rangeId ? c.ds.records.filter((r) => r.userId === userId && r.rangeId === rangeId).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] : undefined;
    return `예비군(${u.ageBand ?? '연령 미상'}${rec ? `, ${TRAINING_TYPE_LABEL[rec.trainingType]}` : ''})`;
  }
  if (c.viewer?.id === userId) return `${u.nickname} (나)`;
  return u.nickname;
}

/* ───────────────────────── 점수 ───────────────────────── */

const AXIS_KEYS = SCORE_AXES.map((a) => a.key);
export const reviewOverall = (r: Pick<ReviewRec, 'scoreTransport' | 'scoreMeal' | 'scoreFacility' | 'scoreOperation' | 'scoreComm'>) =>
  (r.scoreTransport + r.scoreMeal + r.scoreFacility + r.scoreOperation + r.scoreComm) / 5;

function scoreSet(reviews: ReviewRec[]): ScoreSet {
  const out = {} as ScoreSet;
  for (const k of AXIS_KEYS) out[k] = reviews.length >= MIN_REVIEWS_FOR_SCORE ? round1(mean(reviews.map((r) => r[k]))) : null;
  return out;
}

function visibleReviews(c: Ctx, rangeId: string, filter?: RangeFilter): ReviewRec[] {
  const ix = indexOf(c.ds);
  return c.ds.reviews.filter((r) => {
    if (r.rangeId !== rangeId || r.state !== 'VISIBLE') return false;
    if (filter?.trainingType) return ix.recordById.get(r.recordId)?.trainingType === filter.trainingType;
    return true;
  });
}

function windowMean(reviews: ReviewRec[], now: Date, fromDays: number, toDays: number): { m: number | null; n: number } {
  const xs = reviews.filter((r) => {
    const age = (now.getTime() - new Date(r.createdAt).getTime()) / DAY;
    return age >= fromDays && age < toDays;
  });
  return { m: mean(xs.map(reviewOverall)), n: xs.length };
}

export function rangeSummary(c: Ctx, rangeId: string, filter?: RangeFilter): RangeSummary {
  const ix = indexOf(c.ds);
  const r = ix.rangeById.get(rangeId);
  if (!r) throw new NotFoundError('훈련장을 찾을 수 없습니다');
  const reviews = visibleReviews(c, rangeId, filter);
  const now = nowOf(c);
  const scores = scoreSet(reviews);
  const overall = reviews.length >= MIN_REVIEWS_FOR_SCORE ? round1(mean(reviews.map(reviewOverall))) : null;
  const recent = windowMean(reviews, now, 0, 90);
  const prev = windowMean(reviews, now, 90, 180);
  const trendDelta = recent.n >= 3 && prev.n >= 3 && recent.m !== null && prev.m !== null ? round2(recent.m - prev.m) : null;
  const rangeProposals = c.ds.proposals.filter((p) => p.rangeId === rangeId);
  const latestReply = c.ds.replies
    .filter((rp) => (rp.targetType === 'PROPOSAL' && rangeProposals.some((p) => p.id === rp.targetId)) || (rp.targetType === 'REVIEW' && reviews.some((v) => v.id === rp.targetId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    id: r.id, code: r.code, name: r.name, type: r.type, sido: r.sido, sigungu: r.sigungu, lat: r.lat, lng: r.lng,
    overall, scores, reviewCount: reviews.length, trendDelta, trend: trendOf(trendDelta),
    openProposalCount: rangeProposals.filter((p) => p.status !== 'DONE' && p.status !== 'LONG_TERM').length,
    latestReply: latestReply ? { body: latestReply.body, createdAt: latestReply.createdAt } : null,
  };
}

export function listRanges(c: Ctx, filter: RangeFilter = {}): RangeSummary[] {
  const q = filter.q?.trim();
  let list = c.ds.ranges
    .filter((r) => !filter.sido || r.sido === filter.sido)
    .filter((r) => !q || r.name.includes(q) || r.sido.includes(q) || r.sigungu.includes(q) || r.code.toLowerCase().includes(q.toLowerCase()))
    .map((r) => rangeSummary(c, r.id, filter));
  if (filter.trainingType) list = list.filter((r) => r.reviewCount > 0);
  const key = filter.sort && filter.sort !== 'overall' ? filter.sort : null;
  const val = (r: RangeSummary) => (key ? r.scores[key] : r.overall);
  return list.sort((a, b) => (val(b) ?? -1) - (val(a) ?? -1) || a.name.localeCompare(b.name));
}

export function getRange(c: Ctx, rangeId: string): RangeDetail {
  const s = rangeSummary(c, rangeId);
  const r = indexOf(c.ds).rangeById.get(rangeId)!;
  const reviews = visibleReviews(c, rangeId);
  const months = lastMonths(12, nowOf(c));
  const monthly = months.map((m) => {
    const xs = reviews.filter((v) => monthKey(v.createdAt) === m);
    return { month: m, overall: xs.length ? round1(mean(xs.map(reviewOverall))) : null, count: xs.length };
  });
  return { ...s, description: r.description, monthly, managerName: `${r.name} 담당자` };
}

/* ───────────────────────── 평가 ───────────────────────── */

export function paginate<T>(items: T[], page = 1, pageSize = 20): Page<T> {
  const p = Math.max(1, page);
  return { items: items.slice((p - 1) * pageSize, p * pageSize), page: p, pageSize, total: items.length };
}

export function listReviews(c: Ctx, rangeId: string, page = 1): Page<ReviewView> {
  const ix = indexOf(c.ds);
  const items = c.ds.reviews
    .filter((r) => r.rangeId === rangeId && (r.state === 'VISIBLE' || isManager(c.viewer)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map<ReviewView>((r) => {
      const reply = ix.replyByTarget.get(`REVIEW|${r.id}`);
      return {
        id: r.id, rangeId: r.rangeId, authorLabel: authorLabel(c, r.userId, r.rangeId),
        scores: Object.fromEntries(AXIS_KEYS.map((k) => [k, r[k]])), overall: round1(reviewOverall(r))!,
        comment: r.comment, createdAt: r.createdAt, reply: reply ? { body: reply.body, createdAt: reply.createdAt } : null,
        hidden: r.state !== 'VISIBLE',
      };
    });
  return paginate(items, page, 10);
}

export function reviewEligibility(c: Ctx, rangeId: string): { eligible: boolean; recordId?: string; reason?: string; canSelfReport?: boolean } {
  const v = c.viewer;
  if (!v) return { eligible: false, reason: '로그인이 필요합니다' };
  if (v.role !== 'RESERVIST') return { eligible: false, reason: '예비군만 평가할 수 있습니다' };
  const recs = c.ds.records.filter((r) => r.userId === v.id && r.rangeId === rangeId).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  // 이수 기록이 없으면 설문에서 훈련 정보를 직접 입력해 참여할 수 있음 (실제 도입 시 예비군 홈페이지 연동)
  if (!recs.length) return { eligible: false, reason: '이 훈련장 이수 기록이 없습니다', canSelfReport: true };
  const now = nowOf(c);
  const reviewed = new Set(c.ds.reviews.map((r) => r.recordId));
  const open = recs.find((r) => !reviewed.has(r.id) && daysBetween(r.completedAt, now) <= REVIEW_WINDOW_DAYS);
  if (open) return { eligible: true, recordId: open.id };
  const latest = recs[0];
  if (reviewed.has(latest.id)) return { eligible: false, reason: '이미 평가했습니다' };
  return { eligible: false, reason: `평가 기간(${REVIEW_WINDOW_DAYS}일)이 지났습니다`, canSelfReport: true };
}

/* ───────────────────────── 제안 ───────────────────────── */

export function proposalView(c: Ctx, p: ProposalRec): ProposalView {
  const ix = indexOf(c.ds);
  const now = nowOf(c);
  return {
    id: p.id, rangeId: p.rangeId, rangeName: ix.rangeById.get(p.rangeId)?.name ?? '', category: p.category, subtopic: p.subtopic,
    title: p.title, body: p.body, status: p.status, empathyCount: ix.empathyCount.get(p.id) ?? 0,
    empathized: !!c.viewer && ix.empathized.has(`${c.viewer.id}|${p.id}`),
    hasReply: ix.replyByTarget.has(`PROPOSAL|${p.id}`), createdAt: p.createdAt, updatedAt: p.updatedAt, issueId: p.issueId,
    authorLabel: authorLabel(c, p.authorId, p.rangeId), isMine: c.viewer?.id === p.authorId,
    ageDays: Math.max(0, daysBetween(p.createdAt, now)), hidden: p.state !== 'VISIBLE',
  };
}

export function listProposals(c: Ctx, q: ProposalQuery = {}): Page<ProposalView> {
  const ix = indexOf(c.ds);
  const managedRange = c.viewer?.role === 'RANGE_MANAGER' ? c.viewer.managedRangeId : null;
  let list = c.ds.proposals.filter((p) =>
    (!q.rangeId || p.rangeId === q.rangeId) &&
    (!q.status || p.status === q.status) &&
    (!q.category || p.category === q.category) &&
    (!q.issueId || p.issueId === q.issueId) &&
    (!q.mine || p.authorId === c.viewer?.id) &&
    (!q.empathized || (!!c.viewer && ix.empathized.has(`${c.viewer.id}|${p.id}`))) &&
    (!q.managedOnly || !managedRange || p.rangeId === managedRange) &&
    (!q.openOnly || (p.status !== 'DONE' && p.status !== 'LONG_TERM')) &&
    (p.state === 'VISIBLE' || isManager(c.viewer) || p.authorId === c.viewer?.id));
  const emp = (p: ProposalRec) => ix.empathyCount.get(p.id) ?? 0;
  if (q.sort === 'recent') list = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else if (q.sort === 'oldest') list = list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  else list = list.sort((a, b) => emp(b) - emp(a) || b.createdAt.localeCompare(a.createdAt));
  return paginate(list.map((p) => proposalView(c, p)), q.page ?? 1, q.pageSize ?? 20);
}

export function getProposal(c: Ctx, id: string): ProposalDetail {
  const ix = indexOf(c.ds);
  const p = c.ds.proposals.find((x) => x.id === id);
  if (!p || (p.state !== 'VISIBLE' && !isManager(c.viewer) && p.authorId !== c.viewer?.id)) throw new NotFoundError('제안을 찾을 수 없습니다');
  const reply = ix.replyByTarget.get(`PROPOSAL|${p.id}`);
  const hist = (ix.historyByProposal.get(p.id) ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // 시드 이력은 상태 "변경"만 담고 있어, 첫 접수 단계가 없으면 작성 시각으로 채움
  if (!hist.some((h) => !h.from && h.to === 'RECEIVED')) hist.unshift({ id: `${p.id}-received`, proposalId: p.id, from: null, to: 'RECEIVED', note: null, actorId: p.authorId, createdAt: p.createdAt });
  return {
    ...proposalView(c, p),
    history: hist.map((h) => ({ id: h.id, from: h.from, to: h.to, note: h.note, actorLabel: h.to === 'RECEIVED' && !h.from ? '접수' : authorLabel(c, h.actorId, p.rangeId), createdAt: h.createdAt })),
    reply: reply ? { body: reply.body, createdAt: reply.createdAt, authorLabel: authorLabel(c, reply.authorId) } : null,
    issueTitle: p.issueId ? c.ds.issues.find((i) => i.id === p.issueId)?.title ?? null : null,
  };
}

export function similarProposals(c: Ctx, rangeId: string, text: string, category?: Category): ProposalView[] {
  const pool = c.ds.proposals
    .filter((p) => p.state === 'VISIBLE' && p.status !== 'DONE')
    .map((p) => ({ id: p.id, text: `${p.title} ${p.body}`, altTexts: [p.title, p.body], rangeId: p.rangeId, category: p.category }));
  return findSimilar(pool, { rangeId, category, text }).map((m) => proposalView(c, c.ds.proposals.find((p) => p.id === m.id)!));
}

/* ───────────────────────── 이슈·동향 ───────────────────────── */

export function issueView(c: Ctx, issueId: string): IssueView | null {
  const ix = indexOf(c.ds);
  const iss = c.ds.issues.find((i) => i.id === issueId);
  if (!iss) return null;
  const ps = (ix.proposalsByIssue.get(issueId) ?? []).filter((p) => p.state === 'VISIBLE');
  const now = nowOf(c);
  const empathies = ps.reduce((s, p) => s + (ix.empathyCount.get(p.id) ?? 0), 0);
  const recentRatio = ps.length ? ps.filter((p) => (now.getTime() - new Date(p.createdAt).getTime()) / DAY <= 30).length / ps.length : 0;
  const avgSentiment = ps.length ? ps.reduce((s, p) => s + (p.sentiment ?? 2), 0) / ps.length : 0;
  const isSafety = iss.isSafety || isSafetyText(iss.subtopic);
  const b = priorityScore({ proposalCount: ps.length, empathyCount: empathies, avgSentiment, isSafety, recentRatio });
  const statusCounts: Partial<Record<ProposalStatus, number>> = {};
  for (const p of ps) statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  const last30 = ps.filter((p) => (now.getTime() - new Date(p.createdAt).getTime()) / DAY <= 30).length;
  const prev30 = ps.filter((p) => { const a = (now.getTime() - new Date(p.createdAt).getTime()) / DAY; return a > 30 && a <= 60; }).length;
  return {
    id: iss.id, category: iss.category, subtopic: iss.subtopic, title: iss.title, isSafety,
    priorityScore: b.score, proposalCount: ps.length, empathyCount: empathies, rangeCount: new Set(ps.map((p) => p.rangeId)).size,
    statusCounts, avgSentiment: Math.round(avgSentiment * 100) / 100, recentRatio: Math.round(recentRatio * 100) / 100,
    priorityBreakdown: b, trend: last30 > prev30 * 1.2 ? 'up' : last30 < prev30 * 0.8 ? 'down' : 'flat',
  };
}

export function listIssues(c: Ctx, q: IssueQuery = {}): IssueView[] {
  const ix = indexOf(c.ds);
  return c.ds.issues
    .filter((i) => !q.category || i.category === q.category)
    .filter((i) => !q.rangeId || (ix.proposalsByIssue.get(i.id) ?? []).some((p) => p.rangeId === q.rangeId))
    .map((i) => issueView(c, i.id)!)
    .filter((v) => v.proposalCount > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, q.limit ?? 100);
}

export function solutionView(c: Ctx, s: AiSolutionRec, extra: Partial<AiSolutionView> = {}): AiSolutionView {
  return {
    id: s.id, issueId: s.issueId, provider: s.provider, maskedRequest: s.maskedRequest, solution: s.responseJson,
    edited: s.editedJson ?? null, decision: s.decision, decidedAt: s.decidedAt ?? null, createdAt: s.createdAt,
    generatedAt: s.generatedAt ?? null, reviewed: s.reviewed,
    cases: (s.editedJson ?? s.responseJson).referencedCases
      .map((rc) => c.ds.bestPractices.find((b) => b.id === rc.bestPracticeId))
      .filter((b): b is NonNullable<typeof b> => !!b)
      .map((b) => bestPracticeView(c, b)),
    fromCache: s.provider.startsWith('cache'),
    ...extra,
  };
}

/** 이 이슈에 대해 AI 대책을 다룰 수 있는지 (명세 §9: 담당자는 자기 훈련장 관련 이슈만) */
export function canHandleIssue(c: Ctx, issueId: string): boolean {
  const v = c.viewer;
  if (!v) return false;
  if (v.role === 'POLICY_ADMIN') return true;
  if (v.role !== 'RANGE_MANAGER' || !v.managedRangeId) return false;
  return (indexOf(c.ds).proposalsByIssue.get(issueId) ?? []).some((p) => p.rangeId === v.managedRangeId);
}

export function getIssue(c: Ctx, id: string): IssueDetail {
  const v = issueView(c, id);
  if (!v) throw new NotFoundError('이슈를 찾을 수 없습니다');
  const iss = c.ds.issues.find((i) => i.id === id)!;
  const ix = indexOf(c.ds);
  const ps = (ix.proposalsByIssue.get(id) ?? []).filter((p) => p.state === 'VISIBLE');
  const byRangeMap = new Map<string, number>();
  for (const p of ps) byRangeMap.set(p.rangeId, (byRangeMap.get(p.rangeId) ?? 0) + 1);
  const canSee = canHandleIssue(c, id);
  const latest = canSee ? c.ds.solutions.filter((s) => s.issueId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined;
  const emp = (p: ProposalRec) => ix.empathyCount.get(p.id) ?? 0;
  return {
    ...v,
    summary: iss.summary,
    proposals: ps.slice().sort((a, b) => emp(b) - emp(a) || b.createdAt.localeCompare(a.createdAt)).map((p) => proposalView(c, p)),
    byRange: [...byRangeMap.entries()].map(([rangeId, count]) => ({ rangeId, rangeName: ix.rangeById.get(rangeId)?.name ?? '', count })).sort((a, b) => b.count - a.count),
    latestSolution: latest ? solutionView(c, latest) : null,
    hasCache: hasCachedSolution(id),
  };
}

export function getTrends(c: Ctx, q: TrendQuery = {}): TrendData {
  const months = q.months ?? 6;
  const now = nowOf(c);
  const keys = lastMonths(months, now);
  const ix = indexOf(c.ds);
  const inWindow = c.ds.proposals.filter((p) => p.state === 'VISIBLE' && keys.includes(monthKey(p.createdAt)));
  const ranking = CATEGORIES.map((cat) => {
    const ps = inWindow.filter((p) => p.category === cat);
    return { category: cat, proposals: ps.length, empathies: ps.reduce((s, p) => s + (ix.empathyCount.get(p.id) ?? 0), 0) };
  }).filter((r) => r.proposals > 0).sort((a, b) => b.proposals - a.proposals || b.empathies - a.empathies);
  const monthly = keys.map((m) => {
    const row: TrendData['monthly'][number] = { month: m };
    for (const cat of CATEGORIES) row[cat] = inWindow.filter((p) => p.category === cat && monthKey(p.createdAt) === m).length;
    return row;
  });
  return { months, ranking, monthly, topCategories: ranking.slice(0, 4).map((r) => r.category), spikes: spikes(c) };
}

export function spikes(c: Ctx) {
  const now = nowOf(c);
  return CATEGORIES
    .map((cat) => detectSpike(cat, c.ds.proposals.filter((p) => p.category === cat && p.state === 'VISIBLE').map((p) => p.createdAt), now))
    .filter((s) => s.isSpike)
    .sort((a, b) => b.ratio - a.ratio)
    .map(({ isSpike: _x, ...rest }) => rest);
}

/* ───────────────────────── 대시보드 ───────────────────────── */

function processingDays(c: Ctx, ps: ProposalRec[]): number | null {
  const ix = indexOf(c.ds);
  const days = ps.filter((p) => p.status === 'DONE').map((p) => {
    const done = (ix.historyByProposal.get(p.id) ?? []).find((h) => h.to === 'DONE');
    return done ? (new Date(done.createdAt).getTime() - new Date(p.createdAt).getTime()) / DAY : null;
  }).filter((x): x is number => x !== null);
  return days.length ? Math.round(mean(days)! * 10) / 10 : null;
}

export function getDashboard(c: Ctx): DashboardData {
  const v = c.viewer;
  if (!isManager(v)) throw new ForbiddenError('담당자만 볼 수 있습니다');
  const scopeRange = v!.role === 'RANGE_MANAGER' ? v!.managedRangeId ?? null : null;
  const ps = c.ds.proposals.filter((p) => p.state === 'VISIBLE' && (!scopeRange || p.rangeId === scopeRange));
  const now = nowOf(c);
  const open = ps.filter((p) => p.status === 'RECEIVED' || p.status === 'REVIEWING');
  const thisMonth = monthKey(now);
  const ix = indexOf(c.ds);
  const doneThisMonth = ps.filter((p) => p.status === 'DONE' && (ix.historyByProposal.get(p.id) ?? []).some((h) => h.to === 'DONE' && monthKey(h.createdAt) === thisMonth)).length;
  const rangeName = scopeRange ? ix.rangeById.get(scopeRange)?.name ?? '' : '';
  return {
    scope: scopeRange ? 'range' : 'all',
    scopeLabel: scopeRange ? rangeName : '전체 훈련장',
    kpi: {
      open: open.length,
      overdue: ps.filter((p) => p.status === 'RECEIVED' && daysBetween(p.createdAt, now) >= OVERDUE_DAYS).length,
      doneThisMonth,
      avgDays: processingDays(c, ps),
    },
    topIssues: listIssues(c, { rangeId: scopeRange ?? undefined, limit: 5 }),
    spikes: spikes(c),
    rangeTable: v!.role === 'POLICY_ADMIN'
      ? c.ds.ranges.map((r) => {
        const s = rangeSummary(c, r.id);
        return { id: r.id, name: r.name, sido: r.sido, overall: s.overall, delta: s.trendDelta, reviewCount: s.reviewCount, open: s.openProposalCount };
      }).sort((a, b) => a.name.localeCompare(b.name))   // 순위 번호 없이 이름순 (명세 §6.7)
      : undefined,
  };
}

export function listMaskingAudit(c: Ctx, page = 1, blockedOnly = false): Page<MaskingAuditView> {
  if (c.viewer?.role !== 'POLICY_ADMIN') throw new ForbiddenError('정책 담당자만 볼 수 있습니다');
  const items = c.ds.audits
    .filter((a) => !blockedOnly || a.blocked)
    .slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((a) => ({ ...a, entityTotal: Object.values(a.entityCounts).reduce((s, n) => s + n, 0) }));
  return paginate(items, page, 20);
}

/* ───────────────────────── 가이드·Q&A ───────────────────────── */

export function listGuide(c: Ctx, rangeId: string): GuideView[] {
  return c.ds.guides
    .filter((g) => g.rangeId === rangeId && (g.state === 'VISIBLE' || isManager(c.viewer)))
    .sort((a, b) => Number(b.isOfficial) - Number(a.isOfficial) || b.helpfulCount - a.helpfulCount || b.createdAt.localeCompare(a.createdAt))
    .map((g) => ({
      id: g.id, rangeId: g.rangeId, section: g.section, body: g.body, isOfficial: g.isOfficial, helpfulCount: g.helpfulCount,
      createdAt: g.createdAt, authorLabel: g.isOfficial ? '공식' : authorLabel(c, g.authorId, g.rangeId), hidden: g.state !== 'VISIBLE',
    }));
}

export function listQuestions(c: Ctx, rangeId: string): QuestionView[] {
  const ix = indexOf(c.ds);
  return c.ds.questions
    .filter((q) => q.rangeId === rangeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((q) => {
      const answers = c.ds.answers
        .filter((a) => a.questionId === q.id && (a.state ?? 'VISIBLE') === 'VISIBLE')
        .sort((a, b) => Number(b.isAi) - Number(a.isAi) || a.createdAt.localeCompare(b.createdAt))
        .map((a) => ({
          id: a.id, isAi: a.isAi, body: a.body, createdAt: a.createdAt,
          authorLabel: a.isAi ? 'AI 답변' : a.authorId ? authorLabel(c, a.authorId, rangeId) : '알 수 없음',
          sources: a.sourceGuideIds.map((gid) => {
            const g = ix.guideById.get(gid);
            return { id: gid, label: g ? `${GUIDE_SECTION_LABEL[g.section]}${g.isOfficial ? '(공식)' : ''}` : '삭제된 항목' };
          }),
        }));
      return {
        id: q.id, rangeId: q.rangeId, body: q.body, createdAt: q.createdAt, authorLabel: authorLabel(c, q.authorId, rangeId),
        answers, waitingForHuman: !answers.some((a) => !a.isAi),
      };
    });
}

/* ───────────────────────── 홈·사례 ───────────────────────── */

export function bestPracticeView(c: Ctx, b: Dataset['bestPractices'][number]): BestPracticeView {
  const rangeName = b.rangeId ? indexOf(c.ds).rangeById.get(b.rangeId)?.name ?? null : null;
  const isPolicy = b.basis === 'POLICY_RECOMMENDATION';
  return {
    id: b.id, rangeId: b.rangeId, rangeName, category: b.category, title: b.title, before: b.before, after: b.after,
    completedAt: b.completedAt, sourceLabel: rangeName ?? b.basisLabel ?? '정책 권고', date: b.completedAt ?? b.recommendedAt ?? null, isPolicy,
  };
}

/** 개선 사례: 훈련장 현장 사례(최근 완료 순) 먼저, 그다음 정책 권고 */
export function getBestPractices(c: Ctx, limit = 6): BestPracticeView[] {
  const key = (b: Dataset['bestPractices'][number]) => `${b.rangeId ? 1 : 0}|${b.completedAt ?? b.recommendedAt ?? ''}`;
  return c.ds.bestPractices.slice().sort((a, b) => key(b).localeCompare(key(a))).slice(0, limit).map((b) => bestPracticeView(c, b));
}

export function getHomeStats(c: Ctx): HomeStats {
  const now = nowOf(c);
  const m = monthKey(now);
  const visible = c.ds.proposals.filter((p) => p.state === 'VISIBLE');
  return {
    proposalsThisMonth: visible.filter((p) => monthKey(p.createdAt) === m).length,
    doneCount: visible.filter((p) => p.status === 'DONE').length,
    avgProcessingDays: processingDays(c, visible),
    rangeCount: c.ds.ranges.length,
    reviewCount: c.ds.reviews.length,
  };
}

/* ───────────────────────── 사용자 ───────────────────────── */

export function buildViewer(ds: Dataset, userId: string): Viewer | null {
  const ix = indexOf(ds);
  const u = ix.userById.get(userId);
  if (!u) return null;
  return {
    id: u.id, role: u.role, nickname: u.nickname, managedRangeId: u.managedRangeId ?? null,
    managedRangeName: u.managedRangeId ? ix.rangeById.get(u.managedRangeId)?.name ?? null : null,
    records: ds.records.filter((r) => r.userId === u.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .map((r) => ({ id: r.id, rangeId: r.rangeId, rangeName: ix.rangeById.get(r.rangeId)?.name ?? '', trainingType: r.trainingType, completedAt: r.completedAt, reviewed: ds.reviews.some((v) => v.recordId === r.id) })),
  };
}

/* ───────────────────────── 오류 ───────────────────────── */

export class AppError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string, public readonly details?: unknown) { super(message); }
}
export class NotFoundError extends AppError { constructor(m: string) { super(m, 404, 'NOT_FOUND'); } }
export class ForbiddenError extends AppError { constructor(m: string) { super(m, 403, 'FORBIDDEN'); } }
export class BlockedError extends AppError {
  constructor(public readonly reasons: string[]) { super(`보안 검사에서 차단되었습니다: ${reasons.join(', ')}`, 422, 'BLOCKED', { reasons }); }
}
export class ValidationError extends AppError { constructor(m: string) { super(m, 400, 'INVALID'); } }
