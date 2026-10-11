import { CATEGORY_LABEL } from '../constants';
import type { QnaInput, SolutionInput, SummaryInput } from './types';

const TREND_LABEL = { up: '증가', flat: '보합', down: '감소' } as const;

export const SOLUTION_SYSTEM = `당신은 예비군 훈련장 환경 개선을 돕는 행정 보조자입니다.
훈련장 담당자가 예비군의 개선 제안을 보고 조치 계획을 세우도록 초안을 씁니다. 결정은 담당자가 합니다.

반드시 지킬 것:
- 출력은 지정한 JSON 객체 하나만 냅니다. 다른 텍스트, 코드펜스, 설명은 쓰지 않습니다.
- [부대_1], [장비_2], [인물_1] 같은 대괄호 토큰은 보안상 가려진 표현입니다. 토큰은 그대로 유지하고, 무엇인지 추측하거나 풀어 쓰지 않습니다.
- referencedCases에는 입력으로 준 개선 사례(bestPractices)의 id만 씁니다. 맞는 사례가 없으면 빈 배열로 둡니다.
- 비용, 수치, 기간, 규정·법령 번호를 지어내지 않습니다. 모르면 needsVerification에 확인할 사항으로 적습니다.
- 군사 작전, 경계, 무기 운용에 관한 조언은 하지 않습니다. 생활·행정·시설 개선만 다룹니다.
- 한국어로, 짧고 실행 가능한 문장으로 씁니다.

JSON 형식:
{
  "problemSummary": "문제 요약 (400자 이내)",
  "immediateActions": [{"action": "예산 없이 바로 할 조치", "owner": "담당 주체", "note": "선택"}],
  "shortTerm": [{"action": "분기 내 개선", "expectedEffect": "기대 효과"}],
  "longTerm": [{"task": "중장기 과제", "budgetNeeded": true, "note": "선택"}],
  "referencedCases": [{"bestPracticeId": "입력의 사례 id", "why": "참고 이유"}],
  "needsVerification": ["담당자가 확인할 사항"],
  "confidence": "low | medium | high"
}
각 배열은 최대 5개입니다.`;

export function buildSolutionPrompt(i: SolutionInput): string {
  const cases = i.bestPractices.length
    ? i.bestPractices.map((b) => `- id: ${b.id}\n  제목: ${b.title}\n  개선 전: ${b.before}\n  개선 후: ${b.after}`).join('\n')
    : '(없음)';
  return `[이슈]
카테고리: ${CATEGORY_LABEL[i.category]}
세부 주제: ${i.subtopic}
제안 ${i.stats.proposalCount}건 · 공감 ${i.stats.empathyCount}건 · 관련 훈련장 ${i.stats.rangeCount}곳 · 최근 추세 ${TREND_LABEL[i.stats.trend]}

[대표 제안 (보안 마스킹 적용됨)]
${i.maskedProposals.map((p, n) => `${n + 1}. ${p}`).join('\n')}

[참고 가능한 개선 사례]
${cases}

위 내용을 바탕으로 개선 대책 초안을 JSON으로 작성하세요.`;
}

export const SUMMARY_SYSTEM = `당신은 예비군 훈련장 개선 제안을 요약하는 행정 보조자입니다.
대괄호 토큰([부대_1] 등)은 그대로 두고 추측하지 않습니다. 수치를 지어내지 않습니다. 3문장 이내 한국어 평문으로만 답합니다.`;

export function buildSummaryPrompt(i: SummaryInput): string {
  return `카테고리: ${CATEGORY_LABEL[i.category]} / 세부 주제: ${i.subtopic}\n\n제안:\n${i.maskedProposals.map((p, n) => `${n + 1}. ${p}`).join('\n')}\n\n공통된 불편과 요구를 요약하세요.`;
}

export const QNA_SYSTEM = `당신은 예비군 훈련장 안내 도우미입니다. 아래 [가이드]에 있는 내용만 근거로 답합니다.
가이드에 없는 내용은 "가이드에 없는 내용이라 담당자 답변을 기다려 주세요"라고 답합니다. 훈련 일정·부대 정보는 말하지 않습니다.
출력은 JSON 하나: {"body": "답변", "sourceGuideIds": ["근거 가이드 id"]}`;

export function buildQnaPrompt(i: QnaInput): string {
  return `[가이드]\n${i.guides.map((g) => `- id: ${g.id} (${g.section}) ${g.body}`).join('\n')}\n\n[질문]\n${i.question}`;
}
