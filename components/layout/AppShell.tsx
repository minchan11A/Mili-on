'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { IS_DEMO } from '@/lib/config';
import { getDataSource } from '@/lib/data';
import { cx } from '@/lib/format';
import type { Role } from '@/lib/types';
import { isManagerRole, useViewer, ViewerProvider } from './ViewerProvider';
import { ToastProvider } from './Toast';

const TABS = [
  { href: '/map', label: '만족도 지도', icon: '🗺️' },
  { href: '/proposals', label: '개선 제안', icon: '✍️' },
  { href: '/trends', label: '개선 동향', icon: '📈' },
  { href: '/guide', label: '훈련장 가이드', icon: '🧭' },
];

const ROLE_LABEL: Record<Role, string> = {
  RESERVIST: '예비군',
  RANGE_MANAGER: 'A훈련장 담당자',
  POLICY_ADMIN: '정책 담당자',
};

function isActive(path: string, href: string) {
  if (href === '/proposals') return path.startsWith('/proposals') || path.startsWith('/proposal') || /\/ranges\/[^/]+\/propose/.test(path);
  if (href === '/guide') return path.startsWith('/guide');
  return path === href || path.startsWith(`${href}/`);
}

function RoleControl() {
  const { viewer, switchRole } = useViewer();
  const router = useRouter();
  if (IS_DEMO) {
    return (
      <label className="flex items-center gap-1.5 text-sm">
        <span className="hidden text-ink-2 lg:inline">역할 전환</span>
        <select
          aria-label="시연용 역할 전환"
          data-testid="role-switch"
          className="min-h-9 max-w-[132px] rounded-lg border border-line bg-surface px-1.5 text-sm font-semibold sm:max-w-none"
          value={viewer?.role ?? 'RESERVIST'}
          onChange={(e) => switchRole(e.target.value as Role)}
        >
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </label>
    );
  }
  if (!viewer) return <Link href="/login" className="min-h-9 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold">로그인</Link>;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden font-semibold sm:inline">{viewer.nickname}</span>
      <button
        type="button"
        className="min-h-9 rounded-lg border border-line px-3 text-sm"
        onClick={async () => { await getDataSource().logout?.(); router.push('/'); router.refresh(); }}
      >
        로그아웃
      </button>
    </div>
  );
}

function Header() {
  const path = usePathname() ?? '/';
  const { viewer } = useViewer();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-extrabold text-primary">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-white">밀</span>
          <span className="hidden min-[400px]:inline">밀라인드</span>
        </Link>
        {IS_DEMO && <span data-testid="demo-badge" className="whitespace-nowrap rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-yellow-900">오프라인 시연<span className="hidden sm:inline"> 모드</span></span>}
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={cx('rounded-lg px-3 py-2 text-[15px] font-semibold', isActive(path, t.href) ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-2')}>
              {t.label}
            </Link>
          ))}
          {isManagerRole(viewer) && (
            <Link href="/admin" className={cx('rounded-lg px-3 py-2 text-[15px] font-semibold', path.startsWith('/admin') ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-2')}>관리</Link>
          )}
          {viewer?.role === 'RESERVIST' && (
            <Link href="/my" className={cx('rounded-lg px-3 py-2 text-[15px] font-semibold', path.startsWith('/my') ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-2')}>내 활동</Link>
          )}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          {isManagerRole(viewer) && <Link href="/admin" className="whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-semibold text-primary md:hidden">관리</Link>}
          {viewer?.role === 'RESERVIST' && <Link href="/my" className="whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-semibold text-primary md:hidden">내 활동</Link>}
          <RoleControl />
        </div>
      </div>
    </header>
  );
}

function BottomTabs() {
  const path = usePathname() ?? '/';
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface md:hidden" aria-label="하단 메뉴">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={cx('flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold', isActive(path, t.href) ? 'text-primary' : 'text-ink-3')}>
          <span aria-hidden className="text-lg leading-none">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ViewerProvider>
      <ToastProvider>
        <Header />
        <main className="mx-auto min-h-[calc(100vh-56px)] max-w-6xl px-4 pb-28 pt-5 md:pb-12">{children}</main>
        <footer className="border-t border-line bg-surface px-4 pb-20 pt-4 text-center text-xs text-ink-3 md:pb-4" data-testid="example-data-footer">
          본 화면의 데이터는 모두 예시 데이터입니다 · 훈련장 이름은 가명이며 위치는 시군구 중심점입니다 · AI 결과는 담당자가 검토하는 초안입니다
        </footer>
        <BottomTabs />
      </ToastProvider>
    </ViewerProvider>
  );
}
