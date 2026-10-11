'use client';
import { useState } from 'react';
import { Button, Modal, inputCls } from '@/components/ui';
import { useToast } from '@/components/layout/Toast';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import type { ReportTargetType } from '@/lib/types';

const REASONS = ['욕설·비방', '개인정보 노출', '보안 위반 소지', '허위 내용', '기타'];

/** 신고 (3회 누적 시 자동 숨김) */
export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const { viewer } = useViewer();
  const toast = useToast();
  if (!viewer) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-9 rounded-lg px-2 text-xs text-ink-3 hover:bg-surface-2">🚩 신고</button>
      <Modal open={open} onClose={() => setOpen(false)} title="신고하기">
        <p className="mb-3 text-sm text-ink-2">신고가 3회 쌓이면 자동으로 숨겨지고 담당자가 확인합니다.</p>
        <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="신고 사유">
          {REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={async () => {
            try {
              const r = await getDataSource().report(targetType, targetId, reason);
              toast(r.hidden ? '신고가 누적되어 숨김 처리되었습니다' : '신고가 접수되었습니다');
              setOpen(false);
            } catch (e) { toast((e as Error).message, 'error'); }
          }}>신고</Button>
        </div>
      </Modal>
    </>
  );
}
