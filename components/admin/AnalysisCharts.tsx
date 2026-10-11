import Link from 'next/link';
import { CATEGORY_COLOR, CATEGORY_LABEL, STATUS_LABEL, STATUSES } from '@/lib/constants';
import { cx } from '@/lib/format';
import type { Category, ProposalAnalysis, ProposalStatus } from '@/lib/types';

const STATUS_VAR: Record<ProposalStatus, string> = {
  RECEIVED: 'var(--c-status-received)', REVIEWING: 'var(--c-status-reviewing)', PLANNED: 'var(--c-status-planned)',
  DONE: 'var(--c-status-done)', LONG_TERM: 'var(--c-status-longterm)',
};
const pct = (x: number) => `${Math.round(x * 100)}%`;
const SHORT: Record<Category, string> = {
  TRANSPORT: '교통', MEAL: '식사', FACILITY: '시설', OPERATION: '운영', EQUIPMENT: '피복', COMMUNICATION: '안내', COMPENSATION: '보상', ETC: '기타',
};

function Delta({ now, prev }: { now: number; prev: number }) {
  const d = now - prev;
  if (d === 0) return <span className="text-ink-3">변화 없음</span>;
  return <span className={d > 0 ? 'text-danger' : 'text-st-done'}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}</span>;
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3 sm:gap-x-4 sm:text-[12px]">
      {STATUSES.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm" style={{ background: STATUS_VAR[s] }} />{STATUS_LABEL[s]}</span>
      ))}
    </div>
  );
}

/** 분야별 제안 수(분야 고정 색) + 처리 상태 구성 + 이전 같은 기간 대비 */
export function CategoryBreakdown({ rows }: { rows: ProposalAnalysis['categories'] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div data-testid="analysis-categories">
      <div className="mb-2 hidden grid-cols-[150px_1fr_1fr_72px] gap-4 text-[12px] text-ink-3 md:grid">
        <span>분야</span><span>제안 수 · 비중</span><span>처리 상태</span><span className="text-right">이전 기간 대비</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const countText = <span className="whitespace-nowrap text-[13px] tabular-nums"><b className="font-semibold">{r.count}</b><span className="text-ink-3">건 · {pct(r.share)}</span></span>;
          return (
            <li key={r.category} className="grid grid-cols-2 items-center gap-x-3 gap-y-1.5 py-2.5 md:grid-cols-[150px_1fr_1fr_72px] md:gap-x-4 md:py-3">
              <span className="col-span-2 flex items-center gap-2 text-[13px] font-medium md:col-span-1 md:text-[14px]">
                <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[r.category] }} />
                {CATEGORY_LABEL[r.category]}
                <span className="ml-auto flex items-center gap-3 font-normal md:hidden">{countText}<span className="text-[12px] tabular-nums"><Delta now={r.count} prev={r.prevCount} /></span></span>
              </span>
              <span className="flex items-center gap-2" title={`${CATEGORY_LABEL[r.category]} ${r.count}건 (${pct(r.share)}), 공감 ${r.empathies}`}>
                <span className="h-1.5 rounded-r-full md:h-2" style={{ width: `${Math.max(r.count ? 3 : 0, (r.count / max) * 78)}%`, background: CATEGORY_COLOR[r.category] }} />
                <span className="hidden md:inline">{countText}</span>
              </span>
              <span className="flex items-center gap-2">
                {r.count === 0 ? <span className="text-[11px] text-ink-3 md:text-[12px]">이번 기간 없음</span> : (
                  <>
                    <span className="flex h-1.5 flex-1 gap-[2px] overflow-hidden rounded-full md:h-2" aria-label="처리 상태 구성">
                      {STATUSES.filter((s) => r.statusCounts[s]).map((s) => (
                        <span key={s} title={`${STATUS_LABEL[s]} ${r.statusCounts[s]}건`} style={{ flex: r.statusCounts[s], background: STATUS_VAR[s] }} />
                      ))}
                    </span>
                    <span className="whitespace-nowrap text-right text-[11px] tabular-nums text-ink-2 md:w-[68px] md:text-[12px]">조치 {pct(r.resolvedRate)}</span>
                  </>
                )}
              </span>
              <span className="hidden text-right text-[13px] tabular-nums md:block"><Delta now={r.count} prev={r.prevCount} /></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 많이 나온 세부 주제 */
export function SubtopicList({ rows }: { rows: ProposalAnalysis['subtopics'] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ol className="space-y-2 sm:space-y-2.5" data-testid="analysis-subtopics">
      {rows.map((r, i) => (
        <li key={`${r.category}|${r.subtopic}`} className="grid grid-cols-[16px_1fr_auto] items-center gap-2.5 text-[13px] sm:grid-cols-[20px_1fr_auto] sm:gap-3 sm:text-[14px]">
          <span className="text-[12px] tabular-nums text-ink-3">{i + 1}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 truncate"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[r.category] }} />{r.subtopic}</span>
            <span className="mt-1 block h-1 rounded-full bg-ink/80" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="whitespace-nowrap text-right text-[11px] tabular-nums text-ink-2 sm:text-[12px]">{r.count}건 · 공감 {r.empathies}</span>
        </li>
      ))}
    </ol>
  );
}

/** 훈련장 × 분야 (한 가지 색의 진하기로 건수 표시). 행을 누르면 그 훈련장 분석으로 */
export function RangeMatrix({ rows, categories, onPick }: { rows: NonNullable<ProposalAnalysis['rangeMatrix']>; categories: Category[]; onPick: (id: string) => void }) {
  const max = Math.max(1, ...rows.flatMap((r) => categories.map((c) => r.counts[c] ?? 0)));
  const sorted = [...rows].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface" data-testid="analysis-matrix">
      <table className="w-full table-fixed text-[12px] sm:min-w-[640px] sm:text-[13px]">
        <colgroup><col className="w-[68px] sm:w-28" />{categories.map((c) => <col key={c} />)}<col className="w-10 sm:w-16" /></colgroup>
        <thead>
          <tr className="text-left text-[12px] text-ink-3">
            <th className="sticky left-0 bg-surface px-2.5 py-2.5 font-normal sm:px-4">훈련장</th>
            {categories.map((c) => (
              <th key={c} className="px-0.5 py-2.5 text-center font-normal sm:px-1">
                <span className="inline-flex flex-col items-center gap-1 sm:flex-row"><i className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_COLOR[c] }} />{SHORT[c]}</span>
              </th>
            ))}
            <th className="px-2 py-2.5 text-right font-normal sm:px-4">합계</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="cursor-pointer border-t border-line hover:bg-surface-2" onClick={() => onPick(r.id)}>
              <td className="sticky left-0 truncate bg-surface px-2.5 py-1.5 font-medium sm:px-4 sm:py-2">{r.name}</td>
              {categories.map((c) => {
                const n = r.counts[c] ?? 0;
                const a = n / max;
                return (
                  <td key={c} className="px-0.5 py-1 text-center sm:px-1">
                    <span className={cx('inline-flex h-6 w-full items-center justify-center rounded tabular-nums sm:h-7 sm:rounded-md', a > 0.55 ? 'text-white' : n ? 'text-ink' : 'text-ink-3/60')}
                      style={{ background: n ? `rgba(31, 77, 58, ${0.08 + a * 0.82})` : 'transparent' }} title={`${r.name} · ${CATEGORY_LABEL[c]} ${n}건`}>
                      {n || '·'}
                    </span>
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-right font-semibold tabular-nums sm:px-4 sm:py-2">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RangeLink({ id, children }: { id: string; children: React.ReactNode }) {
  return <Link href={`/ranges/${id}`} className="text-[13px] text-ink-2 underline-offset-4 hover:underline">{children}</Link>;
}
