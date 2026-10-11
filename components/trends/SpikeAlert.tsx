import { CATEGORY_LABEL } from '@/lib/constants';
import type { Spike } from '@/lib/types';

/** 급증 알림: 최근 4주 주평균 / 이전 12주 주평균 ≥ 1.8 이고 최근 4주 10건 이상 */
export function SpikeAlert({ spikes }: { spikes: Spike[] }) {
  if (!spikes.length) return null;
  return (
    <div className="space-y-2" data-testid="spike-alert">
      {spikes.map((s) => (
        <div key={s.category} role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-warn/50 bg-warn-soft px-4 py-3 text-yellow-900">
          <span aria-hidden>📈</span>
          <b>급증</b>
          <span><b>{CATEGORY_LABEL[s.category]}</b> 최근 4주 <b>{s.ratio.toFixed(1)}배</b> 증가</span>
          <span className="text-xs">(주평균 {s.baseWeekly} → {s.recentWeekly}건, 최근 4주 {s.recentCount}건)</span>
        </div>
      ))}
    </div>
  );
}
