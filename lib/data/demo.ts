'use client';
/**
 * 시연 모드 DataSource (명세 §5.1)
 * - 시드 JSON을 메모리 store(zustand)에 올리고, 쓰기는 store를 바꾼 뒤 변경분만 localStorage에 저장합니다.
 * - localStorage 접근은 모두 try/catch. 막혀 있어도 메모리로 계속 동작합니다.
 * - AI 대책은 사전 생성 캐시를 쓰고, 마스킹은 브라우저에서 같은 TS 코드로 실행합니다.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import { applyChanges, askQuestion, answerQuestion, createGuideEntry, createProposal, createReview, decideSolution, markHelpful, postOfficialReply, recordSolution, report, toggleEmpathy, updateProposalStatus, type Change, type MutationCtx, type MutationResult } from '../core/mutations';
import * as Q from '../core/queries';
import { buildSolutionFlowInput } from '../core/ai';
import { shiftDataset } from '../core/dataset';
import { cacheProvider, loadCachedSolution, NoCacheError } from '../llm/cache';
import { runSolutionFlow } from '../llm/flow';
import { maskText } from '../masking';
import type { Dataset, Role, Viewer } from '../types';
import { seedDataset } from './seed';
import { notifyDataChanged } from './events';
import { DataError, type DataSource } from './types';

const LS_CHANGES = 'milaind-demo-changes-v1';
const LS_ROLE = 'milaind-demo-role';

/** 역할 전환 드롭다운 → 시드 계정 (명세 §9: 예비군은 "A훈련장, 7일 전 이수" 고정) */
export const DEMO_ROLE_USER: Record<Role, string> = {
  RESERVIST: 'u-demo',
  RANGE_MANAGER: 'mgr-a',
  POLICY_ADMIN: 'policy-1',
};

function lsGet(key: string): string | null {
  try { return typeof window === 'undefined' ? null : window.localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value);
  } catch { /* 저장 불가 환경: 메모리로만 동작 */ }
}

interface DemoState { ds: Dataset; changes: Change[]; role: Role }

function initialState(): DemoState {
  const base = shiftDataset(seedDataset());
  let changes: Change[] = [];
  try { changes = JSON.parse(lsGet(LS_CHANGES) ?? '[]') as Change[]; } catch { changes = []; }
  let ds = base;
  try { ds = applyChanges(base, changes); } catch { changes = []; ds = base; }
  const savedRole = lsGet(LS_ROLE) as Role | null;
  const role: Role = savedRole && savedRole in DEMO_ROLE_USER ? savedRole : 'RESERVIST';
  return { ds, changes, role };
}

let store: StoreApi<DemoState> | null = null;
function getStore(): StoreApi<DemoState> {
  if (!store) store = createStore<DemoState>(() => initialState());
  return store;
}

let seq = 0;
const newId = (prefix: string) => `${prefix}-d${Date.now().toString(36)}${(++seq).toString(36)}`;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ctx(): MutationCtx {
  const { ds, role } = getStore().getState();
  return { ds, viewer: Q.buildViewer(ds, DEMO_ROLE_USER[role]), newId };
}

/** 쓰기 공통: 규칙 검사 → store 반영 → 변경분 저장 → 화면 갱신 */
function commit<T>(fn: (c: MutationCtx) => MutationResult<T>): T {
  const c = ctx();
  const r = wrap(() => fn(c));
  if (r.changes.length) {
    const s = getStore().getState();
    const changes = [...s.changes, ...r.changes];
    getStore().setState({ ds: applyChanges(s.ds, r.changes), changes });
    lsSet(LS_CHANGES, JSON.stringify(changes));
    notifyDataChanged();
  }
  return r.result;
}

function wrap<T>(fn: () => T): T {
  try { return fn(); } catch (e) {
    if (e instanceof Q.BlockedError) throw new DataError(e.message, 422, 'BLOCKED', e.reasons);
    if (e instanceof Q.AppError) throw new DataError(e.message, e.status, e.code);
    throw e;
  }
}
const read = <T,>(fn: (c: Q.Ctx) => T): Promise<T> => Promise.resolve().then(() => wrap(() => fn(ctx())));

export const demoDataSource: DataSource = {
  mode: 'demo',

  getViewer: () => read((c) => c.viewer),
  async switchRole(role) {
    getStore().setState({ role });
    lsSet(LS_ROLE, role);
    notifyDataChanged();
    return ctx().viewer as Viewer;
  },

  listRanges: (f) => read((c) => Q.listRanges(c, f)),
  getRange: (id) => read((c) => Q.getRange(c, id)),

  listReviews: (id, page) => read((c) => Q.listReviews(c, id, page)),
  getReviewEligibility: (id) => read((c) => Q.reviewEligibility(c, id)),
  async createReview(input) {
    const row = commit((c) => createReview(c, input));
    return read((c) => Q.listReviews(c, row.rangeId).items.find((r) => r.id === row.id)!);
  },

  listProposals: (q) => read((c) => Q.listProposals(c, q)),
  getProposal: (id) => read((c) => Q.getProposal(c, id)),
  findSimilarProposals: (rangeId, text, category) => read((c) => Q.similarProposals(c, rangeId, text, category)),
  async createProposal(input) {
    const row = commit((c) => createProposal(c, input));
    return read((c) => Q.proposalView(c, c.ds.proposals.find((p) => p.id === row.id)!));
  },
  async toggleEmpathy(id) { return commit((c) => toggleEmpathy(c, id)); },

  getTrends: (q) => read((c) => Q.getTrends(c, q)),
  listIssues: (q) => read((c) => Q.listIssues(c, q)),
  getIssue: (id) => read((c) => Q.getIssue(c, id)),
  async requestAiSolution(issueId) {
    const c = ctx();
    if (!Q.canHandleIssue(c, issueId)) throw new DataError('이 이슈의 AI 대책을 볼 권한이 없습니다', 403, 'FORBIDDEN');
    const cached = await loadCachedSolution(issueId);
    if (!cached) throw new DataError('이 이슈는 시연 캐시가 없습니다', 404, 'NO_CACHE');
    await delay(800 + Math.random() * 700);       // "생성 중" 애니메이션이 보이도록
    let flow;
    try { flow = await runSolutionFlow(cacheProvider, buildSolutionFlowInput(c, issueId)); } catch (e) {
      if (e instanceof NoCacheError) throw new DataError(e.message, 404, 'NO_CACHE');
      throw e;
    }
    const row = commit((mc) => recordSolution(mc, {
      issueId, provider: 'cache', maskedRequest: flow.maskedRequest, solution: flow.solution,
      generatedAt: cached.generatedAt, reviewed: cached.reviewed, audits: flow.audits,
    }));
    return read((rc) => Q.solutionView(rc, rc.ds.solutions.find((s) => s.id === row.id)!, { blockedCount: flow.blockedCount }));
  },
  async decideAiSolution(id, d) {
    const row = commit((c) => decideSolution(c, id, d));
    return read((c) => Q.solutionView(c, c.ds.solutions.find((s) => s.id === row.id)!));
  },

  async updateProposalStatus(id, to, note) {
    commit((c) => updateProposalStatus(c, id, to, note));
    return read((c) => Q.getProposal(c, id));
  },
  async postOfficialReply(target, body) { commit((c) => postOfficialReply(c, target, body)); },
  getDashboard: () => read((c) => Q.getDashboard(c)),
  listMaskingAudit: (page, blockedOnly) => read((c) => Q.listMaskingAudit(c, page, blockedOnly)),

  listGuide: (id) => read((c) => Q.listGuide(c, id)),
  async createGuideEntry(input) {
    const row = commit((c) => createGuideEntry(c, input));
    return read((c) => Q.listGuide(c, input.rangeId).find((g) => g.id === row.id)!);
  },
  async markHelpful(id) { commit((c) => markHelpful(c, id)); },
  listQuestions: (id) => read((c) => Q.listQuestions(c, id)),
  async askQuestion(rangeId, body) {
    const q = commit((c) => askQuestion(c, rangeId, body));
    return read((c) => Q.listQuestions(c, rangeId).find((x) => x.id === q.id)!);
  },
  async answerQuestion(questionId, body) { commit((c) => answerQuestion(c, questionId, body)); },

  async report(t, id, reason) { return commit((c) => report(c, t, id, reason)); },
  getBestPractices: (limit) => read((c) => Q.getBestPractices(c, limit)),
  getHomeStats: () => read((c) => Q.getHomeStats(c)),
  async maskCheck(text) {
    const r = maskText(text);
    return { masked: r.masked, entities: r.entities, blocked: r.blocked, blockReasons: r.blockReasons };
  },

  async resetDemo() {
    lsSet(LS_CHANGES, null);
    try {
      if (typeof window !== 'undefined') {
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('milaind-checklist-')) window.localStorage.removeItem(k);
        }
      }
    } catch { /* 무시 */ }
    getStore().setState({ ...initialState(), changes: [] });
    notifyDataChanged();
  },
};

/** 테스트용: store를 새 데이터로 교체 */
export function __resetDemoStoreForTest(ds?: Dataset, role: Role = 'RESERVIST') {
  store = createStore<DemoState>(() => ({ ds: ds ?? shiftDataset(seedDataset()), changes: [], role }));
}
