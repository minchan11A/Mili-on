import { expect, test, type Page } from '@playwright/test';

/** 시연 시나리오 7단계 (명세 §15.2) + 마스킹 체험. 인터넷 없이 동작해야 함 */

function watchExternal(page: Page) {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) external.push(r.url());
  });
  return external;
}

async function switchRole(page: Page, role: 'RESERVIST' | 'RANGE_MANAGER' | 'POLICY_ADMIN') {
  await page.getByTestId('role-switch').selectOption(role);
  await expect(page.getByTestId('role-switch')).toHaveValue(role);
}

test('시연 시나리오: 지도 → 제안(보안 경고) → 공감 → 정책 담당자 AI 대책 → 수정 채택 → 예비군 확인', async ({ page }) => {
  const external = watchExternal(page);

  // 0. 초기 상태: 시연 모드 배지, 예시 데이터 문구
  await page.goto('/map/');
  await expect(page.getByTestId('demo-badge')).toBeVisible();
  await expect(page.getByTestId('example-data-footer')).toContainText('예시 데이터');

  // 1. 예비군: 지도 → A훈련장 핀 → 방사형 그래프, 식사 점수가 낮음
  await expect(page.getByTestId('korea-map')).toBeVisible({ timeout: 1_000 + 5_000 });
  for (let i = 0; i < 4 && !(await page.getByTestId('pin-range-a').isVisible()); i++) {
    await page.locator('[data-testid="pin-cluster"][data-ids~="range-a"]').click();
    await page.waitForTimeout(450);
  }
  await page.getByTestId('pin-range-a').click();
  const panel = page.getByTestId('range-panel');
  await expect(panel).toContainText('A훈련장');
  await expect(panel.getByTestId('radar-score')).toBeVisible();
  await panel.getByRole('link', { name: '상세 보기' }).click();
  await expect(page.getByTestId('range-title')).toHaveText('A훈련장');
  const meal = page.getByTestId('score-bars').locator('li', { hasText: '식사' });
  await expect(meal.locator('span').first()).toHaveClass(/text-score-low/);

  // 2. 개선 제안 작성 → 부대명 입력 시 노란 경고
  await page.goto('/ranges/range-a/propose/');
  await page.getByTestId('cat-MEAL').click();
  await page.getByRole('button', { name: '배식 대기시간' }).click();
  await page.getByTestId('proposal-title').fill('배식 줄이 너무 길어요');
  await page.getByTestId('proposal-body').fill('○사단 식당 배식 줄이 너무 길어요');
  await expect(page.getByTestId('security-warn')).toContainText('부대명·장비명은 자동으로 가려져 저장됩니다');
  await expect(page.getByTestId('security-warn')).toContainText('[부대]');

  // 3. 유사 제안 패널 → 공감하고 끝내기
  await expect(page.getByTestId('similar-panel')).toBeVisible();
  await page.getByTestId('empathize-finish').first().click();
  await page.waitForURL(/\/proposal\/?\?id=/);
  const proposalUrl = page.url();
  await expect(page.getByTestId('empathy-button')).toContainText('공감함');

  // 4. 정책 담당자 → 대시보드 → 우선순위 1위 "점심 배식 대기시간"
  await switchRole(page, 'POLICY_ADMIN');
  await page.goto('/admin/');
  const firstIssue = page.getByTestId('issue-list').locator('a').first();
  await expect(firstIssue).toContainText('점심 배식 대기시간');

  // 5. 이슈 상세 → AI 대책 초안 (2초 이내) → 외부로 나간 텍스트 보기
  await firstIssue.click();
  await expect(page.getByTestId('issue-title')).toHaveText('점심 배식 대기시간');
  const t0 = Date.now();
  await page.getByTestId('ai-generate').click();
  await expect(page.getByTestId('solution-card')).toBeVisible({ timeout: 3_000 });
  expect(Date.now() - t0).toBeLessThan(2_500);
  await expect(page.getByTestId('solution-card')).toContainText('AI 초안');
  await page.getByTestId('toggle-payload').click();
  await expect(page.getByTestId('masked-payload').locator('[data-token]').first()).toBeVisible();
  await expect(page.getByTestId('masked-payload')).not.toContainText('○사단');

  // 6. 수정 후 채택 → 관련 제안 일괄 "조치 계획 수립" + 공식 답변
  await page.getByTestId('adopt-edited').click();
  await page.getByLabel('즉시 조치 1').fill('오전 교육 종료 시각을 조별로 10분씩 나눠 식당 도착 분산 (A훈련장 우선 적용)');
  await page.getByTestId('adopt-edited-confirm').click();
  await page.getByTestId('decision-confirm').click();
  await expect(page.getByText('수정 후 채택 처리됨')).toBeVisible();

  // 7. 예비군 → 공감한 제안의 상태·답변 확인 → 홈 개선 사례
  await switchRole(page, 'RESERVIST');
  await page.goto(proposalUrl);
  await expect(page.getByTestId('official-reply')).toBeVisible();
  const status = await page.getByTestId('status-stepper').getAttribute('data-status');
  expect(['PLANNED', 'DONE', 'LONG_TERM']).toContain(status);
  await page.goto('/my/');
  await expect(page.getByTestId('my-empathized')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('best-practices')).toContainText('After');

  expect(external, `외부 요청: ${external.join(', ')}`).toEqual([]);
});

test('보안 마스킹 체험: 심사위원 문장 실시간 입력, 좌표는 차단', async ({ page }) => {
  const external = watchExternal(page);
  await page.goto('/masking-demo/');
  const input = page.getByTestId('mask-input');
  await input.fill('제5보병사단 이준호 교관님이 K2 소총 탄약을 나눠 줬어요. 연락처 010-9876-5432');
  await expect(page.getByTestId('mask-output')).toContainText('[부대_1]');
  await expect(page.getByTestId('mask-output')).toContainText('[인물_1]');
  await expect(page.getByTestId('mask-output')).toContainText('[전화번호]');
  await expect(page.getByTestId('mask-output')).not.toContainText('010-9876');
  await input.fill('37.8312, 127.5101 근처 탄약고 위치가 식당 바로 뒤예요');
  await expect(page.getByTestId('mask-blocked')).toContainText('외부 전송 차단');
  expect(external).toEqual([]);
});

test('작성 화면: 좌표가 들어가면 제출 버튼 비활성화', async ({ page }) => {
  await page.goto('/ranges/range-a/propose/');
  await page.getByTestId('cat-FACILITY').click();
  await page.getByTestId('proposal-title').fill('화장실 위치 문의');
  await page.getByTestId('proposal-body').fill('52SCG 12345 67890 근처 화장실이 더러워요');
  await expect(page.getByTestId('security-block')).toBeVisible();
  await expect(page.getByTestId('proposal-submit')).toBeDisabled();
});

test('평가 자격: 예비군은 A훈련장 평가 가능, X훈련장은 기간 만료', async ({ page }) => {
  await page.goto('/ranges/range-x/');
  await expect(page.getByTestId('review-disabled')).toBeVisible();
  await expect(page.getByText('평가 기간(30일)이 지났습니다')).toBeVisible();
  await page.goto('/ranges/range-a/review/');
  for (const k of ['scoreTransport', 'scoreMeal', 'scoreFacility', 'scoreOperation', 'scoreComm']) await page.getByTestId(`score-${k}-${k === 'scoreMeal' ? 2 : 4}`).click();
  await page.getByTestId('review-submit').click();
  await expect(page.getByText('평가가 등록되었습니다')).toBeVisible();
});
