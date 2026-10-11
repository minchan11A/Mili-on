'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/lib/format';
import { useViewer } from './ViewerProvider';

export function AdminNav() {
  const path = usePathname();
  const { viewer } = useViewer();
  const items = [
    { href: '/admin', label: '대시보드' },
    { href: '/admin/queue', label: '처리 큐' },
    ...(viewer?.role === 'POLICY_ADMIN' ? [{ href: '/admin/audit', label: '마스킹 감사 로그' }] : []),
    { href: '/masking-demo', label: '마스킹 체험' },
  ];
  return (
    <nav className="scrollbar-none mb-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="관리 메뉴">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={cx('min-h-11 whitespace-nowrap border-b-2 px-4 py-2.5 font-semibold', path === it.href || path === `${it.href}/` ? 'border-primary text-primary' : 'border-transparent text-ink-3')}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
