'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Badge, Button, Card, CategoryBadge, EmptyState, Loading, StatusBadge } from '@/components/ui';
import { StatusStepper } from '@/components/proposal/StatusStepper';
import { ManagerActions } from '@/components/proposal/ManagerActions';
import { ReportButton } from '@/components/proposal/ReportButton';
import { MaskHighlight } from '@/components/security/MaskHighlight';
import { useToast } from '@/components/layout/Toast';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { STATUS_LABEL } from '@/lib/constants';
import { fmtDate, fmtDateTime } from '@/lib/format';

/** 제안 상세 (?id= 쿼리 방식: 시연 중 새로 만든 제안도 정적 빌드에서 열림) */
function ProposalDetailView() {
  const id = useSearchParams().get('id') ?? '';
  const ds = getDataSource();
  const q = useQuery(() => ds.getProposal(id), [id], !!id);
  const { viewer } = useViewer();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!id) return <EmptyState title="제안을 선택해 주세요" />;
  if (q.error) return <EmptyState title="제안을 찾을 수 없습니다" desc={q.error.message} action={<Link className="text-primary" href="/proposals">제안 목록</Link>} />;
  if (!q.data) return <Loading />;
  const p = q.data;
  const canManage = (viewer?.role === 'RANGE_MANAGER' && viewer.managedRangeId === p.rangeId) || viewer?.role === 'POLICY_ADMIN';

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div>
          <Link href={`/ranges/${p.rangeId}?tab=proposals`} className="text-sm text-ink-3">← {p.rangeName} 개선 제안</Link>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={p.category} subtopic={p.subtopic} />
            <StatusBadge status={p.status} />
            {p.isMine && <Badge tone="yellow">내 제안</Badge>}
            {p.issueTitle && p.issueId && <Link href={`/issue?id=${p.issueId}`}><Badge tone="gray">이슈: {p.issueTitle}</Badge></Link>}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold" data-testid="proposal-title-view">{p.title}</h1>
          <p className="mt-1 text-sm text-ink-3">{p.authorLabel} · {fmtDate(p.createdAt)} · {p.rangeName}</p>
        </div>

        <Card className="p-4"><StatusStepper status={p.status} /></Card>

        <Card className="p-4">
          <p className="whitespace-pre-wrap text-[16px] leading-relaxed"><MaskHighlight text={p.body} /></p>
          <div className="mt-4 flex items-center justify-between">
            {viewer?.role === 'RESERVIST' && !p.isMine ? (
              <Button variant={p.empathized ? 'primary' : 'secondary'} disabled={busy} data-testid="empathy-button" onClick={async () => {
                setBusy(true);
                try { await ds.toggleEmpathy(p.id); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
              }}>👍 {p.empathized ? '공감함' : '공감'} {p.empathyCount}</Button>
            ) : <span className="text-sm text-ink-2">👍 공감 {p.empathyCount}</span>}
            <ReportButton targetType="PROPOSAL" targetId={p.id} />
          </div>
        </Card>

        {p.reply ? (
          <Card className="border-primary/30 bg-primary-soft/40 p-4" data-testid="official-reply">
            <div className="mb-2 flex items-center gap-2">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-white">{p.rangeName.slice(0, 1)}</span>
              <div>
                <div className="font-bold">{p.reply.authorLabel}</div>
                <div className="text-xs text-ink-3">공식 답변 · {fmtDate(p.reply.createdAt)}</div>
              </div>
            </div>
            <p className="whitespace-pre-wrap">{p.reply.body}</p>
          </Card>
        ) : <Card className="p-4 text-sm text-ink-3">아직 공식 답변이 없습니다.</Card>}

        <section>
          <h2 className="mb-2 font-bold">처리 이력</h2>
          <ol className="relative space-y-4 border-l-2 border-line pl-5" data-testid="history">
            {p.history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-primary" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={h.to} />
                  <span className="text-ink-3">{fmtDateTime(h.createdAt)} · {h.actorLabel}</span>
                </div>
                {h.note && <p className="mt-1 text-sm">{h.note}</p>}
                {h.from && <p className="text-xs text-ink-3">{STATUS_LABEL[h.from]} → {STATUS_LABEL[h.to]}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
      {canManage && <div><ManagerActions key={`${p.status}-${p.reply?.body ?? ''}`} p={p} /></div>}
    </div>
  );
}

export default function ProposalPage() {
  return <Suspense fallback={<Loading />}><ProposalDetailView /></Suspense>;
}
