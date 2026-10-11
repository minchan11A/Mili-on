import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_LABEL } from '@/lib/constants';
import type { TrendData } from '@/lib/types';

/**
 * 카테고리별 제안 수 + 공감 수. 척도가 달라 한 축에 겹치지 않고 각자 막대 열로 나눔 (이중 축 금지).
 */
export function CategoryRanking({ ranking }: { ranking: TrendData['ranking'] }) {
  const maxP = Math.max(1, ...ranking.map((r) => r.proposals));
  const maxE = Math.max(1, ...ranking.map((r) => r.empathies));
  return (
    <div data-testid="category-ranking">
      <div className="mb-1 grid grid-cols-[110px_1fr_1fr] gap-3 text-xs font-semibold text-ink-3 sm:grid-cols-[140px_1fr_1fr]">
        <span>분야</span><span>제안 수</span><span>공감 수</span>
      </div>
      <ul className="space-y-2">
        {ranking.map((r) => (
          <li key={r.category} className="grid grid-cols-[110px_1fr_1fr] items-center gap-3 text-sm sm:grid-cols-[140px_1fr_1fr]" title={`${CATEGORY_LABEL[r.category]}: 제안 ${r.proposals}건, 공감 ${r.empathies}건`}>
            <span className="flex items-center gap-1.5 truncate font-semibold">
              <i className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[r.category] }} />
              <span aria-hidden>{CATEGORY_ICON[r.category]}</span>{CATEGORY_LABEL[r.category]}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 rounded-r" style={{ width: `${(r.proposals / maxP) * 80}%`, background: 'var(--c-primary)' }} />
              <span className="tabular-nums text-ink-2">{r.proposals}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 rounded-r" style={{ width: `${(r.empathies / maxE) * 80}%`, background: 'var(--c-accent)' }} />
              <span className="tabular-nums text-ink-2">{r.empathies}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
