/**
 * 오프라인 시연용 AI 대책 캐시 "초안" 만들기 (상용 AI 호출 없음).
 * 우선순위 상위 10개 + 주인공 이슈 중 scripts/seed-ai-drafts.ts에 초안이 있는 것만 씁니다.
 * maskedRequest는 실제 흐름(prepareSolutionRequest)으로 만들어 "외부로 나갈 텍스트"가 진짜와 같습니다.
 * 실행: npx tsx scripts/build-cache-drafts.ts   (실제 AI 캐시는 npm run ai-cache)
 */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSolutionFlowInput } from '../lib/core/ai';
import { listIssues } from '../lib/core/queries';
import { SEED_BASE_DATE, shiftDataset } from '../lib/core/dataset';
import { prepareSolutionRequest } from '../lib/llm/flow';
import { postProcessSolution } from '../lib/llm/schema';
import { seedDataset } from '../lib/data/seed';
import { AI_DRAFTS } from './seed-ai-drafts';

const ds = shiftDataset(seedDataset(), new Date(SEED_BASE_DATE));
const ctx = { ds, viewer: null, now: new Date(SEED_BASE_DATE) };
const ranked = listIssues(ctx);
const hero = ranked.find((i) => i.category === 'MEAL' && i.subtopic === '배식 대기시간')!;
const targets = [...new Set([...ranked.slice(0, 10).map((i) => i.id), hero.id])];
const dir = join(process.cwd(), 'data', 'demo', 'ai-cache');
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) unlinkSync(join(dir, f));

const written: string[] = [];
for (const id of targets) {
  const iss = ds.issues.find((i) => i.id === id)!;
  const draft = AI_DRAFTS[`${iss.category}|${iss.subtopic}`];
  if (!draft) { console.warn(`초안 없음: ${id} ${iss.subtopic}`); continue; }
  const input = buildSolutionFlowInput(ctx, id);
  const prep = prepareSolutionRequest(input, 'cache:seed-draft');
  writeFileSync(join(dir, `${id}.json`), JSON.stringify({
    issueId: id, solution: postProcessSolution(draft, input.bestPractices.map((b) => b.id)), maskedRequest: prep.maskedRequest,
    provider: 'cache:seed-draft', generatedAt: SEED_BASE_DATE, reviewed: false,
    note: '사람이 쓴 초안입니다. 발표 전 npm run ai-cache로 상용 AI 응답을 생성·검수해 교체하세요.',
  }, null, 1) + '\n');
  written.push(id);
}
writeFileSync(join(dir, 'index.json'), JSON.stringify({ issueIds: written }, null, 1) + '\n');
console.log('작성:', written.map((id) => `${id}(${ds.issues.find((i) => i.id === id)!.subtopic})`).join(', '));
