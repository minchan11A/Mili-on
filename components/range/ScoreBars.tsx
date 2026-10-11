import { SCORE_AXES } from '@/lib/constants';
import { fmtScore } from '@/lib/format';
import type { ScoreSet } from '@/lib/types';

/** 지표별 점수 막대 (가장 낮은 지표 강조) */
export function ScoreBars({ scores }: { scores: ScoreSet }) {
  const vals = SCORE_AXES.map((a) => scores[a.key]).filter((v): v is number => v !== null);
  const min = vals.length ? Math.min(...vals) : null;
  return (
    <ul className="space-y-2.5" data-testid="score-bars">
      {SCORE_AXES.map((a) => {
        const v = scores[a.key];
        return (
          <li key={a.key} className="grid grid-cols-[96px_1fr_36px] items-center gap-2 text-sm">
            <span className={v !== null && v === min ? "font-medium text-score-low" : "text-ink-2"}>{a.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full" style={{ width: `${((v ?? 0) / 5) * 100}%`, background: v !== null && v === min ? 'var(--c-score-low)' : v !== null && v < 3 ? 'var(--c-score-low)' : 'var(--c-text)' }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{fmtScore(v)}</span>
          </li>
        );
      })}
    </ul>
  );
}
