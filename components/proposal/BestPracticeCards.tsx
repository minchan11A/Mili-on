'use client';
import { Badge } from '@/components/ui';
import { CATEGORY_LABEL } from '@/lib/constants';
import { fmtDate } from '@/lib/format';
import type { BestPracticeView } from '@/lib/types';

/** 개선 사례 Before / After (가로 스크롤 카드) */
export function BestPracticeCards({ items }: { items: BestPracticeView[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6" data-testid="best-practices">
      {items.map((b) => (
        <article key={b.id} className="flex w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-line bg-surface p-5 sm:w-[340px]">
          <div className="mb-3 flex items-center justify-between gap-2 text-[12px] text-ink-3">
            <span>{CATEGORY_LABEL[b.category]}</span>
            {b.isPolicy ? <Badge>{b.sourceLabel}</Badge> : <span>{b.sourceLabel}{b.date ? ` · ${fmtDate(b.date)}` : ''}</span>}
          </div>
          <h3 className="mb-4 text-[16px] font-semibold leading-snug">{b.title}</h3>
          <dl className="mt-auto space-y-3 text-[13px] leading-relaxed">
            <div>
              <dt className="mb-0.5 text-[11px] font-medium tracking-[0.08em] text-ink-3">BEFORE</dt>
              <dd className="text-ink-2">{b.before}</dd>
            </div>
            <div className="border-t border-line pt-3">
              <dt className="mb-0.5 text-[11px] font-medium tracking-[0.08em] text-accent">AFTER</dt>
              <dd>{b.after}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
