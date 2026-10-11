/**
 * AI 대책 캐시 초안 (사람이 쓴 초안, 시연용).
 * 상용 AI 키 없이도 오프라인 시연이 돌아가도록 우선순위 상위 이슈에 대한 초안을 둡니다. 형식은 SolutionSchema와 같습니다.
 * 발표 전에는 `npm run ai-cache`로 실제 AI 응답을 만들고 사람이 검수해 교체합니다.
 * 수치·비용·규정 번호는 지어내지 않고, 모르는 것은 needsVerification에 둡니다.
 * referencedCases의 id는 data/demo/best-practices.json 기준입니다.
 */
import type { Solution } from '../lib/types';

export const AI_DRAFTS: Record<string, Solution> = {
  'MEAL|배식 대기시간': {
    problemSummary: '여러 훈련장에서 오전 교육이 같은 시각에 끝나 전 인원이 한꺼번에 식당으로 몰리고, 배식구가 하나라 점심시간 대부분을 줄 서는 데 쓴다는 제안이 반복됩니다. 식사 후 쉴 시간이 없고 야외 대기 불편도 함께 제기됩니다. 최근 4주 사이 관련 제안과 공감이 빠르게 늘었습니다.',
    immediateActions: [
      { action: '오전 교육 종료 시각을 조별로 10분씩 나눠 식당 도착을 분산', owner: '훈련장 교육 담당', note: '시간표 조정만으로 가능' },
      { action: '수저·물컵을 배식 줄과 분리된 테이블에서 셀프로 제공', owner: '급식 담당' },
      { action: '식당 입구에 조별 배식 순서 안내판 게시', owner: '훈련장 행정반' },
    ],
    shortTerm: [
      { action: '임시 배식대를 추가로 열어 배식구 2곳 운영', expectedEffect: '동시 처리 인원이 늘어 대기 단축 (D훈련장 사례)' },
      { action: '배식 시작 후 15분 단위로 줄 길이를 기록해 효과 측정', expectedEffect: '조치 전후 비교 근거 확보' },
    ],
    longTerm: [
      { task: '식당 배식 동선 재설계와 배식구 상설 증설', budgetNeeded: true, note: '공사 범위는 현장 확인 필요' },
      { task: '훈련장별 배식 대기시간을 정기 점검 항목에 추가', budgetNeeded: false },
    ],
    referencedCases: [
      { bestPracticeId: 'bp_07', why: '배식구 1곳에 전원이 몰리던 같은 문제를 배식구 증설과 조별 교대 배식으로 해결' },
      { bestPracticeId: 'bp_03', why: '급식 방식 개선 시 예비군 의견을 반영하라는 권고' },
    ],
    needsVerification: ['임시 배식대를 둘 공간과 전기·급수 여건', '배식구 2곳 운영에 필요한 급식 인력', '교육 시간표를 조별로 나눌 때 다른 일정과 겹치지 않는지'],
    confidence: 'high',
  },
  'OPERATION|대기시간': {
    problemSummary: '사격 등 순서를 기다리며 할 일 없이 앉아 있는 시간이 길다는 제안이 반복됩니다.',
    immediateActions: [
      { action: '대기 조가 다른 교육을 먼저 이수하도록 순환 편성', owner: '훈련장 교육 담당' },
      { action: '입소 직후 대기시간에 짧은 안전교육 배치', owner: '훈련장 교육 담당' },
    ],
    shortTerm: [{ action: '교육별 실제 소요 시간을 기록해 시간표 재조정', expectedEffect: '불필요한 대기 감소' }],
    longTerm: [{ task: '사격장 운영 효율화 검토', budgetNeeded: true, note: '시설 범위는 현장 확인 필요' }],
    referencedCases: [],
    needsVerification: ['현재 조 편성 기준과 교관 인원', '순환 편성 시 안전 통제 인력'],
    confidence: 'medium',
  },
  'COMMUNICATION|현장 안내': {
    problemSummary: '정문에서 교육장까지 표지판이 부족하고 안내 방송이 잘 들리지 않아 입소 장소를 헤맸다는 제안입니다.',
    immediateActions: [
      { action: '정문~교육장 동선에 임시 안내 표지 설치', owner: '훈련장 행정반' },
      { action: '입소 시간대 정문에 안내 인력 배치', owner: '훈련장 행정반' },
    ],
    shortTerm: [{ action: '훈련장 가이드에 입소 동선 안내 추가', expectedEffect: '현장 문의 감소 (H훈련장 안내 문자 사례)' }],
    longTerm: [{ task: '상설 안내 표지와 방송 설비 점검', budgetNeeded: true }],
    referencedCases: [{ bestPracticeId: 'bp_10', why: '사전 안내 문자에 가이드 링크를 넣어 문의를 줄인 사례' }],
    needsVerification: ['표지 설치 위치가 보안상 문제없는지', '방송 설비 상태'],
    confidence: 'medium',
  },
  'COMMUNICATION|소집 통지 이해': {
    problemSummary: '소집 통지서가 입영 일시와 부대 중심으로 되어 있어 실제 훈련 장소와 기간을 알기 어렵다는 제안입니다.',
    immediateActions: [
      { action: '훈련 장소·기간·준비물을 요약한 안내 문자를 통지서와 함께 발송', owner: '훈련장 행정반' },
    ],
    shortTerm: [{ action: '훈련장 가이드 링크를 안내 문자에 포함', expectedEffect: '통지 내용 문의 감소' }],
    longTerm: [{ task: '통지서 양식을 훈련 기간·장소 중심으로 단순화 건의', budgetNeeded: false, note: '양식 변경 권한은 상급 부서 확인 필요' }],
    referencedCases: [
      { bestPracticeId: 'bp_05', why: '통지서를 훈련 기간·장소 중심으로 단순화하라는 권고' },
      { bestPracticeId: 'bp_10', why: '안내 문자에 준비물·교통편 링크를 넣은 사례' },
    ],
    needsVerification: ['훈련장 단위에서 보낼 수 있는 안내 문자 범위'],
    confidence: 'high',
  },
  'MEAL|도시락 품질': {
    problemSummary: '도시락이 식거나 운반 중 국물이 새고, 양과 맛이 부족하다는 제안입니다.',
    immediateActions: [
      { action: '도시락 수령 시 포장·온도 상태를 점검하는 확인표 운영', owner: '급식 담당' },
      { action: '국물류는 별도 용기로 받도록 업체에 요청', owner: '급식 담당' },
    ],
    shortTerm: [{ action: '훈련 후 도시락 만족도를 업체 평가에 반영', expectedEffect: '품질 관리 근거 확보' }],
    longTerm: [{ task: '도시락 업체 선정 기준에 예비군 의견 반영', budgetNeeded: false }],
    referencedCases: [{ bestPracticeId: 'bp_03', why: '도시락 업체 선정 시 예비군 의견을 우선 반영하라는 권고' }],
    needsVerification: ['현재 도시락 계약 조건', '보온 운반 용기 사용 여부'],
    confidence: 'medium',
  },
  'OPERATION|입소 지연 처리': {
    problemSummary: '교통 사정으로 조금 늦었는데 입소가 거부되거나 기준이 불명확해 불안했다는 제안입니다.',
    immediateActions: [
      { action: '지연 입소 허용 기준을 안내 문자와 가이드에 미리 공지', owner: '훈련장 행정반' },
    ],
    shortTerm: [{ action: '대중교통 지연 시 연락 창구 안내', expectedEffect: '재소집 사례 감소' }],
    longTerm: [{ task: '지연 시간만큼 보충 훈련을 받는 방안 검토', budgetNeeded: false, note: '규정 변경 여부는 상급 부서 확인 필요' }],
    referencedCases: [{ bestPracticeId: 'bp_06', why: '입소 허용 범위 확대와 보충 훈련을 권고' }],
    needsVerification: ['현재 지연 입소 처리 규정'],
    confidence: 'medium',
  },
  'EQUIPMENT|장구 상태': {
    problemSummary: '대여 장구의 버클 고장, 전투화 끈 해짐 등 상태 불량이 제기되었습니다. 안전 관련 이슈로 우선 확인이 필요합니다.',
    immediateActions: [{ action: '지급 전 장구 상태 점검과 불량품 분리 보관', owner: '보급 담당', note: '안전 관련 우선 조치' }],
    shortTerm: [{ action: '불량 장구 교체 요청 절차 마련', expectedEffect: '불량품 재지급 방지' }],
    longTerm: [{ task: '노후 장구 교체', budgetNeeded: true }],
    referencedCases: [],
    needsVerification: ['장구 보유 수량과 노후 비율'],
    confidence: 'medium',
  },
  'TRANSPORT|셔틀 부족': {
    problemSummary: '대중교통 정류장·역에서 훈련장까지 셔틀이 적어 놓치면 택시 외에 방법이 없다는 제안이 산간 훈련장에 집중됩니다.',
    immediateActions: [
      { action: '셔틀 시간표를 안내 문자에 포함', owner: '훈련장 행정반' },
      { action: '만차 예상 회차에 추가 배차 요청', owner: '훈련장 수송 담당' },
    ],
    shortTerm: [{ action: '열차·버스 도착 시간에 맞춰 셔틀 시간 조정', expectedEffect: '대기 감소 (H훈련장 사례)' }],
    longTerm: [{ task: '셔틀 차량 추가 확보', budgetNeeded: true }],
    referencedCases: [{ bestPracticeId: 'bp_08', why: '열차 도착 시간에 맞춰 셔틀을 조정한 사례' }],
    needsVerification: ['현재 셔틀 차량 수와 운전 인력', '훈련일별 대중교통 이용 인원'],
    confidence: 'medium',
  },
  'EQUIPMENT|피복 위생': {
    problemSummary: '대여 전투복·방한복에서 냄새가 나거나 오염되어 있었다는 제안입니다.',
    immediateActions: [{ action: '반납 피복 세탁 여부 확인 후 지급', owner: '보급 담당' }],
    shortTerm: [{ action: '피복 세탁 주기 점검표 운영', expectedEffect: '위생 불만 감소' }],
    longTerm: [{ task: '세탁 위탁 또는 설비 확충 검토', budgetNeeded: true }],
    referencedCases: [],
    needsVerification: ['현재 피복 세탁 주기와 방식'],
    confidence: 'medium',
  },
  'TRANSPORT|원거리 배정': {
    problemSummary: '주소지 기준 배정으로 훈련장이 멀어 첫차를 타도 입소 시간이 빠듯하고 택시비 부담이 크다는 제안입니다.',
    immediateActions: [{ action: '실거주지 훈련 신청 방법을 안내 문자와 가이드에 공지', owner: '훈련장 행정반' }],
    shortTerm: [{ action: '원거리 예비군을 위한 셔틀 연계 시간 안내', expectedEffect: '지각·택시 이용 감소' }],
    longTerm: [{ task: '실거주지 훈련 신청 가능 범위 확대 건의', budgetNeeded: false, note: '배정 기준은 상급 부서 소관' }],
    referencedCases: [{ bestPracticeId: 'bp_04', why: '실거주지 훈련 신청 범위 확대를 권고' }],
    needsVerification: ['원거리 배정 인원 현황'],
    confidence: 'medium',
  },
  'FACILITY|화장실 청결': {
    problemSummary: '쉬는 시간마다 화장실 대기가 길고 오후에는 소모품이 떨어진다는 제안입니다.',
    immediateActions: [{ action: '하루 3회 청소·소모품 보충 점검표 운영', owner: '시설 담당' }],
    shortTerm: [{ action: '훈련 성수기 이동식 화장실 추가', expectedEffect: '대기 감소 (K훈련장 사례)' }],
    longTerm: [{ task: '화장실 칸 상설 증설', budgetNeeded: true }],
    referencedCases: [{ bestPracticeId: 'bp_09', why: '이동식 화장실과 그늘막을 추가한 사례' }],
    needsVerification: ['훈련일 최대 인원 대비 칸 수'],
    confidence: 'medium',
  },
  'COMMUNICATION|사전 안내 부족': {
    problemSummary: '훈련 안내가 늦거나 준비물·교통편 안내가 빠져 현장에서 당황했다는 제안입니다.',
    immediateActions: [{ action: '훈련 3일 전 준비물·교통편·장소 안내 문자 발송', owner: '훈련장 행정반' }],
    shortTerm: [{ action: '안내 문자에 훈련장 가이드 링크 포함', expectedEffect: '문의 감소 (H훈련장 사례)' }],
    longTerm: [{ task: '예비군 홈페이지 알림 연동', budgetNeeded: true }],
    referencedCases: [{ bestPracticeId: 'bp_10', why: '안내 문자에 가이드 링크를 넣어 문의를 줄인 사례' }],
    needsVerification: ['문자 예약 발송 가능 여부'],
    confidence: 'high',
  },
};
