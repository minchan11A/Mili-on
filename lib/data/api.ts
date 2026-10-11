'use client';
/**
 * 서버 모드 DataSource: §7의 API를 fetch로 부르는 얇은 래퍼 (명세 §5.1)
 */
import { notifyDataChanged } from './events';
import { DataError, type DataSource } from './types';

type Query = Record<string, string | number | boolean | undefined | null>;

function qs(q?: Query): string {
  if (!q) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function call<T>(method: string, path: string, body?: unknown, write = method !== 'GET'): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data ?? {}) as { message?: string; code?: string; reasons?: string[] };
    throw new DataError(err.message ?? `요청 실패 (${res.status})`, res.status, err.code ?? 'ERROR', err.reasons);
  }
  if (write) notifyDataChanged();
  return data as T;
}

const get = <T,>(path: string, q?: Query) => call<T>('GET', `${path}${qs(q)}`);

export const apiDataSource: DataSource = {
  mode: 'server',

  getViewer: () => get('/me'),
  login: (loginId, password) => call('POST', '/auth/login', { loginId, password }),
  loginWithSupabase: (accessToken, profile) => call('POST', '/auth/supabase', { accessToken, ...profile }),
  async logout() {
    await call('POST', '/auth/logout', {});
    const { SUPABASE_ENABLED, getSupabase } = await import('../supabase/client');
    if (SUPABASE_ENABLED) await (await getSupabase()).auth.signOut().catch(() => {});
  },

  listRanges: (f) => get('/ranges', f as Query),
  getRange: (id) => get(`/ranges/${encodeURIComponent(id)}`),

  listReviews: (id, page) => get(`/ranges/${encodeURIComponent(id)}/reviews`, { page }),
  getReviewEligibility: (id) => get(`/ranges/${encodeURIComponent(id)}/review-eligibility`),
  createReview: (input) => call('POST', '/reviews', input),

  listProposals: (q) => get('/proposals', q as Query),
  getProposal: (id) => get(`/proposals/${encodeURIComponent(id)}`),
  findSimilarProposals: (rangeId, text, category) => call('POST', '/proposals/similar', { rangeId, text, category }, false),
  createProposal: (input) => call('POST', '/proposals', input),
  toggleEmpathy: (id) => call('POST', `/proposals/${encodeURIComponent(id)}/empathy`, {}),

  getTrends: (q) => get('/trends', q as Query),
  listIssues: (q) => get('/issues', q as Query),
  getIssue: (id) => get(`/issues/${encodeURIComponent(id)}`),
  requestAiSolution: (id) => call('POST', `/issues/${encodeURIComponent(id)}/solution`, {}),
  decideAiSolution: (id, d) => call('PATCH', `/solutions/${encodeURIComponent(id)}`, d),

  updateProposalStatus: (id, to, note) => call('PATCH', `/proposals/${encodeURIComponent(id)}/status`, { to, note }),
  postOfficialReply: (target, body) => call('POST', '/replies', { target, body }),
  getDashboard: () => get('/dashboard'),
  getProposalAnalysis: (q) => get('/analysis', q as Query),
  listMaskingAudit: (page, blockedOnly) => get('/audit', { page, blocked: blockedOnly ? 1 : undefined }),

  listGuide: (id) => get(`/ranges/${encodeURIComponent(id)}/guide`),
  createGuideEntry: (input) => call('POST', '/guide', input),
  markHelpful: (id) => call('POST', `/guide/${encodeURIComponent(id)}/helpful`, {}),
  listQuestions: (id) => get(`/ranges/${encodeURIComponent(id)}/questions`),
  askQuestion: (rangeId, body) => call('POST', '/questions', { rangeId, body }),
  answerQuestion: (questionId, body) => call('POST', `/questions/${encodeURIComponent(questionId)}/answers`, { body }),

  report: (targetType, targetId, reason) => call('POST', '/reports', { targetType, targetId, reason }),
  getBestPractices: (limit) => get('/best-practices', { limit }),
  getHomeStats: () => get('/home'),
  maskCheck: (text) => call('POST', '/masking/check', { text }, false),
};
