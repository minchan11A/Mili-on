import { defineConfig, devices } from '@playwright/test';

/**
 * E2E: 시연 빌드(out/)를 로컬 정적 서버로 띄우고 "인터넷이 없는" 브라우저로 시나리오를 따라갑니다.
 * - Chromium의 context.setOffline(true)는 localhost까지 막기 때문에, 대신 DNS를 끊어
 *   localhost 외에는 어떤 호스트도 찾을 수 없게 합니다(= 와이파이를 끈 노트북과 같은 상태).
 * - 테스트 안에서 localhost 밖으로 나가는 요청이 하나라도 있으면 실패 처리합니다.
 * 먼저 `npm run build:demo` 를 실행하세요.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'],
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'npx serve out -l 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
