import { maskText } from './index';

export interface Fixture {
  kind: 'normal' | 'mask' | 'block';
  text: string;
  blocked: boolean;
  /** null이면 엔티티는 채점하지 않음 (차단 문장) */
  entities: Array<{ type: string; text: string }> | null;
  reasons?: string[];
}

export interface EvalReport {
  total: number;
  counts: Record<Fixture['kind'], number>;
  expectedEntities: number; foundExpected: number; extraFound: number; totalFound: number;
  recall: number; precision: number;
  blockTotal: number; blockCaught: number; falseBlocks: number; blockAccuracy: number;
  /** 마스킹·차단 대상 문장 재현율 (문장 단위: 대상을 하나도 빠짐없이 처리한 비율) */
  targetSentenceRecall: number;
  misses: Array<{ text: string; missing: string[] }>;
  extras: Array<{ text: string; extra: string[] }>;
  blockMisses: string[]; falseBlockTexts: string[];
}

const norm = (s: string) => s.replace(/\s+/g, '');

export function evaluate(fixtures: Fixture[]): EvalReport {
  let expectedEntities = 0, foundExpected = 0, extraFound = 0, totalFound = 0;
  let blockTotal = 0, blockCaught = 0, falseBlocks = 0, correctBlockDecisions = 0;
  let targetSentences = 0, targetOk = 0;
  const misses: EvalReport['misses'] = [], extras: EvalReport['extras'] = [];
  const blockMisses: string[] = [], falseBlockTexts: string[] = [];
  const counts = { normal: 0, mask: 0, block: 0 };

  for (const f of fixtures) {
    counts[f.kind]++;
    const r = maskText(f.text);
    if (f.blocked) {
      blockTotal++;
      if (r.blocked) { blockCaught++; correctBlockDecisions++; } else blockMisses.push(f.text);
    } else {
      if (r.blocked) { falseBlocks++; falseBlockTexts.push(f.text); } else correctBlockDecisions++;
    }
    if (f.kind !== 'normal') targetSentences++;

    if (f.entities === null) { if (r.blocked) targetOk++; continue; }
    totalFound += r.entities.length;
    const got = r.entities.map((e) => ({ type: e.type as string, text: norm(e.original), used: false }));
    const missing: string[] = [];
    for (const exp of f.entities) {
      expectedEntities++;
      const hit = got.find((g) => !g.used && g.type === exp.type && (g.text === norm(exp.text) || g.text.includes(norm(exp.text)) || norm(exp.text).includes(g.text)));
      if (hit) { hit.used = true; foundExpected++; } else missing.push(`${exp.type}:${exp.text}`);
    }
    const extra = got.filter((g) => !g.used).map((g) => `${g.type}:${g.text}`);
    extraFound += extra.length;
    if (missing.length) misses.push({ text: f.text, missing });
    if (extra.length) extras.push({ text: f.text, extra });
    if (f.kind === 'mask' && missing.length === 0) targetOk++;
  }
  const pct = (a: number, b: number) => (b === 0 ? 1 : a / b);
  return {
    total: fixtures.length, counts,
    expectedEntities, foundExpected, extraFound, totalFound,
    recall: pct(foundExpected, expectedEntities),
    precision: pct(totalFound - extraFound, totalFound),
    blockTotal, blockCaught, falseBlocks,
    blockAccuracy: pct(correctBlockDecisions, fixtures.length),
    targetSentenceRecall: pct(targetOk, targetSentences),
    misses, extras, blockMisses, falseBlockTexts,
  };
}

/** 시드 제안(원문 + maskExpected)으로 측정: 규칙과 별개로 작성된 문장이라 자체 평가 문장보다 공정한 지표 */
export interface SeedEvalReport { total: number; withTargets: number; typeRecall: number; foundTypes: number; expectedTypes: number; falseBlocks: number; misses: Array<{ id: string; text: string; missing: string[] }> }

const SEED_TYPE: Record<string, string> = { FACILITY_MIL: 'FACILITY' };

export function evaluateSeed(proposals: Array<{ id: string; title: string; body: string; maskExpected?: string[] }>): SeedEvalReport {
  let expectedTypes = 0, foundTypes = 0, falseBlocks = 0, withTargets = 0;
  const misses: SeedEvalReport['misses'] = [];
  for (const p of proposals) {
    const r = maskText(`${p.title}\n${p.body}`);
    if (r.blocked) falseBlocks++;
    const exp = (p.maskExpected ?? []).map((t) => SEED_TYPE[t] ?? t);
    if (!exp.length) continue;
    withTargets++;
    const got = new Set(r.entities.map((e) => e.type as string));
    const missing = exp.filter((t) => !got.has(t));
    expectedTypes += exp.length;
    foundTypes += exp.length - missing.length;
    if (missing.length) misses.push({ id: p.id, text: p.body, missing });
  }
  return { total: proposals.length, withTargets, expectedTypes, foundTypes, typeRecall: expectedTypes ? foundTypes / expectedTypes : 1, falseBlocks, misses };
}
