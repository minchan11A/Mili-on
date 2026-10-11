import type {
  AiDecisionInput, AiSolutionView, AnalysisQuery, BestPracticeView, Category, DashboardData, GuideInput, GuideView, HomeStats, IssueDetail,
  IssueQuery, IssueView, MaskCheckView, MaskingAuditView, Page, ProposalDetail, ProposalInput, ProposalQuery, ProposalStatus,
  ProposalAnalysis, ProposalView, QuestionView, RangeDetail, RangeFilter, RangeSummary, ReplyTarget, ReportTargetType, ReviewInput, ReviewView,
  Role, TrendData, TrendQuery, Viewer,
} from '../types';

/** 화면은 이 인터페이스만 부릅니다. 모드에 따라 구현체가 바뀝니다. (명세 §5.1) */
export interface DataSource {
  readonly mode: 'demo' | 'server';

  // 사용자
  getViewer(): Promise<Viewer | null>;
  /** 시연: 역할 전환 / 서버: 로그인 */
  switchRole?(role: Role): Promise<Viewer | null>;
  login?(loginId: string, password: string): Promise<Viewer>;
  /** Supabase 액세스 토큰 → 앱 세션 (처음이면 예비군 계정 생성) */
  loginWithSupabase?(accessToken: string, profile?: { nickname?: string; ageBand?: string }): Promise<Viewer>;
  logout?(): Promise<void>;

  // 훈련장·지도
  listRanges(filter?: RangeFilter): Promise<RangeSummary[]>;
  getRange(rangeId: string): Promise<RangeDetail>;

  // 만족도
  listReviews(rangeId: string, page?: number): Promise<Page<ReviewView>>;
  getReviewEligibility(rangeId: string): Promise<{ eligible: boolean; recordId?: string; reason?: string; canSelfReport?: boolean }>;
  createReview(input: ReviewInput): Promise<ReviewView>;

  // 개선 제안
  listProposals(q: ProposalQuery): Promise<Page<ProposalView>>;
  getProposal(id: string): Promise<ProposalDetail>;
  findSimilarProposals(rangeId: string, text: string, category?: Category): Promise<ProposalView[]>;
  createProposal(input: ProposalInput): Promise<ProposalView>;
  toggleEmpathy(proposalId: string): Promise<{ empathized: boolean; count: number }>;

  // 동향·AI
  getTrends(q: TrendQuery): Promise<TrendData>;
  listIssues(q: IssueQuery): Promise<IssueView[]>;
  getIssue(id: string): Promise<IssueDetail>;
  requestAiSolution(issueId: string): Promise<AiSolutionView>;
  decideAiSolution(id: string, d: AiDecisionInput): Promise<AiSolutionView>;

  // 담당자
  updateProposalStatus(id: string, to: ProposalStatus, note?: string): Promise<ProposalDetail>;
  postOfficialReply(target: ReplyTarget, body: string): Promise<void>;
  getDashboard(): Promise<DashboardData>;
  getProposalAnalysis(q: AnalysisQuery): Promise<ProposalAnalysis>;
  listMaskingAudit(page?: number, blockedOnly?: boolean): Promise<Page<MaskingAuditView>>;

  // 가이드·Q&A
  listGuide(rangeId: string): Promise<GuideView[]>;
  createGuideEntry(input: GuideInput): Promise<GuideView>;
  markHelpful(guideId: string): Promise<void>;
  listQuestions(rangeId: string): Promise<QuestionView[]>;
  askQuestion(rangeId: string, body: string): Promise<QuestionView>;
  answerQuestion(questionId: string, body: string): Promise<void>;

  // 공통
  report(targetType: ReportTargetType, targetId: string, reason: string): Promise<{ hidden: boolean }>;
  getBestPractices(limit?: number): Promise<BestPracticeView[]>;
  getHomeStats(): Promise<HomeStats>;
  /** 보안 마스킹 체험 (시연: 브라우저, 서버: /api/masking/check) */
  maskCheck(text: string): Promise<MaskCheckView>;

  /** 시연 데이터 초기화 (시연 모드 전용) */
  resetDemo?(): Promise<void>;
}

export class DataError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string, public readonly reasons?: string[]) { super(message); }
}
