/**
 * 서버 모드 API 스모크 테스트. 서버를 띄운 뒤 실행:
 *   BASE_URL=http://localhost:3000 SEED_PASSWORD=demo1234 npx tsx scripts/smoke-server.ts
 * 로그인 → 조회 → 제안(마스킹·차단) → 권한 → AI 대책(키 없으면 캐시 대체) → 결정 → 감사 로그
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const PW = process.env.SEED_PASSWORD ?? 'demo1234';
let failures = 0;

class Client {
  cookie = '';
  async req(method: string, path: string, body?: unknown) {
    const res = await fetch(`${BASE}/api${path}`, {
      method, headers: { 'content-type': 'application/json', cookie: this.cookie }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual',
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => null) as any };
  }
  login(id: string) { return this.req('POST', '/auth/login', { loginId: id, password: PW }); }
}

function check(name: string, cond: boolean, extra?: unknown) {
  console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ` ${JSON.stringify(extra)?.slice(0, 300)}`}`);
  if (!cond) failures++;
}

async function main() {
  const anon = new Client();
  check('health', (await anon.req('GET', '/health')).data?.ok === true);
  check('비로그인 지도 조회', (await anon.req('GET', '/ranges')).data?.length === 24);
  check('비로그인 제안 작성 거부 403', (await anon.req('POST', '/proposals', { rangeId: 'rng_R_A01', category: 'MEAL', title: 't', body: 'b' })).status === 403);
  check('잘못된 비밀번호 거부', (await anon.req('POST', '/auth/login', { loginId: 'reservist', password: 'x' })).status === 400);

  const res = new Client();
  check('예비군 로그인', (await res.login('demo')).status === 200);
  const el = (await res.req('GET', '/ranges/rng_R_A01/review-eligibility')).data;
  check('평가 자격 (A훈련장)', el?.eligible === true, el);
  const { SURVEY_QUESTIONS } = await import('../lib/survey');
  const answers = Object.fromEntries(SURVEY_QUESTIONS.map((q) => [q.id, q.id.startsWith('meal') ? 1 : 4]));
  const sv = await res.req('POST', '/reviews', { rangeId: 'rng_R_A01', recordId: el?.recordId, answers, comment: '김민수 상병님께 물어보면 친절해요' });
  check('설문 제출 → 지표 점수 + 말 마스킹', sv.status === 201 && sv.data?.scores?.scoreMeal === 1 && sv.data?.comment === '[인물]께 물어보면 친절해요', sv.data);
  check('설문 중복 거부', (await res.req('POST', '/reviews', { rangeId: 'rng_R_A01', recordId: el?.recordId, answers })).status === 400);
  const self = await res.req('POST', '/reviews', { rangeId: 'rng_R_B02', selfReport: { trainingType: 'MOBILIZATION', completedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() }, answers });
  check('본인 입력 훈련으로 설문', self.status === 201, self.data);
  const created = await res.req('POST', '/proposals', { rangeId: 'rng_R_A01', category: 'MEAL', subtopic: '배식 대기시간', title: '배식 줄', body: '○사단 식당 배식 줄이 너무 길어요. 김민수 상병 010-1234-5678' });
  check('제안 작성 201 + 서버 재마스킹', created.status === 201 && created.data?.body === '[부대] 식당 배식 줄이 너무 길어요. [인물] [전화번호]', created.data);
  const blocked = await res.req('POST', '/proposals', { rangeId: 'rng_R_A01', category: 'MEAL', title: '위치', body: '37.5123, 127.0456 식당' });
  check('좌표 → 422 BLOCKED', blocked.status === 422 && blocked.data?.code === 'BLOCKED', blocked.data);
  const sim = await res.req('POST', '/proposals/similar', { rangeId: 'rng_R_A01', text: '점심 배식 줄이 너무 길어요', category: 'MEAL' });
  check('유사 제안', Array.isArray(sim.data) && sim.data.length > 0, sim.data);
  const target = sim.data?.[0]?.id;
  const emp = await res.req('POST', `/proposals/${target}/empathy`);
  check('공감 토글', emp.status === 200 && typeof emp.data?.empathized === 'boolean', emp.data);
  check('예비군 상태 변경 거부 403', (await res.req('PATCH', `/proposals/${target}/status`, { to: 'PLANNED', note: 'x' })).status === 403);
  check('예비군 AI 대책 거부 403', (await res.req('POST', '/issues/iss_001/solution')).status === 403);
  check('예비군 대시보드 거부 403', (await res.req('GET', '/dashboard')).status === 403);

  const mgr = new Client();
  await mgr.login('manager_ra01');
  const other = (await mgr.req('GET', '/proposals?rangeId=rng_R_B02&pageSize=1')).data.items[0].id;
  check('A 담당자: 다른 훈련장 상태 변경 거부', (await mgr.req('PATCH', `/proposals/${other}/status`, { to: 'PLANNED', note: 'x' })).status === 403);
  check('담당자: 메모 없는 상태 변경 거부', (await mgr.req('PATCH', `/proposals/${created.data.id}/status`, { to: 'REVIEWING' })).status === 400);
  const st = await mgr.req('PATCH', `/proposals/${created.data.id}/status`, { to: 'REVIEWING', note: '현장 확인 중' });
  check('담당자: 상태 변경', st.data?.status === 'REVIEWING' && st.data?.history?.length === 2, st.data);
  check('담당자 화면: 작성자 통계 속성만', /^예비군\(/.test(st.data?.authorLabel ?? ''), st.data?.authorLabel);
  check('감사 로그는 정책 담당자만', (await mgr.req('GET', '/audit')).status === 403);

  const pol = new Client();
  await pol.login('policy');
  const dash = await pol.req('GET', '/dashboard');
  check('대시보드 1위 이슈 = 배식 대기시간', dash.data?.topIssues?.[0]?.subtopic === '배식 대기시간', dash.data?.topIssues?.[0]);
  const sol = await pol.req('POST', '/issues/iss_001/solution');
  check('AI 대책 생성', sol.status === 201 && !!sol.data?.solution?.problemSummary, sol.data);
  check('외부 전송 텍스트에 원문 없음', !/○사단|김민수|010-1234/.test(sol.data?.maskedRequest ?? ''), null);
  if (!process.env.LLM_API_KEY) check('키 없음 → 캐시 대체 안내', !!sol.data?.fallbackNotice, sol.data?.fallbackNotice);
  const dec = await pol.req('PATCH', `/solutions/${sol.data.id}`, { decision: 'ADOPTED', bulkStatus: 'PLANNED', bulkNote: '조치 계획 수립', replyBody: '배식구를 늘리겠습니다' });
  check('채택 + 일괄 상태 변경', dec.data?.decision === 'ADOPTED', dec.data);
  const after = await pol.req('GET', `/proposals/${created.data.id}`);
  check('관련 제안 상태·공식 답변 반영', after.data?.status === 'PLANNED' && after.data?.reply?.body === '배식구를 늘리겠습니다', after.data);
  const audit = await pol.req('GET', '/audit');
  check('감사 로그 기록', audit.data?.total > 0 && audit.data.items[0].purpose === 'AI_SOLUTION', audit.data?.items?.[0]);
  const mc = await anon.req('POST', '/masking/check', { text: '3사단 K2 소총' });
  check('서버 마스킹 체험 (vault 미반환)', mc.data?.masked === '[부대_1] [장비_1] [장비_2]' && !('vault' in mc.data), mc.data);
  let limited = false;
  for (let i = 0; i < 6; i++) if ((await pol.req('POST', '/issues/iss_001/solution')).status === 429) limited = true;
  check('AI 호출 분당 5회 제한', limited);

  if (process.env.SUPABASE_TEST_TOKEN) {
    const sb = new Client();
    check('Supabase: 잘못된 토큰 거부', (await sb.req('POST', '/auth/supabase', { accessToken: 'wrong-token-0123456789abcdef' })).status === 401);
    const first = await sb.req('POST', '/auth/supabase', { accessToken: process.env.SUPABASE_TEST_TOKEN, nickname: '새예비군', ageBand: '20대 초반' });
    check('Supabase: 첫 로그인 → 예비군 계정 생성 + 세션', first.status === 200 && first.data?.role === 'RESERVIST' && first.data?.nickname === '새예비군', first.data);
    check('Supabase: 세션으로 /me', (await sb.req('GET', '/me')).data?.id === first.data?.id);
    const again = await new Client().req('POST', '/auth/supabase', { accessToken: process.env.SUPABASE_TEST_TOKEN });
    check('Supabase: 다시 로그인하면 같은 계정', again.data?.id === first.data?.id, again.data);
    check('Supabase 사용자: 담당자 권한 없음', (await sb.req('GET', '/dashboard')).status === 403);
  }

  console.log(failures ? `\n${failures}개 실패` : '\n모두 통과');
  process.exit(failures ? 1 : 0);
}

main();
