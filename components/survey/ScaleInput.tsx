'use client';
import { SCALE_LABELS } from '@/lib/survey';
import { cx } from '@/lib/format';

const SIZES = [44, 36, 28, 36, 44];
const COLOR = ['var(--c-score-low)', 'var(--c-score-low)', 'var(--c-text-3)', 'var(--c-accent)', 'var(--c-accent)'];

/** 16유형 검사처럼 양 끝이 큰 원 5개: 불만족 ←→ 만족 */
export function ScaleInput({ value, onChange, label, testId }: { value?: number; onChange: (v: number) => void; label: string; testId?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      <span className="hidden w-14 text-right text-[13px] font-medium text-score-low sm:block">불만족</span>
      <div role="radiogroup" aria-label={label} className="flex items-center gap-2.5 sm:gap-4">
        {SIZES.map((size, i) => {
          const v = i + 1;
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${label}: ${SCALE_LABELS[i]}`}
              title={SCALE_LABELS[i]}
              data-testid={testId ? `${testId}-${v}` : undefined}
              onClick={() => onChange(v)}
              className={cx('grid shrink-0 place-items-center rounded-full border-[1.5px] transition-all duration-150 hover:scale-105')}
              style={{ width: size, height: size, borderColor: COLOR[i], background: on ? COLOR[i] : 'transparent' }}
            >
              {on && (
                <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5 10 17 19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <span className="hidden w-14 text-[13px] font-medium text-accent sm:block">만족</span>
    </div>
  );
}
