'use client';
import { useState } from 'react';
import { AdminGuard } from '@/components/layout/AdminGuard';
import { AdminNav } from '@/components/layout/AdminNav';
import { Badge, Button, Card, Chip, ChipRow, EmptyState, ErrorBox, Loading, Modal, PageHeader } from '@/components/ui';
import { MaskHighlight } from '@/components/security/MaskHighlight';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { ENTITY_TYPE_LABEL, type EntityType } from '@/lib/masking';
import { fmtDateTime } from '@/lib/format';
import type { MaskingAuditView } from '@/lib/types';

const PURPOSE: Record<string, string> = { AI_SOLUTION: 'AI 대책', AI_SUMMARY: 'AI 요약', AI_QNA: 'AI Q&A', MASKING_CHECK: '마스킹 검사' };

function Audit() {
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<MaskingAuditView | null>(null);
  const q = useQuery(() => getDataSource().listMaskingAudit(page, blockedOnly), [page, blockedOnly]);
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;
  return (
    <div>
      <PageHeader title="마스킹 감사 로그" sub="외부 AI로 나간 텍스트만 기록합니다. 원문과 토큰 대응표(vault)는 저장하지 않습니다." />
      <ChipRow className="mb-3">
        <Chip active={!blockedOnly} onClick={() => { setBlockedOnly(false); setPage(1); }}>전체</Chip>
        <Chip active={blockedOnly} onClick={() => { setBlockedOnly(true); setPage(1); }}>차단 건만</Chip>
      </ChipRow>
      <ErrorBox error={q.error} onRetry={q.reload} />
      {!q.data ? <Loading /> : q.data.items.length === 0 ? <EmptyState title="기록이 없습니다" /> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="audit-table">
            <thead className="bg-surface-2 text-left text-ink-2">
              <tr><th className="px-4 py-2">시각</th><th className="px-2 py-2">목적</th><th className="px-2 py-2">공급자</th><th className="px-2 py-2 text-right">가린 표현</th><th className="px-4 py-2">차단</th></tr>
            </thead>
            <tbody>
              {q.data.items.map((a) => (
                <tr key={a.id} onClick={() => setOpen(a)} className="cursor-pointer border-t border-line hover:bg-surface-2">
                  <td className="px-4 py-2 whitespace-nowrap tabular-nums">{fmtDateTime(a.createdAt)}</td>
                  <td className="px-2 py-2">{PURPOSE[a.purpose] ?? a.purpose}</td>
                  <td className="px-2 py-2 font-mono text-xs">{a.provider}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{a.entityTotal}</td>
                  <td className="px-4 py-2">{a.blocked ? <Badge tone="red">차단 · {a.blockReasons.join(', ')}</Badge> : <Badge tone="green">전송</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</Button>
          <span className="text-sm">{page} / {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>다음</Button>
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title="외부로 나간 텍스트" wide>
        {open && (
          <>
            <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
              {Object.entries(open.entityCounts).map(([k, v]) => <Badge key={k} tone="ai">{ENTITY_TYPE_LABEL[k as EntityType] ?? k} {v}</Badge>)}
            </div>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-4 font-sans text-sm"><MaskHighlight text={open.maskedText} /></pre>
          </>
        )}
      </Modal>
    </div>
  );
}

export default function AuditPage() {
  return <AdminGuard policyOnly><AdminNav /><Audit /></AdminGuard>;
}
