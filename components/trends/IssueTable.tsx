'use client';
import Link from 'next/link';
import { Badge, CategoryBadge } from '@/components/ui';
import { explainPriority } from '@/lib/analysis/priority';
import { STATUS_LABEL } from '@/lib/constants';
import type { IssueView, ProposalStatus } from '@/lib/types';

const ST_COLOR: Record<ProposalStatus, string> = {
  RECEIVED: 'var(--c-status-received)', REVIEWING: 'var(--c-status-reviewing)', PLANNED: 'var(--c-status-planned)', DONE: 'var(--c-status-done)', LONG_TERM: 'var(--c-status-longterm)',
};

export function StatusDistribution({ counts, total }: { counts: IssueView['statusCounts']; total: number }) {
  return (
    <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" title={(Object.keys(counts) as ProposalStatus[]).map((s) => `${STATUS_LABEL[s]} ${counts[s]}`).join(' · ')}>
      {(['RECEIVED', 'REVIEWING', 'PLANNED', 'DONE', 'LONG_TERM'] as ProposalStatus[]).map((s) => counts[s]
        ? <span key={s} style={{ width: `${(counts[s]! / total) * 100}%`, background: ST_COLOR[s] }} />
        : null)}
    </div>
  );
}

/** 이슈 목록: 우선순위 순. 점수 근거는 공식으로 툴팁 표시 ("AI가 정했다"가 아님) */
export function IssueTable({ issues, limit }: { issues: IssueView[]; limit?: number }) {
  return (
    <ol className="space-y-2" data-testid="issue-list">
      {issues.slice(0, limit ?? issues.length).map((i, n) => (
        <li key={i.id}>
          <Link href={`/issue?id=${i.id}`} className="block rounded-2xl border border-line bg-surface p-4 hover:border-primary" data-testid={`issue-${i.id}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-ink-3">{n + 1}</span>
              <span className="font-bold">{i.title}</span>
              <CategoryBadge category={i.category} />
              {i.isSafety && <Badge tone="orange">⚠️ 안전 관련</Badge>}
              <span className="ml-auto text-sm" title={explainPriority(i.priorityBreakdown)}>
                우선순위 <b className="tabular-nums">{i.priorityScore.toFixed(1)}</b> <span className="cursor-help text-ink-3" aria-label={explainPriority(i.priorityBreakdown)}>ⓘ</span>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-ink-2 sm:grid-cols-[repeat(3,auto)_1fr] sm:items-center sm:gap-4">
              <span>제안 <b className="text-ink">{i.proposalCount}</b></span>
              <span>공감 <b className="text-ink">{i.empathyCount}</b></span>
              <span>훈련장 <b className="text-ink">{i.rangeCount}</b>곳</span>
              <div className="col-span-3 sm:col-span-1"><StatusDistribution counts={i.statusCounts} total={i.proposalCount} /></div>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
