import { STATUS_LABEL } from '@/lib/constants';
import { cx } from '@/lib/format';
import type { ProposalStatus } from '@/lib/types';

const STEPS: ProposalStatus[] = ['RECEIVED', 'REVIEWING', 'PLANNED', 'DONE'];

/** 접수 → 검토 중 → 조치 계획 수립 → 개선 완료 (장기 검토는 별도 분기) */
export function StatusStepper({ status }: { status: ProposalStatus }) {
  const longTerm = status === 'LONG_TERM';
  const idx = longTerm ? 1 : STEPS.indexOf(status);
  return (
    <div data-testid="status-stepper" data-status={status}>
      <ol className="flex items-start">
        {STEPS.map((s, i) => {
          const done = i <= idx;
          const current = i === idx && !longTerm;
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span className={cx('absolute right-1/2 top-3.5 h-1 w-full -translate-y-1/2', i <= idx ? 'bg-primary' : 'bg-line')} />}
              <span className={cx('relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-bold', current ? 'border-primary bg-primary text-white ring-4 ring-primary/20' : done ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink-3')}>
                {done && !current ? '✓' : i + 1}
              </span>
              <span className={cx('mt-1.5 text-xs font-semibold sm:text-sm', current ? 'text-primary' : done ? 'text-ink' : 'text-ink-3')}>{STATUS_LABEL[s]}</span>
            </li>
          );
        })}
      </ol>
      {longTerm && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
          ↳ <b>장기 검토(예산 필요)</b>로 분기되었습니다. 예산 반영 결과를 알려드립니다.
        </div>
      )}
    </div>
  );
}
