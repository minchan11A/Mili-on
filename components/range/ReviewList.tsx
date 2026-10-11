'use client';
import { useState } from 'react';
import { Badge, Button, EmptyState, ErrorBox, inputCls, Loading } from '@/components/ui';
import { useToast } from '@/components/layout/Toast';
import { ReportButton } from '@/components/proposal/ReportButton';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { SCORE_AXES } from '@/lib/constants';
import { fmtDate } from '@/lib/format';
import type { ReviewView } from '@/lib/types';

function ReplyForm({ review }: { review: ReviewView }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const toast = useToast();
  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>공식 답변</Button>;
  return (
    <div className="mt-2 flex gap-2">
      <input className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} placeholder="평가에 대한 공식 답변" aria-label="공식 답변" />
      <Button size="sm" disabled={!body.trim()} onClick={async () => {
        try { await getDataSource().postOfficialReply({ type: 'REVIEW', id: review.id }, body); toast('답변을 등록했습니다'); setOpen(false); } catch (e) { toast((e as Error).message, 'error'); }
      }}>등록</Button>
    </div>
  );
}

export function ReviewList({ rangeId, canReply }: { rangeId: string; canReply: boolean }) {
  const [page, setPage] = useState(1);
  const q = useQuery(() => getDataSource().listReviews(rangeId, page), [rangeId, page]);
  if (q.error) return <ErrorBox error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading rows={2} />;
  if (q.data.total === 0) return <EmptyState title="아직 평가가 없습니다" desc="이 훈련장을 이수했다면 첫 평가를 남겨 주세요." />;
  const pages = Math.ceil(q.data.total / q.data.pageSize);
  return (
    <div>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {q.data.items.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">{r.overall.toFixed(1)}</span>
                <span className="text-sm text-ink-3">{r.authorLabel} · {fmtDate(r.createdAt)}</span>
                {r.hidden && <Badge tone="red">신고로 숨김</Badge>}
              </div>
              <ReportButton targetType="REVIEW" targetId={r.id} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-3">
              {SCORE_AXES.map((a) => <span key={a.key}>{a.label} {r.scores[a.key]}</span>)}
            </div>
            {r.comment && <p className="mt-3 text-[14px]"><span className="mr-2 text-[12px] text-ink-3">다른 예비군에게</span>{r.comment}</p>}
            {r.reply ? (
              <div className="mt-2 rounded-xl bg-primary-soft p-3 text-sm"><b className="text-primary">훈련장 답변</b> {r.reply.body}</div>
            ) : canReply && <div className="mt-2"><ReplyForm review={r} /></div>}
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</Button>
          <span className="text-sm text-ink-2">{page} / {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>다음</Button>
        </div>
      )}
    </div>
  );
}
