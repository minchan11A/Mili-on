/**
 * 도메인 타입 (두 모드 공용).
 * 화면 코드는 Prisma 타입을 직접 import하지 않고 이 파일만 씁니다. (명세 §4)
 * 날짜는 모두 ISO 문자열입니다.
 */

export type Role = 'RESERVIST' | 'RANGE_MANAGER' | 'POLICY_ADMIN';
export type RangeType = 'MOBILIZATION' | 'REGIONAL';
export type TrainingType = 'MOBILIZATION' | 'MOBILIZATION_NOSTAY' | 'BASIC' | 'FOLLOWUP';
export type Category =
  | 'TRANSPORT' | 'MEAL' | 'FACILITY' | 'OPERATION'
  | 'EQUIPMENT' | 'COMMUNICATION' | 'COMPENSATION' | 'ETC';
export type ProposalStatus = 'RECEIVED' | 'REVIEWING' | 'PLANNED' | 'DONE' | 'LONG_TERM';
export type ContentState = 'VISIBLE' | 'HIDDEN_BY_REPORTS' | 'HIDDEN_BY_ADMIN';
export type AiDecision = 'PENDING' | 'ADOPTED' | 'ADOPTED_EDITED' | 'REJECTED';
export type GuideSection = 'CHECKLIST' | 'TRANSPORT' | 'MEAL' | 'ENTRY' | 'ETC';
export type ReplyTargetType = 'REVIEW' | 'PROPOSAL';
export type ReportTargetType = 'REVIEW' | 'PROPOSAL' | 'GUIDE' | 'ANSWER';
export type Trend = 'up' | 'flat' | 'down';

/* ───────────────────────── 저장 레코드 (시드 JSON = DB 행) ───────────────────────── */

export interface RangeRec {
  id: string; code: string; name: string; type: RangeType;
  sido: string; sigungu: string; lat: number; lng: number;
  description?: string | null; createdAt: string;
}
export interface UserRec {
  id: string; role: Role; nickname: string; ageBand?: string | null;
  loginId: string; managedRangeId?: string | null; createdAt: string;
}
export interface TrainingRecordRec {
  id: string; userId: string; rangeId: string; trainingType: TrainingType; completedAt: string;
}
export interface ReviewRec {
  id: string; userId: string; rangeId: string; recordId: string;
  scoreTransport: number; scoreMeal: number; scoreFacility: number; scoreOperation: number; scoreComm: number;
  comment?: string | null; state: ContentState; createdAt: string;
}
export interface IssueRec {
  id: string; category: Category; subtopic: string; title: string;
  summary?: string | null; priorityScore: number; isSafety: boolean; updatedAt: string;
}
export interface ProposalRec {
  id: string; rangeId: string; authorId: string; category: Category; subtopic?: string | null;
  title: string; body: string; status: ProposalStatus; sentiment?: number | null;
  issueId?: string | null; state: ContentState; createdAt: string; updatedAt: string;
}
export interface EmpathyRec { userId: string; proposalId: string; createdAt: string }
export interface StatusHistoryRec {
  id: string; proposalId: string; from?: ProposalStatus | null; to: ProposalStatus;
  note?: string | null; actorId: string; createdAt: string;
}
export interface OfficialReplyRec {
  id: string; targetType: ReplyTargetType; targetId: string; authorId: string; body: string; createdAt: string;
}
export interface AiSolutionRec {
  id: string; issueId: string; provider: string; maskedRequest: string;
  responseJson: Solution; editedJson?: Solution | null; decision: AiDecision;
  decidedById?: string | null; decidedAt?: string | null; createdAt: string;
  /** 시연 캐시 메타 */
  generatedAt?: string | null; reviewed?: boolean;
}
export interface BestPracticeRec {
  id: string; rangeId: string; category: Category; title: string; before: string; after: string;
  completedAt: string; sourceProposalId?: string | null;
}
export interface GuideRec {
  id: string; rangeId: string; section: GuideSection; body: string; isOfficial: boolean;
  authorId: string; helpfulCount: number; state: ContentState; createdAt: string;
}
export interface QuestionRec { id: string; rangeId: string; authorId: string; body: string; createdAt: string }
export interface AnswerRec {
  id: string; questionId: string; authorId?: string | null; isAi: boolean; body: string;
  sourceGuideIds: string[]; createdAt: string; state?: ContentState;
}
export interface ReportRec {
  id: string; targetType: ReportTargetType; targetId: string; reporterId: string; reason: string; createdAt: string;
}
export interface MaskingAuditRec {
  id: string; purpose: 'AI_SOLUTION' | 'AI_SUMMARY' | 'AI_QNA' | 'MASKING_CHECK';
  maskedText: string; entityCounts: Record<string, number>; blocked: boolean; blockReasons: string[];
  provider: string; createdAt: string;
}

/** 시드 JSON 전체 = 시연 모드 메모리 store = 서버 모드 DB 스냅샷 */
export interface Dataset {
  ranges: RangeRec[];
  users: UserRec[];
  records: TrainingRecordRec[];
  reviews: ReviewRec[];
  issues: IssueRec[];
  proposals: ProposalRec[];
  empathies: EmpathyRec[];
  history: StatusHistoryRec[];
  replies: OfficialReplyRec[];
  solutions: AiSolutionRec[];
  bestPractices: BestPracticeRec[];
  guides: GuideRec[];
  questions: QuestionRec[];
  answers: AnswerRec[];
  reports: ReportRec[];
  audits: MaskingAuditRec[];
}

/* ───────────────────────── AI 대책 ───────────────────────── */

export interface Solution {
  problemSummary: string;
  immediateActions: Array<{ action: string; owner: string; note?: string }>;
  shortTerm: Array<{ action: string; expectedEffect: string }>;
  longTerm: Array<{ task: string; budgetNeeded: boolean; note?: string }>;
  referencedCases: Array<{ bestPracticeId: string; why: string }>;
  needsVerification: string[];
  confidence: 'low' | 'medium' | 'high';
}

/* ───────────────────────── 화면용 뷰 ───────────────────────── */

export interface Page<T> { items: T[]; page: number; pageSize: number; total: number }

export interface Viewer {
  id: string; role: Role; nickname: string; managedRangeId?: string | null;
  managedRangeName?: string | null;
  records: Array<{ id: string; rangeId: string; rangeName: string; trainingType: TrainingType; completedAt: string }>;
}

export type ScoreSet = {
  scoreTransport: number | null; scoreMeal: number | null; scoreFacility: number | null;
  scoreOperation: number | null; scoreComm: number | null;
};

export interface RangeFilter {
  trainingType?: TrainingType | ''; sido?: string; sort?: 'overall' | keyof ScoreSet; q?: string;
}

export interface RangeSummary {
  id: string; code: string; name: string; type: RangeType; sido: string; sigungu: string;
  lat: number; lng: number;
  overall: number | null; scores: ScoreSet; reviewCount: number;
  /** 최근 3개월 평균 - 그 이전 3개월 평균 */
  trendDelta: number | null; trend: Trend;
  openProposalCount: number;
  latestReply?: { body: string; createdAt: string } | null;
}

export interface RangeDetail extends RangeSummary {
  description?: string | null;
  monthly: Array<{ month: string; overall: number | null; count: number }>;
  managerName: string;
}

export interface ReviewView {
  id: string; rangeId: string; authorLabel: string; scores: Record<string, number>; overall: number;
  comment?: string | null; createdAt: string; reply?: { body: string; createdAt: string } | null; hidden: boolean;
}

export interface ReviewInput {
  rangeId: string; recordId: string;
  scoreTransport: number; scoreMeal: number; scoreFacility: number; scoreOperation: number; scoreComm: number;
  comment?: string;
}

export interface ProposalQuery {
  rangeId?: string; status?: ProposalStatus | ''; category?: Category | '';
  sort?: 'empathy' | 'recent' | 'oldest'; page?: number; pageSize?: number;
  issueId?: string; mine?: boolean; empathized?: boolean; managedOnly?: boolean; openOnly?: boolean;
}

export interface ProposalView {
  id: string; rangeId: string; rangeName: string; category: Category; subtopic?: string | null;
  title: string; body: string; status: ProposalStatus; empathyCount: number; empathized: boolean;
  hasReply: boolean; createdAt: string; updatedAt: string; issueId?: string | null;
  authorLabel: string; isMine: boolean; ageDays: number; hidden: boolean;
}

export interface ProposalDetail extends ProposalView {
  history: Array<{ id: string; from?: ProposalStatus | null; to: ProposalStatus; note?: string | null; actorLabel: string; createdAt: string }>;
  reply?: { body: string; createdAt: string; authorLabel: string } | null;
  issueTitle?: string | null;
}

export interface ProposalInput {
  rangeId: string; category: Category; subtopic?: string; title: string; body: string;
}

export interface TrendQuery { months?: 3 | 6 | 12 }
export interface TrendData {
  months: number;
  ranking: Array<{ category: Category; proposals: number; empathies: number }>;
  monthly: Array<{ month: string } & Partial<Record<Category, number>>>;
  topCategories: Category[];
  spikes: Spike[];
}
export interface Spike { category: Category; ratio: number; recentCount: number; recentWeekly: number; baseWeekly: number }

export interface IssueQuery { category?: Category | ''; rangeId?: string; limit?: number }
export interface IssueView {
  id: string; category: Category; subtopic: string; title: string; isSafety: boolean;
  priorityScore: number; proposalCount: number; empathyCount: number; rangeCount: number;
  statusCounts: Partial<Record<ProposalStatus, number>>; avgSentiment: number; recentRatio: number;
  priorityBreakdown: PriorityBreakdown; trend: Trend;
}
export interface PriorityBreakdown {
  volume: number; sentiment: number; safety: number; recency: number; score: number;
  proposals: number; empathies: number;
}
export interface IssueDetail extends IssueView {
  summary?: string | null;
  proposals: ProposalView[];
  byRange: Array<{ rangeId: string; rangeName: string; count: number }>;
  latestSolution?: AiSolutionView | null;
  hasCache: boolean;
}

export interface AiSolutionView {
  id: string; issueId: string; provider: string; maskedRequest: string;
  solution: Solution; edited?: Solution | null; decision: AiDecision;
  decidedAt?: string | null; createdAt: string; generatedAt?: string | null; reviewed?: boolean;
  /** 근거 사례 (id → 카드) */
  cases: BestPracticeView[];
  fromCache: boolean;
  /** 서버 모드에서 키가 없어 캐시로 대체됐을 때 */
  fallbackNotice?: string | null;
  /** 제외된(차단) 제안 수 */
  blockedCount?: number;
}
export interface AiDecisionInput {
  decision: Exclude<AiDecision, 'PENDING'>;
  edited?: Solution;
  /** 채택 시 관련 제안 일괄 상태 변경 */
  bulkStatus?: ProposalStatus;
  bulkNote?: string;
  /** 일괄 공식 답변 */
  replyBody?: string;
}

export type ReplyTarget = { type: ReplyTargetType; id: string };

export interface DashboardData {
  scope: 'range' | 'all'; scopeLabel: string;
  kpi: { open: number; overdue: number; doneThisMonth: number; avgDays: number | null };
  topIssues: IssueView[];
  spikes: Spike[];
  rangeTable?: Array<{ id: string; name: string; sido: string; overall: number | null; delta: number | null; reviewCount: number; open: number }>;
}

export interface MaskingAuditView {
  id: string; purpose: string; maskedText: string; entityCounts: Record<string, number>;
  entityTotal: number; blocked: boolean; blockReasons: string[]; provider: string; createdAt: string;
}

export interface GuideView {
  id: string; rangeId: string; section: GuideSection; body: string; isOfficial: boolean;
  helpfulCount: number; createdAt: string; authorLabel: string; hidden: boolean;
}
export interface GuideInput { rangeId: string; section: GuideSection; body: string }

export interface QuestionView {
  id: string; rangeId: string; body: string; createdAt: string; authorLabel: string;
  answers: Array<{ id: string; isAi: boolean; body: string; sources: Array<{ id: string; label: string }>; createdAt: string; authorLabel: string }>;
  waitingForHuman: boolean;
}

export interface BestPracticeView {
  id: string; rangeId: string; rangeName: string; category: Category; title: string;
  before: string; after: string; completedAt: string;
}

export interface HomeStats {
  proposalsThisMonth: number; doneCount: number; avgProcessingDays: number | null;
  rangeCount: number; reviewCount: number;
}

export interface MaskCheckView {
  masked: string;
  entities: Array<{ type: string; original: string; token: string; start: number; end: number; rule: string }>;
  blocked: boolean; blockReasons: string[];
}
