'use client';
import { useState } from 'react';
import { Button, Card, inputCls, Notice } from '@/components/ui';
import { useToast } from '@/components/layout/Toast';
import { getDataSource } from '@/lib/data';
import { STATUS_LABEL, STATUSES } from '@/lib/constants';
import type { ProposalDetail, ProposalStatus } from '@/lib/types';

/** 담당자: 상태 변경(메모 필수) + 공식 답변 */
export function ManagerActions({ p, compact }: { p: ProposalDetail; compact?: boolean }) {
  const [to, setTo] = useState<ProposalStatus>(p.status);
  const [note, setNote] = useState('');
  const [reply, setReply] = useState(p.reply?.body ?? '');
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  const ds = getDataSource();
  return (
    <Card className={compact ? 'border-0 p-0' : 'p-4'} data-testid="manager-actions">
      {!compact && <h2 className="mb-3 font-semibold">담당자 처리</h2>}
      <div className="space-y-2">
        <label className="block text-sm font-semibold">상태 변경</label>
        <select aria-label="변경할 상태" className={inputCls} value={to} onChange={(e) => setTo(e.target.value as ProposalStatus)}>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <input aria-label="상태 변경 메모" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 (필수) 예: 다음 차수부터 배식구 2개 운영" />
        <Button className="w-full" disabled={to === p.status || !note.trim()} onClick={async () => {
          setErr(null);
          try { await ds.updateProposalStatus(p.id, to, note); setNote(''); toast(`'${STATUS_LABEL[to]}'(으)로 변경했습니다`); } catch (e) { setErr((e as Error).message); }
        }}>상태 변경</Button>
      </div>
      <div className="mt-4 space-y-2">
        <label className="block text-sm font-semibold">공식 답변 {p.reply && <span className="font-normal text-ink-3">(수정하면 덮어씁니다)</span>}</label>
        <textarea aria-label="공식 답변" className={inputCls} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="예비군에게 보이는 답변" />
        <Button variant="secondary" className="w-full" disabled={!reply.trim()} onClick={async () => {
          setErr(null);
          try { await ds.postOfficialReply({ type: 'PROPOSAL', id: p.id }, reply); toast('공식 답변을 등록했습니다'); } catch (e) { setErr((e as Error).message); }
        }}>공식 답변 등록</Button>
      </div>
      {err && <Notice tone="danger" className="mt-2">{err}</Notice>}
    </Card>
  );
}
