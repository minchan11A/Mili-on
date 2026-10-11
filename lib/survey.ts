/**
 * 훈련 만족도 설문 (16유형 검사처럼 문항마다 "불만족 ←→ 만족" 5단계).
 * 섹션별 응답 평균이 지도·상세 화면의 5개 지표 점수가 됩니다.
 *   훈련 일정 고지 → 일정 고지(scoreComm)
 *   교통           → 교통(scoreTransport)
 *   숙식           → 식사(scoreMeal) · 숙소·시설(scoreFacility)
 *   기타           → 운영·기타(scoreOperation)
 * "다른 예비군에게 전하고 싶은 말"은 평가 한 줄 의견(comment)으로 저장되고 보안 필터를 거칩니다.
 */
import type { ScoreKey } from './constants';

export interface SurveyQuestion { id: string; axis: ScoreKey; title: string; hint?: string }
export interface SurveySection { id: 'schedule' | 'transport' | 'lodging' | 'etc'; title: string; desc: string; questions: SurveyQuestion[] }

export const SURVEY_SECTIONS: SurveySection[] = [
  {
    id: 'schedule', title: '훈련 일정 고지', desc: '소집 통지와 일정 안내',
    questions: [
      { id: 'sch_notice', axis: 'scoreComm', title: '훈련 일정을 충분히 미리 알려 줬다' },
      { id: 'sch_clarity', axis: 'scoreComm', title: '통지 내용(장소·시간·준비물)이 이해하기 쉬웠다' },
      { id: 'sch_change', axis: 'scoreComm', title: '일정 연기·변경 신청 절차가 편리했다' },
    ],
  },
  {
    id: 'transport', title: '교통', desc: '훈련장까지 오가는 길',
    questions: [
      { id: 'trn_access', axis: 'scoreTransport', title: '훈련장까지 가는 거리와 시간이 적당했다' },
      { id: 'trn_shuttle', axis: 'scoreTransport', title: '셔틀·대중교통이 입소·퇴소 시간에 잘 맞았다' },
      { id: 'trn_parking', axis: 'scoreTransport', title: '주차가 수월했다', hint: '자차로 오지 않았다면 "보통"을 고르세요' },
    ],
  },
  {
    id: 'lodging', title: '숙식', desc: '식사와 숙소·휴게 공간',
    questions: [
      { id: 'meal_quality', axis: 'scoreMeal', title: '식사의 맛과 양에 만족한다' },
      { id: 'meal_wait', axis: 'scoreMeal', title: '배식 대기시간이 적당했다' },
      { id: 'meal_hygiene', axis: 'scoreMeal', title: '식당과 식기가 위생적이었다' },
      { id: 'fac_rest', axis: 'scoreFacility', title: '숙소·휴게 공간이 쾌적했다', hint: '동원훈련은 숙소, 그 외 훈련은 휴게·대기 공간 기준' },
      { id: 'fac_toilet', axis: 'scoreFacility', title: '화장실과 세면 시설이 깨끗했다' },
    ],
  },
  {
    id: 'etc', title: '기타', desc: '훈련 운영과 장비',
    questions: [
      { id: 'op_schedule', axis: 'scoreOperation', title: '훈련이 안내한 시간대로 진행됐다' },
      { id: 'op_wait', axis: 'scoreOperation', title: '불필요한 대기 없이 교육이 알찼다' },
      { id: 'op_staff', axis: 'scoreOperation', title: '조교·담당자의 안내가 친절했다' },
      { id: 'op_gear', axis: 'scoreOperation', title: '지급받은 피복·장구 상태가 좋았다' },
    ],
  },
];

export const SURVEY_QUESTIONS = SURVEY_SECTIONS.flatMap((s) => s.questions);
export const SCALE_LABELS = ['매우 불만족', '불만족', '보통', '만족', '매우 만족'] as const;
export const MESSAGE_MAX = 300;

export function isCompleteAnswers(a: Record<string, number> | undefined | null): a is Record<string, number> {
  return !!a && SURVEY_QUESTIONS.every((q) => Number.isInteger(a[q.id]) && a[q.id] >= 1 && a[q.id] <= 5);
}

/** 문항 응답 → 5개 지표 점수 (지표별 평균, 반올림 1~5) */
export function scoresFromAnswers(a: Record<string, number>): Record<ScoreKey, number> {
  const sums: Partial<Record<ScoreKey, { s: number; n: number }>> = {};
  for (const q of SURVEY_QUESTIONS) {
    const cur = sums[q.axis] ?? { s: 0, n: 0 };
    cur.s += a[q.id]; cur.n++;
    sums[q.axis] = cur;
  }
  const out = {} as Record<ScoreKey, number>;
  for (const [k, v] of Object.entries(sums) as Array<[ScoreKey, { s: number; n: number }]>) out[k] = Math.min(5, Math.max(1, Math.round(v.s / v.n)));
  return out;
}
