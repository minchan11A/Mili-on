'use client';
import { useMemo, useState } from 'react';
import { AdminGuard } from '@/components/layout/AdminGuard';
import { AdminNav } from '@/components/layout/AdminNav';
import { useToast } from '@/components/layout/Toast';
import { Badge, Button, Card, CategoryBadge, Chip, ChipRow, EmptyState, ErrorBox, inputCls, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { ManagerActions } from '@/components/proposal/ManagerActions';
import { MaskHighlight } from '@/components/security/MaskHighlight';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { OVERDUE_DAYS, STATUS_LABEL, STATUSES } from '@/lib/constants';
import { cx, fmtDate } from '@/lib/format';
import type { ProposalStatus } from '@/lib/types';

function Queue() {
  const ds = getDataSource();
  const [filter, setFilter] = useState<'open' | ProposalStatus | ''>('open');
  const [selected, setSelected] = useState<string | null>(null);
  const [bulkTo, setBulkTo] = useState<ProposalStatus>('REVIEWING');
  const [bulkNote, setBulkNote] = useState('');
  const toast = useToast();
  const q = useQuery(() => ds.listProposals({ managedOnly: true, openOnly: filter === 'open', status: filter === 'open' ? '' : filter, sort: 'oldest', pageSize: 200 }), [filter]);
  const detail = useQuery(() => ds.getProposal(selected!), [selected], !!selected);
  const sameIssue = useMemo(() => (q.data && detail.data?.issueId ? q.data.items.filter((p) => p.issueId === detail.data!.issueId && p.status !== 'DONE' && p.status !== 'LONG_TERM') : []), [q.data, detail.data]);

  return (
    <div>
      <PageHeader title="제안 처리 큐" sub="오래된 순입니다. 행을 선택해 상태를 바꾸고 공식 답변을 남기세요." />
      <ChipRow className="mb-3">
        <Chip active={filter === 'open'} onClick={() => setFilter('open')}>처리 중 전체</Chip>
        {STATUSES.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_LABEL[s]}</Chip>)}
        <Chip active={filter === ''} onClick={() => setFilter('')}>전체</Chip>
      </ChipRow>
      <ErrorBox error={q.error} onRetry={q.reload} />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-x-auto">
          {!q.data ? <div className="p-4"><Loading /></div> : q.data.items.length === 0 ? <div className="p-4"><EmptyState title="처리할 제안이 없습니다" /></div> : (
            <table className="w-full text-sm" data-testid="queue-table">
              <thead className="bg-surface-2 text-left text-ink-2">
                <tr><th className="px-3 py-2">제목</th><th className="px-2 py-2">분야</th><th className="px-2 py-2">훈련장</th><th className="px-2 py-2 text-right">공감</th><th className="px-2 py-2 text-right">경과</th><th className="px-3 py-2">상태</th></tr>
              </thead>
              <tbody>
                {q.data.items.map((p) => {
                  const overdue = p.status === 'RECEIVED' && p.ageDays >= OVERDUE_DAYS;
                  return (
                    <tr key={p.id} onClick={() => setSelected(p.id)} className={cx('cursor-pointer border-t border-line hover:bg-surface-2', selected === p.id && 'bg-primary-soft')}>
                      <td className="max-w-[260px] truncate px-3 py-2 font-semibold">{p.title}</td>
                      <td className="px-2 py-2"><CategoryBadge category={p.category} /></td>
                      <td className="px-2 py-2 whitespace-nowrap">{p.rangeName}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{p.empathyCount}</td>
                      <td className={cx('px-2 py-2 text-right tabular-nums whitespace-nowrap', overdue && 'font-semibold text-danger')}>{p.ageDays}일{overdue && ' '}</td>
                      <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
        <div className="space-y-3">
          {!selected ? <Card className="p-6 text-center text-ink-3">왼쪽 표에서 제안을 선택하세요.</Card> : !detail.data ? <Loading rows={2} /> : (
            <>
              <Card className="p-4">
                <div className="mb-1 flex flex-wrap gap-1.5"><CategoryBadge category={detail.data.category} subtopic={detail.data.subtopic} /><StatusBadge status={detail.data.status} /></div>
                <h2 className="font-semibold">{detail.data.title}</h2>
                <p className="mt-1 text-sm text-ink-3">{detail.data.authorLabel} · {fmtDate(detail.data.createdAt)}</p>
                <p className="mt-2 text-sm"><MaskHighlight text={detail.data.body} /></p>
              </Card>
              <ManagerActions key={`${detail.data.id}-${detail.data.status}`} p={detail.data} />
              {sameIssue.length > 1 && (
                <Card className="p-4">
                  <h3 className="font-semibold">같은 이슈 일괄 처리 <Badge tone="olive">{sameIssue.length}건</Badge></h3>
                  <p className="mb-2 text-xs text-ink-3">“{detail.data.issueTitle}” 이슈의 처리 중 제안을 한 번에 바꿉니다.</p>
                  <select aria-label="일괄 변경 상태" className={cx(inputCls, 'mb-2')} value={bulkTo} onChange={(e) => setBulkTo(e.target.value as ProposalStatus)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <input aria-label="일괄 변경 메모" className={cx(inputCls, 'mb-2')} value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="메모 (필수)" />
                  <Button className="w-full" disabled={!bulkNote.trim()} onClick={async () => {
                    let n = 0;
                    try {
                      for (const p of sameIssue) if (p.status !== bulkTo) { await ds.updateProposalStatus(p.id, bulkTo, bulkNote); n++; }
                      toast(`${n}건을 '${STATUS_LABEL[bulkTo]}'(으)로 변경했습니다`); setBulkNote('');
                    } catch (e) { toast((e as Error).message, 'error'); }
                  }}>일괄 변경</Button>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QueuePage() {
  return <AdminGuard><AdminNav /><Queue /></AdminGuard>;
}
