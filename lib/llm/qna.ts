/**
 * 오프라인 Q&A 1차 답변 (명세 §5.1, §6.6).
 * 가이드 항목 키워드 검색 결과를 템플릿에 채웁니다. 근거가 없으면 null (= 담당자 답변 대기).
 */
import { jaccard, tokenize } from '../analysis/similarity';
import { GUIDE_SECTION_LABEL } from '../constants';
import type { GuideSection } from '../types';
import type { QnaAnswer, QnaInput } from './types';

export const QNA_MIN_SCORE = 0.06;

/** 질문 단어가 섹션 주제와 맞으면 가산 */
const SECTION_HINTS: Record<GuideSection, string[]> = {
  CHECKLIST: ['준비물', '챙겨', '가져', '지참', '신분증', '복장', '전투복', '군복', '필요'],
  TRANSPORT: ['버스', '셔틀', '주차', '교통', '지하철', '택시', '자차', '차', '가는', '오는', '정류장', '역'],
  MEAL: ['밥', '식사', '점심', '매점', 'px', '간식', '물', '식당', '음식'],
  ENTRY: ['입소', '도착', '몇 시', '시간', '절차', '확인', '접수', '등록'],
  ETC: [],
};

export function answerFromGuides(input: QnaInput): QnaAnswer | null {
  const q = tokenize(input.question);
  if (q.size === 0 || input.guides.length === 0) return null;
  const qLower = input.question.toLowerCase();
  const scored = input.guides
    .map((g) => {
      const sec = g.section as GuideSection;
      const hint = (SECTION_HINTS[sec] ?? []).some((h) => qLower.includes(h)) ? 0.08 : 0;
      return { g, score: jaccard(q, tokenize(g.body)) + hint };
    })
    .filter((x) => x.score >= QNA_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  if (!scored.length) return null;
  const lines = scored.map(({ g }) => `• [${GUIDE_SECTION_LABEL[g.section as GuideSection] ?? g.section}] ${g.body}`);
  return {
    body: `가이드에 따르면 다음과 같습니다.\n${lines.join('\n')}\n\n정확하지 않을 수 있으니 담당자 답변도 확인해 주세요.`,
    sourceGuideIds: scored.map(({ g }) => g.id),
  };
}
