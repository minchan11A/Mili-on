/**
 * 쓰기 규칙 (두 모드 공용, 순수 함수).
 * 각 함수는 Dataset을 직접 바꾸지 않고 "변경 목록(Change[])"을 돌려줍니다.
 *  - 시연 모드: applyChanges로 메모리 store에 반영 + localStorage에 변경분 저장
 *  - 서버 모드: lib/server/persist.ts가 같은 변경 목록을 Prisma로 DB에 반영
 * 권한·자격·보안 검사(차단, 마스킹)는 모두 여기서 합니다. 서버는 클라이언트를 믿지 않고 이 검사를 다시 거칩니다.
 */
import { AUTO_HIDE_REPORTS, RANGE_TRAINING_TYPES, REVIEW_WINDOW_DAYS, SUBTOPICS, type ScoreKey } from '../constants';
import { isCompleteAnswers, MESSAGE_MAX, scoresFromAnswers, SURVEY_QUESTIONS } from '../survey';
import { countEntities, maskText, toStorableText } from '../masking';
import { guessSubtopic, sentimentOf } from '../analysis/classify';
import { isSafetyText } from '../analysis/priority';
import { answerFromGuides } from '../llm/qna';
import type {
  AiDecisionInput, AiSolutionRec, AnswerRec, Category, Dataset, EmpathyRec, GuideInput, GuideRec, IssueRec, MaskingAuditRec,
  OfficialReplyRec, ProposalInput, ProposalRec, ProposalStatus, QuestionRec, ReplyTarget, ReportRec, ReportTargetType,
  ReviewInput, ReviewRec, Solution, StatusHistoryRec, TrainingRecordRec, Viewer,
} from '../types';
import { BlockedError, ForbiddenError, NotFoundError, ValidationError, canHandleIssue, reviewEligibility, type Ctx } from './queries';

export type TableName = keyof Dataset;
export type Change =
  | { op: 'upsert'; table: TableName; row: Record<string, unknown> & { id?: string } }
  | { op: 'delete'; table: TableName; match: Record<string, string> };

export interface MutationCtx extends Ctx { newId: (prefix: string) => string }

export interface MutationResult<T> { changes: Change[]; result: T }

const up = (table: TableName, row: object): Change => ({ op: 'upsert', table, row: row as Record<string, unknown> });

function rowKey(table: TableName, row: Record<string, unknown>): string {
  if (table === 'empathies') return `${row.userId}|${row.proposalId}`;
  return String(row.id);
}

/** 변경 목록을 Dataset에 반영한 새 Dataset (바뀐 테이블만 새 배열) */
export function applyChanges(ds: Dataset, changes: Change[]): Dataset {
  const out: Dataset = { ...ds };
  for (const ch of changes) {
    const list = [...(out[ch.table] as unknown as Array<Record<string, unknown>>)];
    if (ch.op === 'upsert') {
      const key = rowKey(ch.table, ch.row);
      const i = list.findIndex((r) => rowKey(ch.table, r) === key);
      if (i >= 0) list[i] = { ...list[i], ...ch.row }; else list.push(ch.row);
    } else {
      const idx = list.findIndex((r) => Object.entries(ch.match).every(([k, v]) => r[k] === v));
      if (idx >= 0) list.splice(idx, 1);
    }
    (out as unknown as Record<string, unknown>)[ch.table] = list;
  }
  return out;
}

/* ───────────────────────── 공통 검사 ───────────────────────── */

const nowIso = (c: Ctx) => (c.now ?? new Date()).toISOString();

function requireRole(v: Viewer | null, ...roles: Viewer['role'][]): Viewer {
  if (!v) throw new ForbiddenError('로그인이 필요합니다');
  if (!roles.includes(v.role)) throw new ForbiddenError('이 작업을 할 권한이 없습니다');
  return v;
}

/** 담당자: 자기 훈련장만, 정책 담당자: 전체 */
function requireRangeAuthority(v: Viewer | null, rangeId: string): Viewer {
  const u = requireRole(v, 'RANGE_MANAGER', 'POLICY_ADMIN');
  if (u.role === 'RANGE_MANAGER' && u.managedRangeId !== rangeId) throw new ForbiddenError('자기 훈련장 건만 처리할 수 있습니다');
  return u;
}

/** 저장용 본문: 차단이면 422, 아니면 번호 없는 토큰으로 가린 본문 */
function storable(text: string, maxLen: number, field: string): string {
  const t = (text ?? '').trim();
  if (!t) throw new ValidationError(`${field}을(를) 입력해 주세요`);
  if (t.length > maxLen) throw new ValidationError(`${field}은(는) ${maxLen}자 이내로 써 주세요`);
  const r = toStorableText(t);
  if (!r.ok) throw new BlockedError(r.reasons);
  return r.text;
}

/* ───────────────────────── 만족도 평가 ───────────────────────── */

export function createReview(c: MutationCtx, input: ReviewInput): MutationResult<ReviewRec> {
  const v = requireRole(c.viewer, 'RESERVIST');
  const range = c.ds.ranges.find((r) => r.id === input.rangeId);
  if (!range) throw new NotFoundError('훈련장을 찾을 수 없습니다');
  const changes: Change[] = [];
  let recordId = input.recordId;

  if (recordId) {
    const el = reviewEligibility(c, input.rangeId);
    if (!el.eligible || el.recordId !== recordId) throw new ValidationError(el.reason ?? '평가할 수 없는 이수 기록입니다');
  } else {
    // 이수 기록이 없는 사용자(가입 사용자)는 설문에서 훈련 정보를 직접 입력 → 본인 입력 기록으로 저장
    const sr = input.selfReport;
    if (!sr) throw new ValidationError('훈련 정보를 입력해 주세요');
    if (!RANGE_TRAINING_TYPES[range.type].includes(sr.trainingType)) throw new ValidationError('이 훈련장에서 받을 수 없는 훈련 유형입니다');
    const done = new Date(sr.completedAt);
    const age = ((c.now ?? new Date()).getTime() - done.getTime()) / 86_400_000;
    if (Number.isNaN(age) || age < -0.5) throw new ValidationError('훈련 날짜를 확인해 주세요');
    if (age > REVIEW_WINDOW_DAYS + 1) throw new ValidationError(`평가 기간(${REVIEW_WINDOW_DAYS}일)이 지났습니다`);
    const day = sr.completedAt.slice(0, 10);
    const same = c.ds.records.find((r) => r.userId === v.id && r.rangeId === range.id && r.completedAt.slice(0, 10) === day);
    if (same && c.ds.reviews.some((r) => r.recordId === same.id)) throw new ValidationError('이미 평가했습니다');
    if (same) recordId = same.id;
    else {
      const rec: TrainingRecordRec = { id: c.newId('rec'), userId: v.id, rangeId: range.id, trainingType: sr.trainingType, completedAt: done.toISOString(), selfReported: true };
      changes.push(up('records', rec));
      recordId = rec.id;
    }
  }

  let scores: Record<ScoreKey, number>;
  let answers: Record<string, number> | null = null;
  if (input.answers) {
    if (!isCompleteAnswers(input.answers)) throw new ValidationError('모든 문항에 답해 주세요');
    answers = Object.fromEntries(SURVEY_QUESTIONS.map((q) => [q.id, input.answers![q.id]]));
    scores = scoresFromAnswers(answers);
  } else {
    scores = { scoreTransport: input.scoreTransport!, scoreMeal: input.scoreMeal!, scoreFacility: input.scoreFacility!, scoreOperation: input.scoreOperation!, scoreComm: input.scoreComm! };
    if (Object.values(scores).some((x) => !Number.isInteger(x) || x < 1 || x > 5)) throw new ValidationError('모든 지표를 1~5점으로 매겨 주세요');
  }
  const comment = input.comment?.trim() ? storable(input.comment, MESSAGE_MAX, '다른 예비군에게 전하고 싶은 말') : null;
  const row: ReviewRec = {
    id: c.newId('rev'), userId: v.id, rangeId: input.rangeId, recordId: recordId!, ...scores, answers,
    comment, state: 'VISIBLE', createdAt: nowIso(c),
  };
  changes.push(up('reviews', row));
  return { changes, result: row };
}

/* ───────────────────────── 개선 제안 ───────────────────────── */

/** (category, subtopic) 이슈 찾기. 없으면 새로 만듦 (서버 모드 MVP 묶음 규칙) */
function issueFor(c: MutationCtx, category: Category, subtopic: string, changes: Change[], text: string): string | null {
  const existing = c.ds.issues.find((i) => i.category === category && i.subtopic === subtopic);
  if (existing) {
    if (!existing.isSafety && isSafetyText(text)) changes.push(up('issues', { ...existing, isSafety: true, updatedAt: nowIso(c) }));
    return existing.id;
  }
  if (!SUBTOPICS[category]?.includes(subtopic)) return null;
  const row: IssueRec = { id: c.newId('ISS'), category, subtopic, title: subtopic, summary: null, priorityScore: 0, isSafety: isSafetyText(subtopic, text), updatedAt: nowIso(c) };
  changes.push(up('issues', row));
  return row.id;
}

export function createProposal(c: MutationCtx, input: ProposalInput): MutationResult<ProposalRec> {
  const v = requireRole(c.viewer, 'RESERVIST');
  if (!c.ds.ranges.some((r) => r.id === input.rangeId)) throw new NotFoundError('훈련장을 찾을 수 없습니다');
  if (!SUBTOPICS[input.category]) throw new ValidationError('카테고리를 선택해 주세요');
  const title = storable(input.title, 50, '제목');
  const body = storable(input.body, 1000, '내용');
  const raw = `${input.title} ${input.body}`;
  const subtopic = input.subtopic && input.subtopic !== '기타' && SUBTOPICS[input.category].includes(input.subtopic)
    ? input.subtopic : guessSubtopic(input.category, raw);
  const changes: Change[] = [];
  const issueId = issueFor(c, input.category, subtopic, changes, raw);
  const now = nowIso(c);
  const row: ProposalRec = {
    id: c.newId('p'), rangeId: input.rangeId, authorId: v.id, category: input.category, subtopic, title, body,
    status: 'RECEIVED', sentiment: sentimentOf(raw), issueId, state: 'VISIBLE', createdAt: now, updatedAt: now,
  };
  const hist: StatusHistoryRec = { id: c.newId('h'), proposalId: row.id, from: null, to: 'RECEIVED', note: null, actorId: v.id, createdAt: now };
  changes.push(up('proposals', row), up('history', hist));
  return { changes, result: row };
}

export function toggleEmpathy(c: MutationCtx, proposalId: string): MutationResult<{ empathized: boolean; count: number }> {
  const v = requireRole(c.viewer, 'RESERVIST');
  const p = c.ds.proposals.find((x) => x.id === proposalId);
  if (!p) throw new NotFoundError('제안을 찾을 수 없습니다');
  if (p.authorId === v.id) throw new ValidationError('내 제안에는 공감할 수 없습니다');
  const has = c.ds.empathies.some((e) => e.userId === v.id && e.proposalId === proposalId);
  const count = c.ds.empathies.filter((e) => e.proposalId === proposalId).length + (has ? -1 : 1);
  if (has) return { changes: [{ op: 'delete', table: 'empathies', match: { userId: v.id, proposalId } }], result: { empathized: false, count } };
  const row: EmpathyRec = { userId: v.id, proposalId, createdAt: nowIso(c) };
  return { changes: [up('empathies', row)], result: { empathized: true, count } };
}

/* ───────────────────────── 담당자 처리 ───────────────────────── */

export function updateProposalStatus(c: MutationCtx, id: string, to: ProposalStatus, note?: string): MutationResult<ProposalRec> {
  const p = c.ds.proposals.find((x) => x.id === id);
  if (!p) throw new NotFoundError('제안을 찾을 수 없습니다');
  const v = requireRangeAuthority(c.viewer, p.rangeId);
  if (!note?.trim()) throw new ValidationError('상태 변경 메모를 입력해 주세요');
  const now = nowIso(c);
  const memo = storable(note, 300, '메모');
  if (p.status === to) return { changes: [], result: p };
  const row: ProposalRec = { ...p, status: to, updatedAt: now };
  const hist: StatusHistoryRec = { id: c.newId('h'), proposalId: p.id, from: p.status, to, note: memo, actorId: v.id, createdAt: now };
  return { changes: [up('proposals', row), up('history', hist)], result: row };
}

export function postOfficialReply(c: MutationCtx, target: ReplyTarget, body: string): MutationResult<OfficialReplyRec> {
  const rangeId = target.type === 'PROPOSAL'
    ? c.ds.proposals.find((p) => p.id === target.id)?.rangeId
    : c.ds.reviews.find((r) => r.id === target.id)?.rangeId;
  if (!rangeId) throw new NotFoundError('답변할 대상을 찾을 수 없습니다');
  const v = requireRangeAuthority(c.viewer, rangeId);
  const text = storable(body, 1000, '공식 답변');
  const existing = c.ds.replies.find((r) => r.targetType === target.type && r.targetId === target.id);
  const row: OfficialReplyRec = { id: existing?.id ?? c.newId('rp'), targetType: target.type, targetId: target.id, authorId: v.id, body: text, createdAt: nowIso(c) };
  return { changes: [up('replies', row)], result: row };
}

/* ───────────────────────── AI 대책 ───────────────────────── */

export interface NewSolution {
  issueId: string; provider: string; maskedRequest: string; solution: Solution;
  generatedAt?: string | null; reviewed?: boolean;
  audits: Array<Omit<MaskingAuditRec, 'id' | 'createdAt'>>;
}

export function recordSolution(c: MutationCtx, s: NewSolution): MutationResult<AiSolutionRec> {
  if (!canHandleIssue(c, s.issueId)) throw new ForbiddenError('이 이슈의 AI 대책을 다룰 권한이 없습니다');
  const now = nowIso(c);
  const row: AiSolutionRec = {
    id: c.newId('sol'), issueId: s.issueId, provider: s.provider, maskedRequest: s.maskedRequest, responseJson: s.solution,
    editedJson: null, decision: 'PENDING', decidedById: null, decidedAt: null, createdAt: now,
    generatedAt: s.generatedAt ?? null, reviewed: s.reviewed,
  };
  const changes: Change[] = [up('solutions', row)];
  for (const a of s.audits) changes.push(up('audits', { ...a, id: c.newId('au'), createdAt: now }));
  return { changes, result: row };
}

export function decideSolution(c: MutationCtx, id: string, d: AiDecisionInput): MutationResult<AiSolutionRec> {
  const s = c.ds.solutions.find((x) => x.id === id);
  if (!s) throw new NotFoundError('AI 대책을 찾을 수 없습니다');
  const v = c.viewer;
  if (!canHandleIssue(c, s.issueId)) throw new ForbiddenError('이 이슈의 AI 대책을 다룰 권한이 없습니다');
  if (d.decision === 'ADOPTED_EDITED' && !d.edited) throw new ValidationError('수정한 내용을 함께 보내 주세요');
  const now = nowIso(c);
  const row: AiSolutionRec = {
    ...s, decision: d.decision, editedJson: d.decision === 'ADOPTED_EDITED' ? d.edited ?? null : null, decidedById: v!.id, decidedAt: now,
  };
  const changes: Change[] = [up('solutions', row)];
  let ds = c.ds;
  if (d.decision !== 'REJECTED' && (d.bulkStatus || d.replyBody?.trim())) {
    // 관련 제안 일괄 처리: 권한 범위(담당자는 자기 훈련장) 안의, 아직 끝나지 않은 제안만
    const targets = c.ds.proposals.filter((p) => p.issueId === s.issueId && p.status !== 'DONE' && p.status !== 'LONG_TERM' &&
      (v!.role === 'POLICY_ADMIN' || p.rangeId === v!.managedRangeId));
    for (const p of targets) {
      const ctx: MutationCtx = { ...c, ds };
      if (d.bulkStatus && p.status !== d.bulkStatus) {
        const r = updateProposalStatus(ctx, p.id, d.bulkStatus, d.bulkNote?.trim() || 'AI 대책 초안을 검토해 조치 계획을 세웠습니다.');
        changes.push(...r.changes);
        ds = applyChanges(ds, r.changes);
      }
      if (d.replyBody?.trim()) {
        const r = postOfficialReply({ ...c, ds }, { type: 'PROPOSAL', id: p.id }, d.replyBody);
        changes.push(...r.changes);
        ds = applyChanges(ds, r.changes);
      }
    }
  }
  return { changes, result: row };
}

/* ───────────────────────── 가이드·Q&A ───────────────────────── */

export function createGuideEntry(c: MutationCtx, input: GuideInput): MutationResult<GuideRec> {
  const v = requireRole(c.viewer, 'RESERVIST', 'RANGE_MANAGER');
  const isOfficial = v.role === 'RANGE_MANAGER';
  if (isOfficial && v.managedRangeId !== input.rangeId) throw new ForbiddenError('자기 훈련장 가이드만 쓸 수 있습니다');
  const row: GuideRec = {
    id: c.newId('g'), rangeId: input.rangeId, section: input.section, body: storable(input.body, 500, '내용'), isOfficial,
    authorId: v.id, helpfulCount: 0, state: 'VISIBLE', createdAt: nowIso(c),
  };
  return { changes: [up('guides', row)], result: row };
}

export function markHelpful(c: MutationCtx, guideId: string): MutationResult<void> {
  requireRole(c.viewer, 'RESERVIST', 'RANGE_MANAGER', 'POLICY_ADMIN');
  const g = c.ds.guides.find((x) => x.id === guideId);
  if (!g) throw new NotFoundError('가이드 항목을 찾을 수 없습니다');
  return { changes: [up('guides', { ...g, helpfulCount: g.helpfulCount + 1 })], result: undefined };
}

export function askQuestion(
  c: MutationCtx, rangeId: string, body: string,
  aiAnswer?: { body: string; sourceGuideIds: string[]; provider: string } | null,
): MutationResult<QuestionRec> {
  const v = requireRole(c.viewer, 'RESERVIST');
  if (!c.ds.ranges.some((r) => r.id === rangeId)) throw new NotFoundError('훈련장을 찾을 수 없습니다');
  const text = storable(body, 300, '질문');
  const now = nowIso(c);
  const q: QuestionRec = { id: c.newId('q'), rangeId, authorId: v.id, body: text, createdAt: now };
  const changes: Change[] = [up('questions', q)];
  // AI 1차 답변: 근거 가이드가 있을 때만 (없으면 "담당자 답변을 기다리는 중")
  const guides = c.ds.guides.filter((g) => g.rangeId === rangeId && g.state === 'VISIBLE');
  const ans = aiAnswer === undefined ? answerFromGuides({ question: text, guides: guides.map((g) => ({ id: g.id, section: g.section, body: g.body })) }) : aiAnswer;
  if (ans && ans.sourceGuideIds.length) {
    const a: AnswerRec = { id: c.newId('a'), questionId: q.id, authorId: null, isAi: true, body: ans.body, sourceGuideIds: ans.sourceGuideIds, createdAt: now };
    changes.push(up('answers', a));
    const masked = maskText(text);
    changes.push(up('audits', {
      id: c.newId('au'), purpose: 'AI_QNA', maskedText: `[질문] ${masked.masked}`, entityCounts: countEntities(masked.entities),
      blocked: false, blockReasons: [], provider: aiAnswer?.provider ?? 'cache', createdAt: now,
    } satisfies MaskingAuditRec));
  }
  return { changes, result: q };
}

export function answerQuestion(c: MutationCtx, questionId: string, body: string): MutationResult<AnswerRec> {
  const v = requireRole(c.viewer, 'RESERVIST', 'RANGE_MANAGER');
  const q = c.ds.questions.find((x) => x.id === questionId);
  if (!q) throw new NotFoundError('질문을 찾을 수 없습니다');
  const a: AnswerRec = { id: c.newId('a'), questionId, authorId: v.id, isAi: false, body: storable(body, 500, '답변'), sourceGuideIds: [], createdAt: nowIso(c) };
  return { changes: [up('answers', a)], result: a };
}

/* ───────────────────────── 신고 ───────────────────────── */

const REPORT_TABLE: Record<ReportTargetType, TableName> = { REVIEW: 'reviews', PROPOSAL: 'proposals', GUIDE: 'guides', ANSWER: 'answers' };

export function report(c: MutationCtx, targetType: ReportTargetType, targetId: string, reason: string): MutationResult<{ hidden: boolean }> {
  const v = requireRole(c.viewer, 'RESERVIST', 'RANGE_MANAGER', 'POLICY_ADMIN');
  const table = REPORT_TABLE[targetType];
  if (!table) throw new ValidationError('신고 대상이 올바르지 않습니다');
  const target = (c.ds[table] as unknown as Array<Record<string, unknown>>).find((r) => r.id === targetId);
  if (!target) throw new NotFoundError('신고할 대상을 찾을 수 없습니다');
  if (c.ds.reports.some((r) => r.targetType === targetType && r.targetId === targetId && r.reporterId === v.id)) {
    throw new ValidationError('이미 신고했습니다');
  }
  const row: ReportRec = { id: c.newId('rep'), targetType, targetId, reporterId: v.id, reason: (reason || '부적절한 내용').slice(0, 200), createdAt: nowIso(c) };
  const changes: Change[] = [up('reports', row)];
  const count = c.ds.reports.filter((r) => r.targetType === targetType && r.targetId === targetId).length + 1;
  const hide = count >= AUTO_HIDE_REPORTS && (target.state ?? 'VISIBLE') === 'VISIBLE';
  if (hide) changes.push(up(table, { ...target, state: 'HIDDEN_BY_REPORTS' }));
  return { changes, result: { hidden: hide } };
}

export function addAudit(c: MutationCtx, a: Omit<MaskingAuditRec, 'id' | 'createdAt'>): Change {
  return up('audits', { ...a, id: c.newId('au'), createdAt: nowIso(c) });
}
