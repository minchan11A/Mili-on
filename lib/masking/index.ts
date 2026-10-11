/**
 * 보안 마스킹 엔진 (명세 §5.2).
 * - 순수 TypeScript. Node 전용 API를 쓰지 않으므로 브라우저(시연 모드)와 서버에서 같은 코드가 돕니다.
 * - 처리 순서: 정규화 → 차단 검사 → 마스킹(정규식 → 사전 → 이름 패턴, 겹치면 긴 매치 우선) → 토큰 부여
 * - 엔티티의 start/end는 정규화된 텍스트 기준입니다.
 */
import { DICTIONARY, EXCLUDE_AFTER, type DictType } from './dictionary';
import {
  BLOCK_RULES, MASK_RULES, PII_TYPES, SCHEDULE_RE, TOKEN_LABEL, ENTITY_TYPE_LABEL,
  type EntityType,
} from './rules';

export type { EntityType } from './rules';
export { ENTITY_TYPE_LABEL, TOKEN_LABEL, PII_TYPES } from './rules';

export interface Entity {
  type: EntityType;
  original: string;
  token: string;          // "[부대_1]"
  start: number; end: number;
  rule: string;           // 어떤 규칙에 걸렸는지 (감사·디버깅용)
}

export interface MaskResult {
  masked: string;
  entities: Entity[];
  vault: Record<string, string>;   // token -> original. 외부로 절대 보내지 않음.
  blocked: boolean;
  blockReasons: string[];          // ["좌표 포함", "작전계획 언급"]
  /** 정규화된 입력 (entities의 start/end 기준) */
  normalized: string;
}

export interface MaskOptions {
  /**
   * true(기본): "[부대_1]"처럼 번호를 붙이고 vault에 담습니다 (AI 전송용).
   * false: "[부대]"처럼 번호 없이 가립니다 (저장용. 복원 불가).
   */
  numbered?: boolean;
  /** 이미 쓰인 토큰을 이어서 쓸 때 (여러 제안을 하나의 vault로 합칠 때) */
  sharedVault?: SharedVault;
}

export type FindingType = EntityType | 'BLOCK' | 'SCHEDULE';

export interface CheckFinding { type: FindingType; start: number; end: number; message: string }
export interface CheckResult {
  level: 'ok' | 'warn' | 'block';
  findings: CheckFinding[];
  normalized: string;
}

/* ───────────────────────── 정규화 ───────────────────────── */

export function normalize(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0xff01 && c <= 0xff5e) out += String.fromCodePoint(c - 0xfee0);   // 전각 → 반각
    else if (c === 0x3000 || c === 0x00a0 || c === 0x2002 || c === 0x2003 || c === 0x2009) out += ' ';
    else if (c === 0x2010 || c === 0x2011 || c === 0x2012 || c === 0x2013 || c === 0x2014 || c === 0x2212) out += '-';
    else out += ch;
  }
  // 줄바꿈은 유지하고 연속 공백은 하나로
  return out.replace(/[ \t\f\v]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ───────────────────────── 차단 검사 ───────────────────────── */

interface BlockHit { start: number; end: number; reason: string; rule: string }

function findBlocks(text: string): BlockHit[] {
  const hits: BlockHit[] = [];
  for (const r of BLOCK_RULES) {
    r.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.re.exec(text))) {
      if (m[0].length === 0) { r.re.lastIndex++; continue; }
      hits.push({ start: m.index, end: m.index + m[0].length, reason: r.reason, rule: r.id });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

/* ───────────────────────── 후보 수집 ───────────────────────── */

interface Candidate { type: EntityType; start: number; end: number; rule: string }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let dictCache: Array<{ type: EntityType; word: string; re: RegExp }> | null = null;
function dictionaryPatterns() {
  if (dictCache) return dictCache;
  const list: Array<{ type: EntityType; word: string; re: RegExp }> = [];
  (Object.keys(DICTIONARY) as DictType[]).forEach((type) => {
    for (const word of DICTIONARY[type]) {
      const ascii = /^[A-Za-z0-9.]+$/.test(word);
      let body = escapeRe(word);
      if (/^K\d/i.test(word)) body = 'K-?' + escapeRe(word.slice(1));     // "K-2" 표기 허용
      if (/^M\d/i.test(word)) body = 'M-?' + escapeRe(word.slice(1));
      const excl = EXCLUDE_AFTER[word];
      const tail = excl && excl.length ? `(?!${excl.map(escapeRe).join('|')})` : '';
      // 영문·숫자 장비명은 앞뒤가 영숫자가 아니어야 함 ("K2C1"의 "K2"는 더 긴 매치가 이김)
      const src = ascii ? `(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])${tail}` : `${body}${tail}`;
      list.push({ type, word, re: new RegExp(src, ascii ? 'gi' : 'g') });
    }
  });
  dictCache = list;
  return list;
}

/** 이미 가려진 토큰("[부대_1]", "[전화번호]")은 다시 건드리지 않음 */
const TOKEN_RE = /\[(?:부대|장비|작전용어|시설|위치|인물|전화번호|군번|주민번호|차량번호|이메일)(?:_\d+)?\]/g;

function collectCandidates(text: string): Candidate[] {
  const out: Candidate[] = [];
  const tokenSpans: Array<[number, number]> = [];
  TOKEN_RE.lastIndex = 0;
  let t: RegExpExecArray | null;
  while ((t = TOKEN_RE.exec(text))) tokenSpans.push([t.index, t.index + t[0].length]);
  const inToken = (s: number, e: number) => tokenSpans.some(([a, b]) => s < b && e > a);

  // 1) 정규식 규칙
  for (const rule of MASK_RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text))) {
      if (m[0].length === 0) { rule.re.lastIndex++; continue; }
      if (rule.reject?.(m, text)) {
        // 이름형 규칙은 앞말을 한 글자씩 줄여 다시 시도할 수 있게 다음 위치로 이동
        rule.re.lastIndex = m.index + 1;
        continue;
      }
      let start = m.index;
      let end = m.index + m[0].length;
      // 앞뒤 공백 제거
      while (text[start] === ' ') start++;
      while (end > start && text[end - 1] === ' ') end--;
      if (!inToken(start, end)) out.push({ type: rule.type, start, end, rule: rule.id });
    }
  }
  // 2) 사전
  for (const d of dictionaryPatterns()) {
    d.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = d.re.exec(text))) {
      const start = m.index, end = m.index + m[0].length;
      if (!inToken(start, end)) out.push({ type: d.type, start, end, rule: `dict.${d.type.toLowerCase()}:${d.word}` });
    }
  }
  return out;
}

/** 우선순위: 길이가 긴 것 → 앞에 있는 것 → 정규식 규칙(사전보다 구체적) */
function resolveOverlaps(cands: Candidate[]): Candidate[] {
  const sorted = [...cands].sort((a, b) =>
    (b.end - b.start) - (a.end - a.start) || a.start - b.start || (a.rule.startsWith('dict') ? 1 : 0) - (b.rule.startsWith('dict') ? 1 : 0));
  const taken: Candidate[] = [];
  for (const c of sorted) {
    if (taken.some((t) => c.start < t.end && c.end > t.start)) continue;
    taken.push(c);
  }
  return taken.sort((a, b) => a.start - b.start);
}

/* ───────────────────────── 토큰 ───────────────────────── */

/** 여러 텍스트에 같은 토큰 번호를 쓰기 위한 공유 상태 */
export interface SharedVault {
  vault: Record<string, string>;
  /** `${type}|${key}` -> token */
  byKey: Map<string, string>;
  counters: Partial<Record<EntityType, number>>;
}
export function createSharedVault(): SharedVault {
  return { vault: {}, byKey: new Map(), counters: {} };
}

const keyOf = (type: EntityType, original: string) => `${type}|${original.replace(/\s+/g, '').toUpperCase()}`;

function tokenFor(type: EntityType, original: string, numbered: boolean, sv: SharedVault): string {
  const label = TOKEN_LABEL[type];
  if (PII_TYPES.has(type)) return `[${label}]`;      // 개인정보: 번호 없음, 복원 안 함
  if (!numbered) return `[${label}]`;
  const key = keyOf(type, original);
  const existing = sv.byKey.get(key);
  if (existing) return existing;
  const n = (sv.counters[type] ?? 0) + 1;
  sv.counters[type] = n;
  const token = `[${label}_${n}]`;
  sv.byKey.set(key, token);
  sv.vault[token] = original;
  return token;
}

/* ───────────────────────── 공개 함수 ───────────────────────── */

/** AI로 보내기 전 */
export function maskText(text: string, opts: MaskOptions = {}): MaskResult {
  const numbered = opts.numbered ?? true;
  const sv = opts.sharedVault ?? createSharedVault();
  const normalized = normalize(text ?? '');

  const blocks = findBlocks(normalized);
  const blockReasons = Array.from(new Set(blocks.map((b) => b.reason)));

  const chosen = resolveOverlaps(collectCandidates(normalized));
  const entities: Entity[] = [];
  let masked = '';
  let cursor = 0;
  for (const c of chosen) {
    const original = normalized.slice(c.start, c.end);
    const token = tokenFor(c.type, original, numbered, sv);
    entities.push({ type: c.type, original, token, start: c.start, end: c.end, rule: c.rule });
    masked += normalized.slice(cursor, c.start) + token;
    cursor = c.end;
  }
  masked += normalized.slice(cursor);

  // 이 텍스트에 쓰인 토큰만 담은 vault (공유 vault는 opts.sharedVault.vault에 누적)
  const vault: Record<string, string> = {};
  for (const e of entities) if (sv.vault[e.token] !== undefined) vault[e.token] = sv.vault[e.token];

  return { masked, entities, vault, blocked: blocks.length > 0, blockReasons, normalized };
}

/** AI 응답을 받은 뒤. PII 토큰은 vault에 없으므로 그대로 남습니다. */
export function restoreText(text: string, vault: Record<string, string>): string {
  if (!text) return text;
  return text.replace(/\[[가-힣]+_\d+\]/g, (tok) => (vault[tok] !== undefined ? vault[tok] : tok));
}

/** 객체 안 모든 문자열 필드에 restoreText 적용 (AI 응답 JSON용) */
export function restoreDeep<T>(value: T, vault: Record<string, string>): T {
  if (typeof value === 'string') return restoreText(value, vault) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => restoreDeep(v, vault)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = restoreDeep(v, vault);
    return out as T;
  }
  return value;
}

const FINDING_MESSAGE: Record<EntityType, string> = {
  UNIT: '부대명은 자동으로 가려져 저장됩니다',
  WEAPON: '장비명은 자동으로 가려져 저장됩니다',
  OPS: '작전 용어는 자동으로 가려져 저장됩니다',
  FACILITY: '군사 시설명은 자동으로 가려져 저장됩니다',
  LOCATION: '상세 위치는 자동으로 가려져 저장됩니다',
  PERSON: '사람 이름·계급은 자동으로 가려져 저장됩니다',
  PHONE: '전화번호는 저장되지 않습니다',
  MIL_ID: '군번은 저장되지 않습니다',
  RRN: '주민등록번호는 저장되지 않습니다',
  PLATE: '차량번호는 저장되지 않습니다',
  EMAIL: '이메일은 저장되지 않습니다',
};

/** 작성 화면 실시간 검사: 저장 전에 경고 표시용. 위치는 정규화된 텍스트 기준. */
export function checkText(text: string, opts: { scheduleWarn?: boolean } = {}): CheckResult {
  const normalized = normalize(text ?? '');
  const findings: CheckFinding[] = [];
  for (const b of findBlocks(normalized)) {
    findings.push({ type: 'BLOCK', start: b.start, end: b.end, message: `${b.reason}: 좌표·작전 관련 내용은 등록할 수 없습니다` });
  }
  const r = maskText(normalized, { numbered: false });
  for (const e of r.entities) findings.push({ type: e.type, start: e.start, end: e.end, message: FINDING_MESSAGE[e.type] });
  if (opts.scheduleWarn) {
    SCHEDULE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SCHEDULE_RE.exec(normalized))) {
      findings.push({ type: 'SCHEDULE', start: m.index, end: m.index + m[0].length, message: '훈련 일정(날짜·시간)은 공개하지 않는 것이 좋습니다' });
    }
  }
  findings.sort((a, b) => a.start - b.start);
  const level = findings.some((f) => f.type === 'BLOCK') ? 'block' : findings.length ? 'warn' : 'ok';
  return { level, findings, normalized };
}

/** 저장용 본문: 번호 없는 토큰으로 가림. 차단이면 저장하지 않음. */
export function toStorableText(text: string): { ok: true; text: string; entityCount: number } | { ok: false; reasons: string[] } {
  const r = maskText(text, { numbered: false });
  if (r.blocked) return { ok: false, reasons: r.blockReasons };
  return { ok: true, text: r.masked, entityCount: r.entities.length };
}

export function countEntities(entities: Array<{ type: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entities) out[e.type] = (out[e.type] ?? 0) + 1;
  return out;
}

export { ENTITY_TYPE_LABEL as ENTITY_LABEL };
