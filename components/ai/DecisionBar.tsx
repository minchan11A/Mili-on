'use client';
import { useState } from 'react';
import { Button, Card, Field, inputCls, Modal, Notice } from '@/components/ui';
import { useToast } from '@/components/layout/Toast';
import { getDataSource } from '@/lib/data';
import { STATUS_LABEL, STATUSES } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import type { AiSolutionView, ProposalStatus, Solution } from '@/lib/types';
import { SolutionEditor } from './SolutionEditor';

const DECISION_LABEL = { PENDING: '결정 대기', ADOPTED: '채택', ADOPTED_EDITED: '수정 후 채택', REJECTED: '기각' } as const;

/** 채택 / 수정 후 채택(인라인 편집) / 기각. 채택 시 관련 제안 일괄 상태 변경 + 공식 답변 */
export function DecisionBar({ view, openCount, onEditingChange, editing, draft, setDraft }: {
  view: AiSolutionView; openCount: number;
  editing: boolean; onEditingChange: (v: boolean) => void;
  draft: Solution; setDraft: (s: Solution) => void;
}) {
  const [mode, setMode] = useState<null | 'ADOPTED' | 'ADOPTED_EDITED'>(null);
  const [bulk, setBulk] = useState(true);
  const [bulkStatus, setBulkStatus] = useState<ProposalStatus>('PLANNED');
  const [note, setNote] = useState('AI 대책 초안을 검토해 조치 계획을 세웠습니다.');
  const sol = view.edited ?? view.solution;
  const [reply, setReply] = useState(`비슷한 제안이 여러 훈련장에서 모였습니다. 다음과 같이 조치하겠습니다.\n${sol.immediateActions.map((a) => `- ${a.action}`).join('\n')}`);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (view.decision !== 'PENDING') {
    return (
      <Notice tone={view.decision === 'REJECTED' ? 'warn' : 'ok'}>
        <b>{DECISION_LABEL[view.decision]}</b> 처리됨 · {fmtDateTime(view.decidedAt)}
        {view.decision !== 'REJECTED' && ' · 관련 제안 상태와 공식 답변이 반영되었습니다.'}
      </Notice>
    );
  }

  async function decide(decision: 'ADOPTED' | 'ADOPTED_EDITED' | 'REJECTED') {
    setBusy(true); setErr(null);
    try {
      await getDataSource().decideAiSolution(view.id, {
        decision,
        edited: decision === 'ADOPTED_EDITED' ? draft : undefined,
        bulkStatus: decision !== 'REJECTED' && bulk ? bulkStatus : undefined,
        bulkNote: note,
        replyBody: decision !== 'REJECTED' && bulk ? reply : undefined,
      });
      toast(decision === 'REJECTED' ? '기각했습니다' : '채택하고 관련 제안에 반영했습니다');
      setMode(null); onEditingChange(false);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <>
      {editing && <Card className="p-4"><h3 className="mb-3 font-bold">✏️ 초안 수정</h3><SolutionEditor value={draft} onChange={setDraft} /></Card>}
      <div className="sticky bottom-16 z-30 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-3 shadow-lg md:bottom-3" data-testid="decision-bar">
        <span className="mr-auto self-center text-sm text-ink-2">AI 초안은 담당자가 결정해야 반영됩니다</span>
        {editing ? (
          <>
            <Button variant="ghost" onClick={() => onEditingChange(false)}>수정 취소</Button>
            <Button onClick={() => setMode('ADOPTED_EDITED')} data-testid="adopt-edited-confirm">수정본으로 채택</Button>
          </>
        ) : (
          <>
            <Button variant="danger" disabled={busy} onClick={() => decide('REJECTED')}>기각</Button>
            <Button variant="secondary" onClick={() => onEditingChange(true)} data-testid="adopt-edited">수정 후 채택</Button>
            <Button onClick={() => setMode('ADOPTED')} data-testid="adopt">채택</Button>
          </>
        )}
      </div>
      <Modal open={!!mode} onClose={() => setMode(null)} title={mode === 'ADOPTED_EDITED' ? '수정본으로 채택' : '채택'}>
        <div className="space-y-3">
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={bulk} onChange={(e) => setBulk(e.target.checked)} />
            <span>관련 제안 <b>{openCount}건</b>의 상태를 한 번에 바꾸고 공식 답변을 등록합니다<span className="block text-xs text-ink-3">담당자는 자기 훈련장 제안만 바뀝니다</span></span>
          </label>
          {bulk && (
            <>
              <Field label="변경할 상태">
                <select className={inputCls} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as ProposalStatus)} aria-label="일괄 변경 상태">
                  {STATUSES.filter((s) => s !== 'RECEIVED').map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="상태 변경 메모"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} aria-label="메모" /></Field>
              <Field label="공식 답변 (예비군에게 보임)"><textarea className={inputCls} rows={5} value={reply} onChange={(e) => setReply(e.target.value)} aria-label="공식 답변" /></Field>
            </>
          )}
          {err && <Notice tone="danger">{err}</Notice>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMode(null)}>취소</Button>
            <Button disabled={busy || (bulk && !note.trim())} onClick={() => decide(mode!)} data-testid="decision-confirm">{busy ? '처리 중…' : '확정'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
