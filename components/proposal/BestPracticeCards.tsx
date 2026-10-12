'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Icon } from '@/components/ui';
import { CATEGORY_LABEL } from '@/lib/constants';
import { cx, fmtDate } from '@/lib/format';
import type { BestPracticeView } from '@/lib/types';

/** 개선 사례 Before / After (가로 스크롤 카드). PC에서는 좌우 버튼으로 넘김 */
export function BestPracticeCards({ items }: { items: BestPracticeView[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update, items.length]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector('article');
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * Math.max(1, Math.floor(el.clientWidth / step)), behavior: 'smooth' });
  };

  const arrow = (dir: 1 | -1, disabled: boolean) => (
    <button
      type="button" onClick={() => go(dir)} disabled={disabled}
      aria-label={dir === 1 ? '다음 사례' : '이전 사례'} data-testid={dir === 1 ? 'bp-next' : 'bp-prev'}
      className={cx(
        'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-opacity md:flex',
        dir === 1 ? '-right-3' : '-left-3',
        disabled ? 'pointer-events-none opacity-0' : 'opacity-100 hover:border-ink',
      )}
    >
      <Icon name={dir === 1 ? 'arrow' : 'back'} size={18} />
    </button>
  );

  return (
    <div className="relative">
      {arrow(-1, edge.start)}
      <div ref={ref} onScroll={update} className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:px-0" data-testid="best-practices">
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
      {arrow(1, edge.end)}
    </div>
  );
}
