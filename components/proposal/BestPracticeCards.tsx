'use client';
import { CategoryBadge } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import type { BestPracticeView } from '@/lib/types';

/** 개선 사례 Before/After 카드 (가로 스크롤) */
export function BestPracticeCards({ items }: { items: BestPracticeView[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2" data-testid="best-practices">
      {items.map((b) => (
        <article key={b.id} className="w-[290px] shrink-0 snap-start rounded-2xl border border-line bg-surface p-4 sm:w-[320px]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <CategoryBadge category={b.category} />
            <span className="text-xs text-ink-3">{b.rangeName} · {fmtDate(b.completedAt)}</span>
          </div>
          <h3 className="mb-3 font-bold leading-snug">{b.title}</h3>
          <div className="space-y-2 text-sm">
            <div className="rounded-xl bg-surface-2 p-2.5"><span className="mr-1 font-bold text-ink-3">Before</span>{b.before}</div>
            <div className="rounded-xl bg-green-50 p-2.5 text-green-900"><span className="mr-1 font-bold text-green-700">After</span>{b.after}</div>
          </div>
        </article>
      ))}
    </div>
  );
}
