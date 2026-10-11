/**
 * AI 응답 캐시 생성 (명세 §8.2)
 * 1. 우선순위 상위 이슈 10개 + 주인공 이슈 선택
 * 2. §5.3 흐름 그대로: 마스킹 → 상용 AI 호출 → 복원
 * 3. data/demo/ai-cache/{issueId}.json 에 { solution, maskedRequest, provider, generatedAt, reviewed:false } 저장
 * 4. 사람이 전부 읽고 고친 뒤 "reviewed": true 로 바꿉니다.
 *
 * 실행: LLM_PROVIDER=claude LLM_API_KEY=... npm run ai-cache
 *   (package.json 스크립트가 --conditions react-server 로 실행해 서버 전용 모듈을 불러옵니다)
 * 옵션: --only ISS-MEAL-01,ISS-FAC-01   --dry (AI 호출 없이 외부로 나갈 텍스트만 출력)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildSolutionFlowInput } from '../lib/core/ai';
import { listIssues } from '../lib/core/queries';
import { shiftDataset } from '../lib/core/dataset';
import { createCommercialProvider, type CommercialName } from '../lib/llm/commercial';
import { prepareSolutionRequest, runSolutionFlow } from '../lib/llm/flow';
import { seedDataset } from '../lib/data/seed';

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1]?.split(',') : null;
  const name = (process.env.LLM_PROVIDER ?? 'claude') as CommercialName;
  const key = process.env.LLM_API_KEY;
  if (!dry && !key) { console.error('LLM_API_KEY가 필요합니다 (또는 --dry)'); process.exit(1); }

  const dir = join(process.cwd(), 'data', 'demo');
  const ds = shiftDataset(seedDataset());
  const ctx = { ds, viewer: null };
  const ranked = listIssues(ctx);
  const hero = ranked.find((i) => i.category === 'MEAL' && i.subtopic === '배식 대기시간');
  let targets = ranked.slice(0, 10).map((i) => i.id);
  if (hero && !targets.includes(hero.id)) targets.push(hero.id);
  if (only) targets = only;

  const provider = dry ? null : createCommercialProvider(name, key!, process.env.LLM_MODEL || undefined);
  const indexPath = join(dir, 'ai-cache', 'index.json');
  const index = existsSync(indexPath) ? (JSON.parse(readFileSync(indexPath, 'utf8')) as { issueIds: string[] }) : { issueIds: [] };

  for (const issueId of targets) {
    const input = buildSolutionFlowInput(ctx, issueId);
    if (dry) {
      const prep = prepareSolutionRequest(input, 'dry');
      console.log(`\n===== ${issueId} (차단 제외 ${prep.blockedCount}건) =====\n${prep.maskedRequest}`);
      continue;
    }
    process.stdout.write(`${issueId} 생성 중… `);
    try {
      const r = await runSolutionFlow(provider!, input);
      writeFileSync(join(dir, 'ai-cache', `${issueId}.json`), JSON.stringify({
        issueId, solution: r.solution, maskedRequest: r.maskedRequest, provider: provider!.name,
        generatedAt: new Date().toISOString(), reviewed: false,
      }, null, 1) + '\n');
      if (!index.issueIds.includes(issueId)) index.issueIds.push(issueId);
      console.log(`완료 (차단 제외 ${r.blockedCount}건)`);
    } catch (e) {
      console.log(`실패: ${(e as Error).message}`);
    }
  }
  if (!dry) writeFileSync(indexPath, JSON.stringify(index, null, 1) + '\n');
  console.log('\n⚠️ 생성된 파일을 사람이 모두 읽고 검수한 뒤 "reviewed": true 로 바꾸세요. 지어낸 수치·규정이 없는지 확인하세요.');
}

main();
