'use client';
import Link from 'next/link';
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { CATEGORY_LABEL, STATUS_LABEL } from '@/lib/constants';
import { cx, fmtScore } from '@/lib/format';
import type { Category, ProposalStatus, Trend } from '@/lib/types';

/* ───────── Button ───────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-black disabled:bg-ink-3/60',
  secondary: 'bg-surface text-ink border border-line hover:border-ink-3 disabled:text-ink-3',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2 disabled:text-ink-3',
  danger: 'bg-surface text-danger border border-line hover:border-danger/50',
  ai: 'bg-accent text-white hover:opacity-90 disabled:opacity-50',
};

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:cursor-not-allowed',
        size === 'sm' ? 'min-h-9 px-3.5 text-[13px]' : size === 'lg' ? 'min-h-12 px-6 text-[15px]' : 'min-h-11 px-5 text-[14px]',
        VARIANT[variant], className,
      )}
    />
  );
}

export function LinkButton({ href, variant = 'primary', className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx('inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[14px] font-medium transition-colors', VARIANT[variant], className)}>
      {children}
    </Link>
  );
}

/* ───────── 아이콘 (선 아이콘, 이모지 대신) ───────── */

const ICONS = {
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  pen: 'M4 20h4L19 9l-4-4L4 16v4Zm11-15 4 4',
  chart: 'M4 20V4m0 16h16M8 16l4-5 3 3 5-7',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
  survey: 'M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  shield: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  check: 'M5 12.5 10 17 19 7',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  reset: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  alert: 'M12 9v4m0 4h.01M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className, strokeWidth = 1.6 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ───────── Card / Section ───────── */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx('rounded-2xl border border-line bg-surface', className)}>{children}</div>;
}

export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-4 flex items-end justify-between gap-2', className)}>
      <h2 className="text-[17px] font-semibold">{children}</h2>
      {right}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-[12px] font-medium tracking-[0.08em] text-ink-3 uppercase', className)}>{children}</p>;
}

export function PageHeader({ title, sub, right, eyebrow }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[32px]">{title}</h1>
        {sub && <p className="mt-2 text-[15px] text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx('inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink', className)}>
      {children}<Icon name="arrow" size={14} />
    </Link>
  );
}

/* ───────── Badge (조용한 표기) ───────── */

type Tone = 'gray' | 'green' | 'orange' | 'blue' | 'purple' | 'red' | 'yellow' | 'olive' | 'ai';
const TONE_TEXT: Record<Tone, string> = {
  gray: 'text-ink-2 bg-surface-2',
  green: 'text-[var(--c-status-done)] bg-[var(--c-accent-soft)]',
  orange: 'text-[var(--c-status-reviewing)] bg-warn-soft',
  blue: 'text-[var(--c-status-planned)] bg-[#edf2f8]',
  purple: 'text-[var(--c-status-longterm)] bg-[#f1eff7]',
  red: 'text-danger bg-danger-soft',
  yellow: 'text-[#8a6d2e] bg-warn-soft',
  olive: 'text-accent bg-accent-soft',
  ai: 'text-ai bg-ai-soft',
};

export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-medium', TONE_TEXT[tone], className)}>{children}</span>;
}

const STATUS_COLOR: Record<ProposalStatus, string> = {
  RECEIVED: 'var(--c-status-received)', REVIEWING: 'var(--c-status-reviewing)', PLANNED: 'var(--c-status-planned)',
  DONE: 'var(--c-status-done)', LONG_TERM: 'var(--c-status-longterm)',
};

/** 상태: 색 점 + 글자 */
export function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-ink-2">
      <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CategoryBadge({ category, subtopic }: { category: Category; subtopic?: string | null }) {
  return (
    <span className="whitespace-nowrap text-[12px] font-medium text-ink-3">
      {CATEGORY_LABEL[category]}{subtopic && subtopic !== '기타' ? ` · ${subtopic}` : ''}
    </span>
  );
}

export function AiBadge({ children = 'AI 초안' }: { children?: ReactNode }) {
  return <Badge tone="ai">{children}</Badge>;
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
    <span className={cx('text-[11px]', color)} title={delta !== undefined && delta !== null ? `최근 3개월 ${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : '추세'}>
      {mark}
    </span>
  );
}

export function ScoreBig({ score, trend, delta, count }: { score: number | null; trend: Trend; delta?: number | null; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[40px] font-semibold leading-none tabular-nums tracking-tight">{score === null ? '–' : fmtScore(score)}</span>
      {score !== null ? <TrendMark trend={trend} delta={delta} /> : <span className="text-[13px] text-ink-3">평가 부족</span>}
      <span className="text-[13px] text-ink-3">평가 {count}건</span>
    </div>
  );
}

/* ───────── 상태 표시 ───────── */

export function EmptyState({ title, desc, action }: { title: string; desc?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      {desc && <p className="text-[13px] text-ink-3">{desc}</p>}
      {action && <div className="mt-2">{action}</div>}
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
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-[13px]">
      <span>{error.message || '문제가 생겼습니다'}</span>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>다시 시도</Button>}
    </div>
  );
}

export function Notice({ tone = 'info', children, className }: { tone?: 'info' | 'warn' | 'danger' | 'ok' | 'ai'; children: ReactNode; className?: string }) {
  const cls = {
    info: 'bg-surface-2 text-ink-2',
    warn: 'bg-warn-soft text-[#7a5f27]',
    danger: 'bg-danger-soft text-danger',
    ok: 'bg-accent-soft text-accent',
    ai: 'bg-ai-soft text-ai',
  }[tone];
  return <div className={cx('rounded-xl px-4 py-3 text-[13px] leading-relaxed', cls, className)}>{children}</div>;
}

/* ───────── Tabs / Chips ───────── */

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: Array<{ value: T; label: ReactNode }>; className?: string }) {
  return (
    <div role="tablist" className={cx('scrollbar-none flex gap-6 overflow-x-auto border-b border-line', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            '-mb-px min-h-11 whitespace-nowrap border-b-[1.5px] text-[14px] font-medium transition-colors',
            value === it.value ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink',
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
        'min-h-9 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors',
        active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-ink-3',
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

/* ───────── Modal ───────── */

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cx('max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid h-10 w-10 place-items-center rounded-full text-ink-3 hover:bg-surface-2"><Icon name="close" /></button>
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
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {counter && <span className="text-[12px] text-ink-3 tabular-nums">{counter}</span>}
      </div>
      {children}
      {hint && <p className="mt-1 text-[12px] text-ink-3">{hint}</p>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-ink min-h-11 placeholder:text-ink-3';

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'danger' }) {
  return (
    <div className="py-1">
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className={cx('stat-v mt-1 text-[26px] font-semibold tabular-nums tracking-tight', tone === 'danger' && 'text-danger')}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}

/** 지표를 가는 세로선으로 나눈 한 줄 */
export function StatRow({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx('grid grid-cols-2 gap-y-4 rounded-2xl border border-line bg-surface px-5 py-4 sm:flex sm:divide-x sm:divide-line [&>*]:sm:flex-1 [&>*]:sm:px-5 [&>*:first-child]:sm:pl-0', className)}>{children}</div>;
}
