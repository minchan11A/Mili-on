/**
 * AI 대책 캐시 초안 (시드용).
 * 상용 AI 키 없이도 시연이 돌아가도록 사람이 쓴 초안입니다. 형식은 SolutionSchema와 같습니다.
 * 발표 전에는 scripts/build-ai-cache.ts로 실제 AI 응답을 만들고 사람이 검수해 교체합니다.
 * 수치·비용·규정 번호는 넣지 않고, 모르는 것은 needsVerification에 둡니다.
 */
import type { Solution } from '../lib/types';

export const AI_DRAFTS: Record<string, Solution> = {
  'MEAL|배식 대기시간': {
    problemSummary: '여러 훈련장에서 오전 교육이 같은 시각에 끝나 전 인원이 한꺼번에 식당으로 몰리고, 배식구가 하나라 점심 대기가 길어진다는 제안이 반복됩니다. 대기 때문에 식사·휴식 시간이 줄고 우천 시 야외 대기 불편도 함께 제기됩니다. 최근 4주 사이 관련 제안과 공감이 빠르게 늘었습니다.',
    immediateActions: [
      { action: '오전 교육 종료 시각을 조별로 10분씩 나눠 식당 도착 시점을 분산', owner: '훈련장 교육 담당', note: '교육 시간표만 조정하므로 예산 불필요' },
      { action: '수저·물컵을 배식 줄과 분리된 별도 테이블에서 셀프로 제공해 병목 제거', owner: '급식 담당' },
      { action: '식당 입구에 예상 대기시간 안내판 설치(수기 게시)', owner: '훈련장 행정반' },
    ],
    shortTerm: [
      { action: '임시 배식대를 추가로 열어 배식구 2개 운영', expectedEffect: '동시 처리 인원이 늘어 대기 단축 (D훈련장 사례 참고)' },
      { action: '우천 시 대기용 천막을 식당 앞에 설치', expectedEffect: '비 오는 날 야외 대기 불편 해소' },
      { action: '배식 시작 후 15분 단위로 대기 줄 길이를 기록해 효과 측정', expectedEffect: '조치 전후 비교 근거 확보' },
    ],
    longTerm: [
      { task: '식당 배식 동선 재설계(배식구 상설 증설)', budgetNeeded: true, note: '시설 공사 범위는 현장 확인 필요' },
      { task: '훈련장별 배식 대기시간을 정기 점검 항목에 추가', budgetNeeded: false },
    ],
    referencedCases: [
      { bestPracticeId: 'bp-01', why: '같은 문제(배식구 1개, 동시 식사)를 배식구 증설과 조별 교대 배식으로 해결한 사례' },
    ],
    needsVerification: [
      '식당 내 임시 배식대를 추가로 둘 공간과 전기·급수 여건',
      '급식 인력을 배식구 2개 운영에 맞게 배치할 수 있는지',
      '교육 시간표를 조별로 나눌 때 다른 교육 일정과 겹치지 않는지',
    ],
    confidence: 'high',
  },
  'TRANSPORT|셔틀 부족': {
    problemSummary: '산간 지역 훈련장에서 대중교통 정류장과 훈련장 사이 거리가 멀고 셔틀 운행 횟수가 적어, 셔틀을 놓치면 택시 외에 방법이 없다는 제안이 집중됩니다. 도보 이동 시 안전 우려도 함께 제기됩니다.',
    immediateActions: [
      { action: '입소·퇴소 시간대 셔틀 시간표를 훈련 안내 문자에 포함', owner: '훈련장 행정반' },
      { action: '셔틀 탑승 인원을 사전 조사해 만차 예상 회차에 추가 배차 요청', owner: '훈련장 수송 담당' },
    ],
    shortTerm: [
      { action: '입소 시간 전후 셔틀 회차 증편', expectedEffect: '셔틀을 놓쳐 택시를 타는 사례 감소 (J훈련장 사례 참고)' },
      { action: '정류장에 셔틀 탑승 위치 표지 설치', expectedEffect: '탑승 위치 혼선 감소' },
    ],
    longTerm: [
      { task: '지자체와 협의해 훈련일 노선버스 증편 또는 임시 정류장 신설 검토', budgetNeeded: false, note: '협의 결과에 따라 예산 필요 여부 결정' },
      { task: '셔틀 차량 추가 확보', budgetNeeded: true },
    ],
    referencedCases: [
      { bestPracticeId: 'bp-03', why: '터미널 셔틀을 입소·퇴소 시간대에 증차해 같은 불편을 줄인 사례' },
      { bestPracticeId: 'bp-09', why: '자차 이용자를 위한 임시 주차장 확보로 교통 부담을 분산한 사례' },
    ],
    needsVerification: ['현재 셔틀 차량 수와 운전 인력', '훈련일별 대중교통 이용 인원', '정류장~훈련장 도보 구간의 안전 여부'],
    confidence: 'medium',
  },
  'FACILITY|화장실 청결': {
    problemSummary: '쉬는 시간마다 화장실 대기가 길고, 오후가 되면 휴지·비누가 떨어지며 바닥이 젖어 미끄럽다는 제안이 많습니다. 미끄럼 사고 우려가 있어 안전 측면도 함께 봐야 합니다.',
    immediateActions: [
      { action: '오전·점심·오후 3회 청소와 소모품 보충 점검표 운영', owner: '시설 담당' },
      { action: '젖은 바닥에 미끄럼 주의 표지와 매트 설치', owner: '시설 담당', note: '안전 관련 우선 조치' },
    ],
    shortTerm: [
      { action: '대규모 훈련일에 이동식 화장실 추가 배치', expectedEffect: '쉬는 시간 대기 단축 (M훈련장 사례 참고)' },
      { action: '세면대 급수 상태 점검과 비누 디스펜서 설치', expectedEffect: '위생 불만 감소' },
    ],
    longTerm: [{ task: '화장실 칸 상설 증설 또는 리모델링', budgetNeeded: true }],
    referencedCases: [{ bestPracticeId: 'bp-02', why: '이동식 화장실 추가와 청소 주기 단축으로 같은 문제를 개선한 사례' }],
    needsVerification: ['훈련일 최대 인원 대비 현재 칸 수', '이동식 화장실 설치 가능 위치'],
    confidence: 'medium',
  },
  'OPERATION|대기시간': {
    problemSummary: '사격 등 순서를 기다리는 대기시간이 길고, 대기 중 할 일이 없다는 제안이 반복됩니다.',
    immediateActions: [
      { action: '사격 조를 소규모로 나누고 대기 조는 다른 교육을 먼저 이수하도록 순환 편성', owner: '훈련장 교육 담당' },
      { action: '입소 직후 대기시간에 안전교육 영상 등 짧은 교육 배치', owner: '훈련장 교육 담당' },
    ],
    shortTerm: [{ action: '교육별 소요 시간을 기록해 시간표 재조정', expectedEffect: '불필요한 대기 감소 (G훈련장 사례 참고)' }],
    longTerm: [{ task: '사격장 사대 운영 효율화 검토', budgetNeeded: true, note: '시설 범위는 현장 확인 필요' }],
    referencedCases: [{ bestPracticeId: 'bp-05', why: '조 편성 개선으로 사격 대기를 줄인 사례' }],
    needsVerification: ['현재 조 편성 기준과 교관 인원', '순환 편성 시 안전 통제 인력'],
    confidence: 'medium',
  },
  'TRANSPORT|셔틀 시간': {
    problemSummary: '셔틀 도착 시각이 입소 시간과 맞지 않거나 퇴소 후 셔틀까지 오래 기다려야 한다는 제안입니다. 시간표가 사전에 공개되지 않는 점도 지적됩니다.',
    immediateActions: [
      { action: '셔틀 시간표를 홈페이지와 안내 문자에 공개', owner: '훈련장 행정반' },
      { action: '첫 셔틀 출발을 입소 시각 기준으로 여유 있게 조정', owner: '훈련장 수송 담당' },
    ],
    shortTerm: [{ action: '퇴소 시각에 맞춘 셔틀 회차 추가', expectedEffect: '퇴소 후 대기 감소' }],
    longTerm: [{ task: '셔틀 운행 계획을 훈련 일정과 함께 수립하는 절차 마련', budgetNeeded: false }],
    referencedCases: [{ bestPracticeId: 'bp-03', why: '셔틀 시간표 사전 발송과 증차 사례' }],
    needsVerification: ['셔틀 차량 운행 가능 시간대'],
    confidence: 'medium',
  },
  'FACILITY|냉난방': {
    problemSummary: '여름에는 교육장 냉방, 겨울에는 난방이 부족해 교육 집중이 어렵다는 제안입니다.',
    immediateActions: [
      { action: '냉난방기 고장 여부 점검과 필터 청소', owner: '시설 담당' },
      { action: '혹서·혹한기에 실내 교육 순서를 기온이 낮거나 높은 시간대로 조정', owner: '훈련장 교육 담당' },
    ],
    shortTerm: [{ action: '이동식 냉풍기·온풍기 임시 배치', expectedEffect: '체감 온도 개선' }],
    longTerm: [{ task: '노후 냉난방기 교체', budgetNeeded: true, note: 'T훈련장 사례 참고' }],
    referencedCases: [{ bestPracticeId: 'bp-04', why: '노후 냉난방기 교체로 실내 온도를 유지한 사례' }],
    needsVerification: ['냉난방기 설치 연도와 고장 이력', '전기 용량'],
    confidence: 'medium',
  },
  'COMMUNICATION|사전 안내 부족': {
    problemSummary: '훈련 안내 문자가 전날 늦게 오거나 준비물·입소 장소 안내가 빠져 현장에서 당황했다는 제안입니다.',
    immediateActions: [
      { action: '훈련 3일 전 준비물·교통편·입소 장소를 담은 안내 문자 발송', owner: '훈련장 행정반' },
      { action: '안내 문자에 이 서비스의 훈련장 가이드 링크 포함', owner: '훈련장 행정반' },
    ],
    shortTerm: [{ action: '입소 장소 변경 시 즉시 재안내하는 절차 마련', expectedEffect: '현장 혼선 감소 (Q훈련장 사례 참고)' }],
    longTerm: [{ task: '예비군 홈페이지 알림과 연동한 자동 안내', budgetNeeded: true }],
    referencedCases: [{ bestPracticeId: 'bp-06', why: '3일 전 안내 문자로 준비물 누락을 줄인 사례' }],
    needsVerification: ['문자 발송 시스템의 예약 발송 가능 여부'],
    confidence: 'high',
  },
  'MEAL|식사량': {
    problemSummary: '배식 양이 적거나 반찬이 일찍 떨어져 뒤쪽 인원이 충분히 먹지 못한다는 제안입니다.',
    immediateActions: [
      { action: '밥·국 추가 배식이 가능하다는 안내를 식당에 게시', owner: '급식 담당' },
      { action: '배식 후반부 반찬 잔량 점검', owner: '급식 담당' },
    ],
    shortTerm: [{ action: '훈련 인원 대비 반찬 준비량 기준 재검토', expectedEffect: '반찬 소진 감소' }],
    longTerm: [{ task: '급식 단가·인원 기준 점검', budgetNeeded: true }],
    referencedCases: [],
    needsVerification: ['현재 급식 단가와 준비량 기준'],
    confidence: 'medium',
  },
  'TRANSPORT|주차 공간': {
    problemSummary: '자차 이용을 안내하면서 주차 공간이 부족해 갓길 주차가 생기고 안전 우려가 있다는 제안입니다.',
    immediateActions: [
      { action: '훈련일 주차 안내 요원 배치', owner: '훈련장 행정반' },
      { action: '안내 문자에 주차 가능 대수와 대체 주차장 안내', owner: '훈련장 행정반' },
    ],
    shortTerm: [{ action: '인근 공터 임시 주차장 확보 협의', expectedEffect: '갓길 주차 감소 (N훈련장 사례 참고)' }],
    longTerm: [{ task: '주차장 상설 확장', budgetNeeded: true }],
    referencedCases: [{ bestPracticeId: 'bp-09', why: '임시 주차장 확보와 안내 요원 배치 사례' }],
    needsVerification: ['인근 부지 사용 가능 여부'],
    confidence: 'medium',
  },
  'FACILITY|휴게 공간': {
    problemSummary: '대기시간에 앉을 곳이 없고 비를 피할 곳이 없다는 제안입니다.',
    immediateActions: [{ action: '대기 장소에 접이식 의자 배치', owner: '시설 담당' }],
    shortTerm: [{ action: '대기 장소에 천막 설치', expectedEffect: '우천 시 대기 불편 해소 (C훈련장 사례 참고)' }],
    longTerm: [{ task: '상설 휴게 공간 조성', budgetNeeded: true }],
    referencedCases: [{ bestPracticeId: 'bp-10', why: '천막과 의자 설치로 대기 환경을 개선한 사례' }],
    needsVerification: ['천막 설치 가능 위치'],
    confidence: 'medium',
  },
  'MEAL|메뉴 다양성': {
    problemSummary: '동원훈련 기간 동안 메뉴가 반복되고 알레르기 대체식이 없다는 제안입니다.',
    immediateActions: [{ action: '훈련 기간 메뉴표를 사전 공개', owner: '급식 담당' }],
    shortTerm: [{ action: '알레르기 대체식 신청 절차 마련', expectedEffect: '식사를 거르는 인원 감소' }],
    longTerm: [{ task: '급식 메뉴 운영 기준 개선', budgetNeeded: true }],
    referencedCases: [],
    needsVerification: ['급식 위탁 계약 범위'],
    confidence: 'low',
  },
  'MEAL|식당 위생': {
    problemSummary: '식판 물기·냄새, 식탁 미정리 등 위생 문제가 제기되었습니다. 식중독 우려가 있어 안전 관련 이슈로 우선 확인이 필요합니다.',
    immediateActions: [
      { action: '식판 세척·건조 상태 당일 점검', owner: '급식 담당', note: '안전 관련 우선 조치' },
      { action: '조 교대 시 식탁 정리 인력 배치', owner: '급식 담당' },
    ],
    shortTerm: [{ action: '식기 건조 설비 점검', expectedEffect: '식판 위생 개선' }],
    longTerm: [{ task: '식기세척·소독 설비 교체 검토', budgetNeeded: true }],
    referencedCases: [],
    needsVerification: ['식기 세척·소독 설비 상태', '최근 위생 점검 결과'],
    confidence: 'medium',
  },
  'COMPENSATION|훈련비 지급': {
    problemSummary: '훈련비 입금이 늦고 지급 예정일 안내가 없어 문의가 몰린다는 제안입니다.',
    immediateActions: [{ action: '퇴소 시 훈련비 지급 예정일 문자 안내', owner: '훈련장 행정반' }],
    shortTerm: [{ action: '지급 지연 시 사유 안내 절차 마련', expectedEffect: '문의 감소 (X훈련장 사례 참고)' }],
    longTerm: [{ task: '지급 처리 기간 단축 검토', budgetNeeded: false }],
    referencedCases: [{ bestPracticeId: 'bp-08', why: '지급 예정일 안내로 문의를 줄인 사례' }],
    needsVerification: ['현재 지급 처리 절차와 소요 기간'],
    confidence: 'medium',
  },
  'OPERATION|교육 내용': {
    problemSummary: '매년 같은 영상·내용이 반복되어 지루하고, 실생활에 도움이 되는 교육을 원한다는 제안입니다.',
    immediateActions: [{ action: '반복 상영 영상 목록을 점검하고 최신 자료로 교체 가능한 항목 선별', owner: '훈련장 교육 담당' }],
    shortTerm: [{ action: '응급처치·심폐소생술 등 실습형 교육 비중 확대 검토', expectedEffect: '교육 만족도 개선' }],
    longTerm: [{ task: '교육 과정 개편 건의', budgetNeeded: false, note: '교육 과목 편성 권한은 상급 부서 확인 필요' }],
    referencedCases: [],
    needsVerification: ['훈련장 단위에서 조정 가능한 교육 과목 범위'],
    confidence: 'low',
  },
  'TRANSPORT|대중교통 안내': {
    problemSummary: '대중교통으로 오는 방법과 정류장 정보가 안내되지 않아 헤맸다는 제안입니다.',
    immediateActions: [
      { action: '가장 가까운 정류장·배차 정보를 훈련장 가이드와 안내 문자에 추가', owner: '훈련장 행정반' },
      { action: '지도 앱 검색 주소와 실제 입구 위치 차이를 안내', owner: '훈련장 행정반' },
    ],
    shortTerm: [{ action: '정류장~입구 구간 안내 표지 설치', expectedEffect: '도착 지연 감소' }],
    longTerm: [{ task: '지자체와 노선 정보 공동 안내 협의', budgetNeeded: false }],
    referencedCases: [{ bestPracticeId: 'bp-03', why: '셔틀 시간표 사전 안내 사례' }],
    needsVerification: ['정류장 위치 공개가 보안상 문제없는지'],
    confidence: 'medium',
  },
  'OPERATION|일정 지연': {
    problemSummary: '안내받은 퇴소 시간보다 늦게 끝나거나 일정이 밀리는데 설명이 없다는 제안입니다.',
    immediateActions: [{ action: '일정 지연 시 현장 방송으로 사유와 예상 종료 시각 안내', owner: '훈련장 교육 담당' }],
    shortTerm: [{ action: '지연이 잦은 교육 구간을 기록해 시간표 여유 반영', expectedEffect: '퇴소 지연 감소' }],
    longTerm: [{ task: '훈련 시간표 표준화', budgetNeeded: false }],
    referencedCases: [{ bestPracticeId: 'bp-05', why: '조 편성 개선으로 일정을 단축한 사례' }],
    needsVerification: ['최근 지연 원인(기상, 인원, 장비 등)'],
    confidence: 'medium',
  },
};
