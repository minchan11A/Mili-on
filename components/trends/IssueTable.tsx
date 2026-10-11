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
    <div className="flex h-1 w-full gap-[2px] overflow-hidden rounded-full" title={(Object.keys(counts) as ProposalStatus[]).map((s) => `${STATUS_LABEL[s]} ${counts[s]}`).join(' · ')}>
      {(['RECEIVED', 'REVIEWING', 'PLANNED', 'DONE', 'LONG_TERM'] as ProposalStatus[]).map((s) => counts[s]
        ? <span key={s} style={{ width: `${(counts[s]! / total) * 100}%`, background: ST_COLOR[s] }} />
        : null)}
    </div>
  );
}

/** 이슈 목록: 우선순위 순. 점수 근거는 공식으로 툴팁 표시 ("AI가 정했다"가 아님) */
export function IssueTable({ issues, limit }: { issues: IssueView[]; limit?: number }) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" data-testid="issue-list">
      {issues.slice(0, limit ?? issues.length).map((i, n) => (
        <li key={i.id}>
          <Link href={`/issue?id=${i.id}`} className="grid grid-cols-[24px_1fr_auto] items-center gap-x-3 gap-y-1 px-5 py-4 transition-colors hover:bg-surface-2" data-testid={`issue-${i.id}`}>
            <span className="text-[13px] tabular-nums text-ink-3">{n + 1}</span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-medium">{i.subtopic}</span>
                <CategoryBadge category={i.category} />
                {i.isSafety && <Badge tone="orange">안전 관련</Badge>}
              </span>
              <span className="mt-0.5 block text-[12px] text-ink-3">제안 {i.proposalCount} · 공감 {i.empathyCount} · 훈련장 {i.rangeCount}곳</span>
            </span>
            <span className="flex flex-col items-end gap-1.5" title={explainPriority(i.priorityBreakdown)}>
              <span className="text-[15px] font-medium tabular-nums">{i.priorityScore.toFixed(1)}</span>
              <span className="hidden w-24 sm:block"><StatusDistribution counts={i.statusCounts} total={i.proposalCount} /></span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
