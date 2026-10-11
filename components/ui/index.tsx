'use client';
import Link from 'next/link';
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { CATEGORY_ICON, CATEGORY_LABEL, STATUS_LABEL } from '@/lib/constants';
import { cx, fmtScore } from '@/lib/format';
import type { Category, ProposalStatus, Trend } from '@/lib/types';

/* ───────── Button ───────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-ink-3',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2 disabled:text-ink-3',
  ghost: 'text-ink-2 hover:bg-surface-2 disabled:text-ink-3',
  danger: 'bg-surface text-danger border border-danger/40 hover:bg-danger-soft',
  ai: 'bg-ai text-white hover:opacity-90 disabled:opacity-50',
};

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed',
        size === 'sm' ? 'min-h-9 px-3 text-sm' : size === 'lg' ? 'min-h-12 px-5 text-base' : 'min-h-11 px-4 text-[15px]',
        VARIANT[variant], className,
      )}
    />
  );
}

export function LinkButton({ href, variant = 'primary', className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx('inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 font-semibold transition-colors', VARIANT[variant], className)}>
      {children}
    </Link>
  );
}

/* ───────── Card / Section ───────── */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx('rounded-2xl border border-line bg-surface', className)}>{children}</div>;
}

export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-center justify-between gap-2', className)}>
      <h2 className="text-lg font-bold">{children}</h2>
      {right}
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ───────── Badge ───────── */

type Tone = 'gray' | 'green' | 'orange' | 'blue' | 'purple' | 'red' | 'yellow' | 'olive' | 'ai';
const TONE: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  orange: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-violet-100 text-violet-800',
  red: 'bg-danger-soft text-danger',
  yellow: 'bg-warn-soft text-yellow-800',
  olive: 'bg-primary-soft text-primary',
  ai: 'bg-ai-soft text-ai',
};

export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', TONE[tone], className)}>{children}</span>;
}

const STATUS_TONE: Record<ProposalStatus, Tone> = { RECEIVED: 'gray', REVIEWING: 'orange', PLANNED: 'blue', DONE: 'green', LONG_TERM: 'purple' };
export function StatusBadge({ status }: { status: ProposalStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function CategoryBadge({ category, subtopic }: { category: Category; subtopic?: string | null }) {
  return (
    <Badge tone="olive">
      <span aria-hidden>{CATEGORY_ICON[category]}</span>
      {CATEGORY_LABEL[category]}
      {subtopic && subtopic !== '기타' ? ` · ${subtopic}` : ''}
    </Badge>
  );
}

export function AiBadge({ children = 'AI 초안' }: { children?: ReactNode }) {
  return <Badge tone="ai">✦ {children}</Badge>;
}

/* ───────── 점수 ───────── */

export function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'var(--c-score-none)';
  if (score >= 4) return 'var(--c-score-high)';
  if (score >= 3) return 'var(--c-score-mid)';
  return 'var(--c-score-low)';
}

export function TrendMark({ trend, delta }: { trend: Trend; delta?: number | null }) {
  const mark = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–';
  const color = trend === 'up' ? 'text-score-high' : trend === 'down' ? 'text-score-low' : 'text-ink-3';
  return (
    <span className={cx('font-bold', color)} title={delta !== undefined && delta !== null ? `최근 3개월 ${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : '추세'}>
      {mark}
    </span>
  );
}

export function ScoreBig({ score, trend, delta, count }: { score: number | null; trend: Trend; delta?: number | null; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-extrabold tabular-nums" style={{ color: scoreColor(score) }}>{score === null ? '평가 부족' : fmtScore(score)}</span>
      {score !== null && <TrendMark trend={trend} delta={delta} />}
      <span className="text-sm text-ink-3">평가 {count}건</span>
    </div>
  );
}

/* ───────── 상태 표시 ───────── */

export function EmptyState({ title, desc, action, icon = '🗂️' }: { title: string; desc?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <div className="text-3xl" aria-hidden>{icon}</div>
      <p className="font-semibold">{title}</p>
      {desc && <p className="text-sm text-ink-2">{desc}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className ?? 'h-24 w-full')} />;
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: Error | null | undefined; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
      <span>⚠️ {error.message || '문제가 생겼습니다'}</span>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>다시 시도</Button>}
    </div>
  );
}

export function Notice({ tone = 'info', children, className }: { tone?: 'info' | 'warn' | 'danger' | 'ok' | 'ai'; children: ReactNode; className?: string }) {
  const cls = {
    info: 'bg-primary-soft text-primary border-primary/20',
    warn: 'bg-warn-soft text-yellow-900 border-warn/40',
    danger: 'bg-danger-soft text-danger border-danger/40',
    ok: 'bg-green-50 text-green-800 border-green-200',
    ai: 'bg-ai-soft text-ai border-ai/20',
  }[tone];
  return <div className={cx('rounded-xl border px-4 py-3 text-sm', cls, className)}>{children}</div>;
}

/* ───────── Tabs / Chips ───────── */

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: Array<{ value: T; label: ReactNode }>; className?: string }) {
  return (
    <div role="tablist" className={cx('scrollbar-none flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            'min-h-11 whitespace-nowrap border-b-2 px-4 text-[15px] font-semibold transition-colors',
            value === it.value ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'min-h-9 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors',
        active ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-1', className)}>{children}</div>;
}

/* ───────── Modal / Sheet ───────── */

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cx('max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="min-h-11 min-w-11 rounded-full text-xl text-ink-3 hover:bg-surface-2">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────── Form ───────── */

export function Field({ label, hint, children, counter }: { label: ReactNode; hint?: ReactNode; children: ReactNode; counter?: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-semibold">{label}</span>
        {counter && <span className="text-xs text-ink-3 tabular-nums">{counter}</span>}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-primary min-h-11';

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'danger' }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-ink-2">{label}</div>
      <div className={cx('mt-1 text-2xl font-extrabold tabular-nums', tone === 'danger' && 'text-danger')}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-3">{sub}</div>}
    </Card>
  );
}
