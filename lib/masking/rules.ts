/**
 * 마스킹·차단 정규식 규칙 (명세 §5.2).
 * 순수 TS. 브라우저와 서버에서 똑같이 돕니다.
 */

export type EntityType =
  | 'UNIT'        // 부대·단대호
  | 'WEAPON'      // 무기체계·탄약
  | 'OPS'         // 작전 용어
  | 'FACILITY'    // 군사 시설
  | 'LOCATION'    // 상세 위치 (좌표는 차단)
  | 'PERSON'      // 사람 이름 + 계급·직책
  | 'PHONE' | 'MIL_ID' | 'RRN' | 'PLATE' | 'EMAIL';

/** 토큰 라벨. PII는 번호 없이 고정 토큰을 쓰고 복원하지 않습니다. */
export const TOKEN_LABEL: Record<EntityType, string> = {
  UNIT: '부대', WEAPON: '장비', OPS: '작전용어', FACILITY: '시설', LOCATION: '위치', PERSON: '인물',
  PHONE: '전화번호', MIL_ID: '군번', RRN: '주민번호', PLATE: '차량번호', EMAIL: '이메일',
};

export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  UNIT: '부대·단대호', WEAPON: '무기·장비', OPS: '작전 용어', FACILITY: '군사 시설', LOCATION: '상세 위치',
  PERSON: '인물(이름+계급·직책)', PHONE: '전화번호', MIL_ID: '군번', RRN: '주민등록번호', PLATE: '차량번호', EMAIL: '이메일',
};

export const PII_TYPES: ReadonlySet<EntityType> = new Set(['PHONE', 'MIL_ID', 'RRN', 'PLATE', 'EMAIL']);

export interface MaskRule {
  id: string;
  type: EntityType;
  re: RegExp;              // 반드시 g 플래그
  /** 캡처 그룹 등을 보고 이 매치를 버릴지 결정 */
  reject?: (m: RegExpExecArray, text: string) => boolean;
}

export interface BlockRule {
  id: string;
  reason: string;
  re: RegExp;
}

/* ───────── 보조 목록 ───────── */

const RANKS = '이병|일병|상병|병장|하사|중사|상사|원사|준위|소위|중위|대위|소령|중령|대령|준장|소장|중장|대장';
const TITLES = '중대장|대대장|소대장|연대장|여단장|사단장|행정보급관|행보관|주임원사|교관|조교|담당관|훈련관|지휘관|분대장';
const UNIT_SUFFIX = '군단|사단|여단|연대|대대|중대|소대|사령부|동원지원단|예비군훈련대|예비군중대|지역대|훈련대|훈련단|전대';
const UNIT_BRANCH = '보병|기계화보병|기갑|포병|공병|통신|정보통신|수색|특공|기동|동원|향토|해안|군수지원|화학';

/** 한국 성씨 (사람 이름 판정 휴리스틱) */
const SURNAMES = new Set(
  ('김 이 박 최 정 강 조 윤 장 임 한 오 서 신 권 황 안 송 류 유 전 홍 고 문 양 손 배 백 허 남 심 노 하 곽 성 차 주 우 구 ' +
   '민 진 나 지 엄 채 원 천 방 공 현 함 변 염 여 추 도 소 석 선 설 마 길 연 위 표 명 기 반 왕 금 옥 육 인 맹 제 모 탁 국 ' +
   '어 은 편 용 예 경 봉 사 부 피 태 감 견 계 순 탄 하').split(' '),
);

/** 이름처럼 보이지만 일상어인 앞말 */
const NOT_NAME = new Set([
  '정말', '진짜', '이번', '우리', '저희', '해당', '담당', '현장', '모든', '다른', '여러', '일부', '어떤', '그날', '오늘', '어제',
  '당일', '신규', '친절', '무서운', '고마운', '훌륭한', '인솔', '전체', '각각', '조금', '너무', '가끔', '항상', '처음', '마지막',
  '남자', '여자', '현역', '예비', '예비군', '간부', '병사', '선임', '후임', '동기', '그분', '이분', '저분', '한번', '이날',
  '지원', '안내', '훈련', '교육', '사격', '입소', '퇴소', '식당', '배식', '위병', '정문', '후문', '본부', '행정', '대기',
  '장교', '부사관', '상급', '하급', '주임', '선임하', '여러분', '모두', '이분들', '친절한', '불친절', '불친절한', '착한', '좋은', '나쁜',
  '제', '내', '저', '그', '이', '요', '그냥', '또', '좀', '젊은', '나이든', '새로온', '전임', '신임', '부대', '연대', '대대', '중대', '소대', '조교들', '교관들',
]);

/** 부대명 앞말이 일상어인 경우 */
const GENERIC_UNIT_PREFIX = new Set([
  '우리', '저희', '해당', '이', '그', '저', '각', '모든', '다른', '타', '여러', '현역', '예비군', '상급', '하급', '인근', '근처',
  '같은', '소속', '원', '본', '전', '전체', '지원', '동원', '지역', '향토', '예하', '직할', '관할', '그쪽', '이쪽', '옆', '자기',
]);

/** 계급·직책 바로 뒤에 올 수 있는 글자 (조사 등). "지원사업"의 "원사" 같은 오탐을 막음 */
const AFTER_TITLE = '(?=$|[^가-힣]|[이가은는을를에의도와과께랑만들한님])';

const PARTICLE_END = /[이가은는을를에의도와과로서만께]$/;

/** 자동차 번호판 한글 */
const PLATE_HANGUL = '가나다라마거너더러머버서어저고노도로모보소오조구누두루무부수우주아바사자배하허호육해공국합';

/* ───────── 차단 규칙 (BLOCK) ───────── */

export const BLOCK_RULES: BlockRule[] = [
  { id: 'coord.mgrs', reason: '좌표 포함', re: /(?<![A-Za-z0-9])\d{1,2}[C-HJ-NP-X]\s?[A-HJ-NP-Z]{2}\s?\d{3,5}\s?\d{3,5}(?![A-Za-z0-9])/g },
  { id: 'coord.latlng', reason: '좌표 포함', re: /(?<![0-9.])3[3-8]\.\d{3,}\s*,\s*12[4-9]\.\d{3,}(?![0-9])/g },
  { id: 'coord.lnglat', reason: '좌표 포함', re: /(?<![0-9.])12[4-9]\.\d{3,}\s*,\s*3[3-8]\.\d{3,}(?![0-9])/g },
  { id: 'coord.dms', reason: '좌표 포함', re: /\d{2,3}\s*[°도]\s*\d{1,2}\s*['′분]\s*(\d{1,2}(\.\d+)?\s*["″초])?\s*[NSEW북남동서]?/g },
  { id: 'coord.named', reason: '좌표 포함', re: /(북위|동경|위도|경도)\s*\d{2,3}(\.\d+)?/g },
  { id: 'kw.password', reason: '암구호·출입 비밀번호 언급', re: /암\s*구\s*호|출입(문)?\s*(비밀\s*번호|비번|번호)|도어락\s*(비밀\s*번호|번호)/g },
  { id: 'kw.opplan', reason: '작전계획 언급', re: /작\s*전\s*계\s*획|작계\s*(내용|문서|세부|계획)|작전\s*명령|작전\s*개념/g },
  { id: 'kw.secret', reason: '비밀 등급 정보 언급', re: /군\s*사\s*기\s*밀|대\s*외\s*비|(?<!와이파이\s?|와이파이\s?|wifi\s?)비밀(?!\s*번호|번호|글|댓글|리에|스럽|이\s*아니)|[1-3]급\s*비밀|기밀\s*(문서|자료)/gi },
  { id: 'kw.location', reason: '주요 시설 위치 언급', re: /(탄약고|무기고|지휘소|통신소|상황실|초소|탄약\s*저장소|유류고)\s*(의\s*)?(위치|좌표|배치도|출입\s*경로|구조)/g },
  { id: 'kw.weakness', reason: '경계·보안 취약점 언급', re: /(경계|보안|감시|방호|철책)\s*(가\s*)?(취약|허술|공백|사각지대|뚫|구멍)/g },
  { id: 'kw.deploy', reason: '병력·장비 배치 언급', re: /(병력|화기|장비|탄약)\s*(의\s*)?(배치|배치도|보유\s*수량|보유량)/g },
  { id: 'kw.shift', reason: '경계·근무 교대 정보 언급', re: /(경계|근무|초병)\s*(교대)\s*(시간|시각|주기)/g },
];

/* ───────── 마스킹 규칙 (MASK) ───────── */

function makeUnitHangulReject(m: RegExpExecArray): boolean {
  const prefix = m[1];
  const spaced = m[2] !== '';
  if (GENERIC_UNIT_PREFIX.has(prefix)) return true;
  if (spaced && (PARTICLE_END.test(prefix) || prefix.length < 2)) return true;
  // "예비군" 같은 일반 수식어 + 부대
  if (/^(예비군|현역|동원|지역|향토|군)$/.test(prefix)) return true;
  return false;
}

const TITLE_WORDS = new Set(['소대장', '중대장', '대대장', '연대장', '여단장', '사단장', '군단장', '분대장', '대장', '주임원사', '부소대장', '부중대장']);

function personReject(m: RegExpExecArray): boolean {
  const name = m[1].replace(/\s/g, '');
  const whole = m[0].replace(/\s|님$/g, '');
  if (TITLE_WORDS.has(whole) || TITLE_WORDS.has(whole.replace(/님$/, ''))) return true;
  if (NOT_NAME.has(name)) return true;
  if (/[○◯OX*0]/.test(name)) return false;           // "김OO 상병" 같은 익명 표기도 사람으로 봄
  if (!SURNAMES.has(name[0])) return true;
  if (name.length >= 3 && PARTICLE_END.test(name) && !SURNAMES.has(name[0])) return true;
  return false;
}

export const MASK_RULES: MaskRule[] = [
  // 부대·단대호 (숫자형): "제3보병사단", "3 사단", "52사단 213연대 2대대"
  {
    id: 'unit.numeric', type: 'UNIT',
    re: new RegExp(`(?:제\\s*)?\\d{1,4}\\s*(?:${UNIT_BRANCH})?\\s*(?:${UNIT_SUFFIX})`, 'g'),
  },
  // 부대 (이름형): "백골부대", "○○부대", "○사단"
  {
    id: 'unit.named', type: 'UNIT',
    re: /([가-힣○◯]{1,6}|[A-Z]{1,3}|[○◯]{1,3})(\s?)(부대|사단|여단|군단|사령부|동원지원단)(?!찌개|법인|장\s?님|원)/g,
    reject: (m) => makeUnitHangulReject(m),
  },
  // 상세 위치: 번지, 산 번지
  { id: 'loc.lot', type: 'LOCATION', re: /(?:[가-힣]{1,6}(?:리|동|면)\s?)?(?:산\s?)?\d{1,5}(?:-\d{1,4})?\s?번지/g },
  // 사람: 이름 + 계급
  { id: 'person.rank', type: 'PERSON', re: new RegExp(`([가-힣][가-힣○◯OX*]{0,3})\\s?(?:${RANKS})${AFTER_TITLE}(?:님)?`, 'g'), reject: personReject },
  // 사람: 이름 + 직책
  { id: 'person.title', type: 'PERSON', re: new RegExp(`([가-힣][가-힣○◯OX*]{0,3})\\s?(?:${TITLES})${AFTER_TITLE}(?:님)?`, 'g'), reject: personReject },
  // 연락처·식별번호
  { id: 'pii.phone.mobile', type: 'PHONE', re: /(?<!\d)01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)/g },
  { id: 'pii.phone.landline', type: 'PHONE', re: /(?<!\d)0\d{1,2}-\d{3,4}-\d{4}(?!\d)/g },
  { id: 'pii.rrn', type: 'RRN', re: /(?<!\d)\d{6}[-\s]?[1-4]\d{6}(?!\d)/g },
  { id: 'pii.milid', type: 'MIL_ID', re: /(?<![\d-])\d{2}-\d{5,8}(?![\d-])/g },
  { id: 'pii.plate', type: 'PLATE', re: new RegExp(`(?<!\\d)\\d{2,3}\\s?[${PLATE_HANGUL}]\\s?\\d{4}(?!\\d)`, 'g') },
  { id: 'pii.email', type: 'EMAIL', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
];

/** 가이드 현장 팁: 훈련 일정(날짜+시간) 패턴 경고 (명세 §6.6) */
export const SCHEDULE_RE = /(\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*[./]\s*\d{1,2}(?!\d))[^\n]{0,12}?(\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?|\d{1,2}:\d{2})/g;
