/**
 * 마스킹 탐지율 측정 (명세 §5.2, §12)
 * 실행: npx tsx scripts/masking-eval.ts
 * 결과를 콘솔과 docs/masking-eval.md 에 씁니다. 수치는 발표자료에 그대로 씁니다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import fixtures from '../lib/masking/__tests__/fixtures.json';
import { evaluate, type Fixture } from '../lib/masking/evaluate';

const r = evaluate(fixtures as Fixture[]);
const p = (x: number) => `${(x * 100).toFixed(1)}%`;

const lines = [
  '# 마스킹 탐지율 측정 결과',
  '',
  `- 측정일: ${new Date().toISOString().slice(0, 10)}`,
  `- 평가 문장: ${r.total}개 (일반 ${r.counts.normal} · 마스킹 대상 ${r.counts.mask} · 차단 대상 ${r.counts.block}), 모두 가상 문장`,
  `- 정답 파일: \`lib/masking/__tests__/fixtures.json\``,
  '',
  '| 지표 | 값 | 설명 |',
  '| --- | --- | --- |',
  `| 엔티티 재현율 | **${p(r.recall)}** (${r.foundExpected}/${r.expectedEntities}) | 가려야 할 표현 중 실제로 가린 비율 |`,
  `| 정밀도 | **${p(r.precision)}** (${r.totalFound - r.extraFound}/${r.totalFound}) | 가린 것 중 가려야 했던 비율 (과잉 마스킹 = ${r.extraFound}건) |`,
  `| 차단 재현율 | **${p(r.blockTotal ? r.blockCaught / r.blockTotal : 1)}** (${r.blockCaught}/${r.blockTotal}) | 차단 대상 문장 중 실제로 차단한 비율 |`,
  `| 오차단 | ${r.falseBlocks}건 | 차단하면 안 되는 문장을 차단한 수 |`,
  `| 차단 판정 정확도 | ${p(r.blockAccuracy)} | 전체 문장 중 차단 여부를 맞게 판정한 비율 |`,
  `| 마스킹·차단 대상 문장 재현율 | **${p(r.targetSentenceRecall)}** | 대상 문장 중 빠짐없이 처리한 문장 비율 (목표 95% 이상) |`,
  '',
];
if (r.misses.length) {
  lines.push('## 놓친 사례', '', ...r.misses.map((m) => `- ${m.text} → 놓침: ${m.missing.join(', ')}`), '');
}
if (r.extras.length) {
  lines.push('## 과잉 마스킹 사례', '', ...r.extras.map((m) => `- ${m.text} → 추가로 가림: ${m.extra.join(', ')}`), '');
}
if (r.blockMisses.length) lines.push('## 차단 누락', '', ...r.blockMisses.map((t) => `- ${t}`), '');
if (r.falseBlockTexts.length) lines.push('## 오차단', '', ...r.falseBlockTexts.map((t) => `- ${t}`), '');
lines.push(
  '> 주의: 평가 문장은 규칙 작성 과정에서 함께 만든 것이므로 실제 후기 문장에서는 수치가 낮게 나올 수 있습니다.',
  '> 발표 전, 규칙을 보지 않은 사람이 쓴 문장을 fixtures.json에 추가해 다시 측정하세요.',
  '',
);
lines.push('> 놓친 사례는 `lib/masking/rules.ts` 또는 `lib/masking/dictionary.json`에 규칙을 추가해 개선합니다.', '');

const md = lines.join('\n');
console.log(md);
mkdirSync(join(process.cwd(), 'docs'), { recursive: true });
writeFileSync(join(process.cwd(), 'docs', 'masking-eval.md'), md);
