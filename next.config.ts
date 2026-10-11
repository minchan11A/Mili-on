import type { NextConfig } from 'next';

const isDemo = process.env.NEXT_PUBLIC_APP_MODE === 'demo';

/**
 * 서버 전용 파일(API 라우트, 미들웨어)은 `*.server.ts` 확장자로 둡니다.
 * 시연 빌드(output: 'export')에서는 이 확장자를 pageExtensions에서 빼서
 * API 라우트와 미들웨어가 빌드에 아예 포함되지 않게 합니다. (명세 §10.2)
 */
const nextConfig: NextConfig = {
  pageExtensions: isDemo ? ['tsx', 'ts'] : ['tsx', 'ts', 'server.ts'],
  ...(isDemo && { output: 'export', images: { unoptimized: true }, trailingSlash: true }),
  poweredByHeader: false,
  // 오프라인 시연 빌드에는 Supabase SDK를 넣지 않음 (로그인은 시연 계정으로)
  ...(isDemo && {
    webpack: (config: { resolve: { alias: Record<string, unknown> } }) => {
      config.resolve.alias['@supabase/supabase-js'] = false;
      return config;
    },
  }),
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
