import { describe, expect, it } from 'vitest';
import { checkText, maskText, normalize, restoreDeep, restoreText, toStorableText, createSharedVault } from '../index';
import fixtures from './fixtures.json';
import { evaluate, type Fixture } from '../evaluate';

describe('normalize', () => {
  it('전각을 반각으로, 연속 공백을 하나로', () => {
    expect(normalize('３사단　　식당')).toBe('3사단 식당');
  });
});

describe('maskText: 규칙별 양성 사례', () => {
  const cases: Array<[string, string, string]> = [
    ['3사단 식당', 'UNIT', '3사단'],
    ['3 사단 식당', 'UNIT', '3 사단'],
    ['제3보병사단', 'UNIT', '제3보병사단'],
    ['○사단 식당 배식 줄', 'UNIT', '○사단'],
    ['백골부대 출신', 'UNIT', '백골부대'],
    ['김민수 상병이 안내', 'PERSON', '김민수 상병'],
    ['이준호 교관님 교육', 'PERSON', '이준호 교관님'],
    ['K2 소총', 'WEAPON', 'K2'],
    ['K2C1 상태', 'WEAPON', 'K2C1'],
    ['진지 공사', 'OPS', '진지'],
    ['탄약고 앞', 'FACILITY', '탄약고'],
    ['010-1234-5678', 'PHONE', '010-1234-5678'],
    ['21-12345678 확인', 'MIL_ID', '21-12345678'],
    ['900101-1234567', 'RRN', '900101-1234567'],
    ['12가 3456 차량', 'PLATE', '12가 3456'],
    ['a.b@example.com', 'EMAIL', 'a.b@example.com'],
  ];
  it.each(cases)('%s → %s', (text, type, original) => {
    const r = maskText(text);
    expect(r.entities.map((e) => [e.type, e.original])).toContainEqual([type, original]);
  });
});

describe('maskText: 음성 사례 (생활 단어는 가리지 않음)', () => {
  it.each([
    '식당 배식 줄이 너무 길어요',
    '우리 중대장님이 친절했어요',
    '소대장님 덕분에 빨리 끝났어요',
    '정말 진지하게 교육했어요',
    '부대찌개가 맛있었어요',
    '향방작계훈련 대기시간',
    '20대 후반 예비군',
    '지원사업 안내가 부족해요',
    '3단계 입소 절차',
    '와이파이 비밀번호 알려주세요',
  ])('%s', (text) => {
    const r = maskText(text);
    expect(r.entities).toEqual([]);
    expect(r.blocked).toBe(false);
  });
});

describe('토큰', () => {
  it('같은 원문은 같은 토큰', () => {
    const r = maskText('3사단 식당이 좁고 3사단 화장실도 더러워요. 5사단은 괜찮아요');
    const tokens = r.entities.filter((e) => e.type === 'UNIT').map((e) => e.token);
    expect(tokens).toEqual(['[부대_1]', '[부대_1]', '[부대_2]']);
    expect(r.masked).toBe('[부대_1] 식당이 좁고 [부대_1] 화장실도 더러워요. [부대_2]은 괜찮아요');
  });
  it('공백 변형("3 사단")도 같은 토큰', () => {
    const r = maskText('3사단과 3 사단');
    expect(new Set(r.entities.map((e) => e.token)).size).toBe(1);
  });
  it('여러 문장에서 vault 공유', () => {
    const sv = createSharedVault();
    const a = maskText('3사단 식당', { sharedVault: sv });
    const b = maskText('5사단, 3사단', { sharedVault: sv });
    expect(a.masked).toBe('[부대_1] 식당');
    expect(b.masked).toBe('[부대_2], [부대_1]');
    expect(sv.vault).toEqual({ '[부대_1]': '3사단', '[부대_2]': '5사단' });
  });
  it('저장용은 번호 없는 토큰', () => {
    const r = toStorableText('○사단 식당 배식 줄이 너무 길어요');
    expect(r).toEqual({ ok: true, text: '[부대] 식당 배식 줄이 너무 길어요', entityCount: 1 });
  });
  it('이미 가려진 토큰은 다시 가리지 않음', () => {
    const r = maskText('[부대] 식당과 [인물_1] 안내');
    expect(r.entities).toEqual([]);
  });
});

describe('복원', () => {
  it('토큰을 원문으로 되돌림', () => {
    const r = maskText('3사단 김민수 상병이 K2를 지급');
    const ai = `${r.entities[0].token} 배식구 증설, ${r.entities[1].token}에게 확인`;
    expect(restoreText(ai, r.vault)).toBe('3사단 배식구 증설, 김민수 상병에게 확인');
  });
  it('PII는 복원하지 않음', () => {
    const r = maskText('연락처 010-1234-5678, 3사단');
    expect(r.masked).toBe('연락처 [전화번호], [부대_1]');
    expect(Object.values(r.vault)).not.toContain('010-1234-5678');
    expect(restoreText(r.masked, r.vault)).toBe('연락처 [전화번호], 3사단');
  });
  it('JSON 전체 문자열 필드 복원', () => {
    const r = maskText('3사단');
    expect(restoreDeep({ a: '[부대_1]', b: ['[부대_1] 식당'], c: 3 }, r.vault)).toEqual({ a: '3사단', b: ['3사단 식당'], c: 3 });
  });
  it('vault에 없는 토큰은 그대로', () => {
    expect(restoreText('[부대_9]', {})).toBe('[부대_9]');
  });
});

describe('차단', () => {
  it.each([
    ['52SCG 12345 67890 지점', '좌표 포함'],
    ['37.5123, 127.0456', '좌표 포함'],
    ['암구호를 몰라서', '암구호·출입 비밀번호 언급'],
    ['작전계획 내용', '작전계획 언급'],
    ['탄약고 위치가 식당 뒤', '주요 시설 위치 언급'],
    ['경계가 취약해 보였어요', '경계·보안 취약점 언급'],
  ])('%s', (text, reason) => {
    const r = maskText(text);
    expect(r.blocked).toBe(true);
    expect(r.blockReasons).toContain(reason);
    expect(toStorableText(text).ok).toBe(false);
  });
});

describe('checkText', () => {
  it('ok / warn / block', () => {
    expect(checkText('식당이 좁아요').level).toBe('ok');
    expect(checkText('3사단 식당이 좁아요').level).toBe('warn');
    expect(checkText('37.5123, 127.0456 식당').level).toBe('block');
  });
  it('가이드: 훈련 일정 경고', () => {
    const r = checkText('10월 21일 오전 9시까지 입소', { scheduleWarn: true });
    expect(r.level).toBe('warn');
    expect(r.findings[0].type).toBe('SCHEDULE');
    expect(checkText('10월 21일 오전 9시까지 입소').level).toBe('ok');
  });
});

describe('탐지율 (fixtures)', () => {
  it('마스킹·차단 대상 재현율 95% 이상, 오차단 없음', () => {
    const r = evaluate(fixtures as Fixture[]);
    expect(fixtures.length).toBeGreaterThanOrEqual(100);
    expect(r.recall).toBeGreaterThanOrEqual(0.95);
    expect(r.targetSentenceRecall).toBeGreaterThanOrEqual(0.95);
    expect(r.falseBlocks).toBe(0);
  });
});

describe('시드 제안 기준 (규칙과 따로 작성된 문장)', () => {
  it('기대 유형 재현율 95% 이상, 오차단 없음', async () => {
    const { evaluateSeed } = await import('../evaluate');
    const ps = (await import('../../../data/demo/proposals.json')).default;
    const r = evaluateSeed(ps);
    expect(r.withTargets).toBeGreaterThan(30);
    expect(r.typeRecall).toBeGreaterThanOrEqual(0.95);
    expect(r.falseBlocks).toBe(0);
  });
});
