'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui';
import { IS_DEMO } from '@/lib/config';
import { getDataSource } from '@/lib/data';
import { cx } from '@/lib/format';
import type { Role } from '@/lib/types';
import { isManagerRole, useViewer, ViewerProvider } from './ViewerProvider';
import { ToastProvider } from './Toast';

const NAV: Array<{ href: string; label: string; short: string; icon: IconName }> = [
  { href: '/map', label: '만족도 지도', short: '지도', icon: 'map' },
  { href: '/proposals', label: '개선 제안', short: '제안', icon: 'pen' },
  { href: '/survey', label: '설문', short: '설문', icon: 'survey' },
  { href: '/trends', label: '개선 동향', short: '동향', icon: 'chart' },
  { href: '/guide', label: '훈련장 가이드', short: '가이드', icon: 'compass' },
];

const ROLE_LABEL: Record<Role, string> = {
  RESERVIST: '예비군',
  RANGE_MANAGER: 'A훈련장 담당자',
  POLICY_ADMIN: '정책 담당자',
};

function isActive(path: string, href: string) {
  if (href === '/proposals') return path.startsWith('/proposals') || path.startsWith('/proposal') || /\/ranges\/[^/]+\/propose/.test(path);
  if (href === '/survey') return path.startsWith('/survey') || /\/ranges\/[^/]+\/review/.test(path);
  return path === href || path.startsWith(`${href}/`);
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-baseline text-[21px] font-semibold tracking-[-0.04em] text-ink', className)}>
      milind<span className="ml-[1px] inline-block h-[6px] w-[6px] translate-y-[-1px] rounded-full bg-accent" />
    </span>
  );
}

function AccountControl() {
  const { viewer, switchRole } = useViewer();
  const router = useRouter();
  if (IS_DEMO) {
    return (
      <select
        aria-label="시연용 역할 전환"
        data-testid="role-switch"
        className="h-9 max-w-[128px] cursor-pointer rounded-full border border-line bg-surface pl-3 pr-2 text-[13px] font-medium text-ink-2 outline-none hover:border-ink-3 sm:max-w-none"
        value={viewer?.role ?? 'RESERVIST'}
        onChange={(e) => switchRole(e.target.value as Role)}
      >
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </select>
    );
  }
  if (!viewer) return <Link href="/login" className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] font-medium hover:border-ink-3">로그인</Link>;
  return (
    <div className="flex items-center gap-1">
      <Link href={viewer.role === 'RESERVIST' ? '/my' : '/admin'} className="hidden max-w-[140px] truncate px-2 text-[13px] font-medium text-ink-2 hover:text-ink sm:inline">{viewer.nickname}</Link>
      <button
        type="button"
        className="h-9 rounded-full px-3 text-[13px] text-ink-3 hover:text-ink"
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
  const extra = isManagerRole(viewer)
    ? { href: '/admin', label: '관리' }
    : viewer?.role === 'RESERVIST' ? { href: '/my', label: '내 활동' } : null;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--c-bg)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="milind 홈" className="shrink-0"><Wordmark /></Link>
        {IS_DEMO && (
          <span data-testid="demo-badge" className="hidden items-center gap-1.5 whitespace-nowrap text-[12px] text-ink-3 min-[420px]:inline-flex">
            <i className="h-1.5 w-1.5 rounded-full bg-accent" />오프라인 시연<span className="hidden sm:inline"> 모드</span>
          </span>
        )}
        <nav className="ml-6 hidden items-center gap-6 md:flex" aria-label="주요 메뉴">
          {NAV.map((t) => (
            <Link key={t.href} href={t.href} className={cx('text-[14px] transition-colors', isActive(path, t.href) ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink')}>
              {t.label}
            </Link>
          ))}
          {extra && (
            <Link href={extra.href} className={cx('text-[14px] transition-colors', path.startsWith(extra.href) ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink')}>{extra.label}</Link>
          )}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {extra && <Link href={extra.href} className="whitespace-nowrap px-1 text-[13px] font-medium text-ink-2 md:hidden">{extra.label}</Link>}
          <AccountControl />
        </div>
      </div>
    </header>
  );
}

function BottomTabs() {
  const path = usePathname() ?? '/';
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="하단 메뉴">
      {NAV.map((t) => {
        const on = isActive(path, t.href);
        return (
          <Link key={t.href} href={t.href} className={cx('flex min-h-14 flex-col items-center justify-center gap-1 text-[11px]', on ? 'font-medium text-ink' : 'text-ink-3')}>
            <Icon name={t.icon} size={20} strokeWidth={on ? 1.9 : 1.5} />
            {t.short}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ViewerProvider>
      <ToastProvider>
        <Header />
        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-16 md:pt-10">{children}</main>
        <footer className="border-t border-line px-4 pb-24 pt-6 md:pb-8" data-testid="example-data-footer">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-[12px] text-ink-3 sm:px-2">
            <Wordmark className="text-[15px] text-ink-3" />
            <span>본 화면의 데이터는 모두 예시 데이터입니다 · 훈련장 이름은 가명, 위치는 시군구 중심점 · AI 결과는 담당자가 검토하는 초안</span>
          </div>
        </footer>
        <BottomTabs />
      </ToastProvider>
    </ViewerProvider>
  );
}
