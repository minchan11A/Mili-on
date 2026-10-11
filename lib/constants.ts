import type { Category, GuideSection, ProposalStatus, TrainingType, RangeType } from './types';

export const CATEGORY_LABEL = {
  TRANSPORT: '교통·접근성', MEAL: '식사·급식', FACILITY: '시설·위생',
  OPERATION: '훈련 운영·대기', EQUIPMENT: '피복·장구', COMMUNICATION: '안내·소통',
  COMPENSATION: '보상·행정', ETC: '기타',
} as const;

export const CATEGORY_ICON: Record<Category, string> = {
  TRANSPORT: '🚌', MEAL: '🍚', FACILITY: '🚻', OPERATION: '⏱️',
  EQUIPMENT: '🎽', COMMUNICATION: '📢', COMPENSATION: '💳', ETC: '💬',
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

export const STATUS_LABEL = {
  RECEIVED: '접수', REVIEWING: '검토 중', PLANNED: '조치 계획 수립',
  DONE: '개선 완료', LONG_TERM: '장기 검토(예산 필요)',
} as const;

export const STATUSES = Object.keys(STATUS_LABEL) as ProposalStatus[];

/** 상태색 고정 (명세 §6.8): 완료 초록, 검토 주황, 접수 회색, 조치 계획 파랑 */
export const STATUS_TONE: Record<ProposalStatus, 'gray' | 'orange' | 'blue' | 'green' | 'purple'> = {
  RECEIVED: 'gray', REVIEWING: 'orange', PLANNED: 'blue', DONE: 'green', LONG_TERM: 'purple',
};

export const SCORE_AXES = [
  { key: 'scoreTransport', label: '교통 접근성' },
  { key: 'scoreMeal',      label: '식사' },
  { key: 'scoreFacility',  label: '시설 청결·편의' },
  { key: 'scoreOperation', label: '훈련 운영' },
  { key: 'scoreComm',      label: '안내·소통' },
] as const;

export type ScoreKey = (typeof SCORE_AXES)[number]['key'];

export const TRAINING_TYPE_LABEL: Record<TrainingType, string> = {
  MOBILIZATION: '동원훈련',
  MOBILIZATION_NOSTAY: '동원미참가자훈련',
  BASIC: '향방기본훈련',
  FOLLOWUP: '향방작계훈련',
};

export const RANGE_TYPE_LABEL: Record<RangeType, string> = {
  MOBILIZATION: '동원훈련장',
  REGIONAL: '지역방위 훈련장',
};

/** 훈련장 유형별로 받을 수 있는 훈련 */
export const RANGE_TRAINING_TYPES: Record<RangeType, TrainingType[]> = {
  MOBILIZATION: ['MOBILIZATION', 'MOBILIZATION_NOSTAY'],
  REGIONAL: ['BASIC', 'FOLLOWUP', 'MOBILIZATION_NOSTAY'],
};

export const GUIDE_SECTION_LABEL: Record<GuideSection, string> = {
  CHECKLIST: '준비물', TRANSPORT: '교통편', MEAL: '식사·매점', ENTRY: '입소 절차', ETC: '기타',
};

export const SUBTOPICS: Record<Category, string[]> = {
  MEAL: ['배식 대기시간', '식사량', '메뉴 다양성', '식당 위생'],
  TRANSPORT: ['셔틀 시간', '셔틀 부족', '주차 공간', '대중교통 안내'],
  FACILITY: ['화장실 청결', '냉난방', '휴게 공간', '탈의 공간'],
  OPERATION: ['대기시간', '일정 지연', '조기 퇴소 기준', '교육 내용'],
  EQUIPMENT: ['피복 사이즈', '피복 위생', '장구 상태'],
  COMMUNICATION: ['사전 안내 부족', '현장 안내', '문의 응대'],
  COMPENSATION: ['훈련비 지급', '교통비', '행정 서류'],
  ETC: ['기타'],
};

export const SIDO_SHORT: Record<string, string> = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천',
  광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종',
  경기도: '경기', 강원도: '강원', 충청북도: '충북', 충청남도: '충남', 전라북도: '전북',
  전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주',
};

export const MIN_REVIEWS_FOR_SCORE = 5;   // 미만이면 "평가 부족"
export const REVIEW_WINDOW_DAYS = 30;     // 이수 후 평가 가능 기간
export const AUTO_HIDE_REPORTS = 3;       // 신고 누적 자동 숨김
export const OVERDUE_DAYS = 7;            // 7일 이상 미처리 = 빨강
export const AI_RATE_LIMIT_PER_MIN = 5;   // 사용자당 분당 AI 호출
