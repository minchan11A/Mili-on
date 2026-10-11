'use client';
import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { MaskHighlight } from '@/components/security/MaskHighlight';
import type { AiSolutionView } from '@/lib/types';

/** "외부로 나간 텍스트 보기": 상용 AI에 실제로 보낸 (마스킹된) 프롬프트 원문. 시연 핵심 장면 */
export function MaskedPayloadView({ view }: { view: AiSolutionView }) {
  const [open, setOpen] = useState(false);
  const tokens = new Set(view.maskedRequest.match(/\[(?:부대|장비|작전용어|시설|위치|인물|전화번호|군번|주민번호|차량번호|이메일)(?:_\d+)?\]/g) ?? []);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={open ? 'primary' : 'secondary'} onClick={() => setOpen(!open)} data-testid="toggle-payload" aria-expanded={open}>
          🛡️ 외부로 나간 텍스트 {open ? '접기' : '보기'}
        </Button>
        <Badge tone="ai">가려진 표현 {tokens.size}종</Badge>
        {!!view.blockedCount && <Badge tone="red">차단되어 제외된 제안 {view.blockedCount}건</Badge>}
        <span className="text-xs text-ink-3">공급자: {view.provider} · 토큰↔원문 대응표는 저장하지 않고 버립니다</span>
      </div>
      {open && (
        <pre data-testid="masked-payload" className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-4 font-sans text-sm leading-relaxed">
          <MaskHighlight text={view.maskedRequest} />
        </pre>
      )}
    </Card>
  );
}
