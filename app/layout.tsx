import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: '밀라인드 · 예비군 훈련장 개선 플랫폼',
  description: '예비군 훈련장 만족도 지도, 개선 제안, 보안 마스킹을 거친 AI 대책 초안',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#3f5e3a' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
