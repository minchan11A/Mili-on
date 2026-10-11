'use client';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Notice, PageHeader } from '@/components/ui';
import { MaskHighlight } from '@/components/security/MaskHighlight';
import { getDataSource } from '@/lib/data';
import { useDebounced } from '@/lib/hooks';
import { ENTITY_TYPE_LABEL, maskText, restoreText, type EntityType } from '@/lib/masking';
import type { MaskCheckView } from '@/lib/types';
import { IS_DEMO } from '@/lib/config';

const EXAMPLES = [
  { label: '일반 문장', text: '점심 배식 줄이 너무 길어서 30분 넘게 기다렸어요. 배식구를 하나 더 열어 주세요.' },
  { label: '부대·장비 포함', text: '3사단 52연대 식당 배식 줄이 너무 길어요. 김민수 상병님이 K2 소총 반납 후 탄약고 앞에서 대기하라고 했는데, 문의는 010-1234-5678로 했어요.' },
  { label: '좌표 포함', text: '훈련장 위치는 37.8312, 127.5101 근처이고 탄약고 위치가 식당 바로 뒤라 위험해 보였어요.' },
];

/** 보안 마스킹 체험 화면 (명세 §5.2). 시연에서 가장 중요한 화면. 완전 오프라인 동작 */
export default function MaskingDemoPage() {
  const [text, setText] = useState(EXAMPLES[1].text);
  const debounced = useDebounced(text, 150);
  const [result, setResult] = useState<MaskCheckView | null>(null);

  useEffect(() => {
    let alive = true;
    getDataSource().maskCheck(debounced).then((r) => { if (alive) setResult(r); }, () => {
      const r = maskText(debounced);
      if (alive) setResult({ masked: r.masked, entities: r.entities, blocked: r.blocked, blockReasons: r.blockReasons });
    });
    return () => { alive = false; };
  }, [debounced]);

  // 복원 체험: vault는 이 브라우저 안에만 있고 외부로 나가지 않음
  const local = useMemo(() => maskText(debounced), [debounced]);
  const restorable = local.entities.filter((e) => local.vault[e.token] !== undefined);
  const sampleAiReply = restorable.length
    ? `${restorable[0].token} 관련 제안을 검토한 결과, 배식구를 2개로 늘리고 조별 교대 배식을 권합니다.${restorable[1] ? ` ${restorable[1].token}에 대한 추가 확인이 필요합니다.` : ''}`
    : '';

  return (
    <div>
      <PageHeader
        title="보안 마스킹 체험"
        sub="상용 AI로 보내기 전에 부대명·장비명·사람 이름·연락처를 가리고, 좌표·작전 관련 내용은 아예 전송을 막습니다."
        right={<Badge tone={IS_DEMO ? 'olive' : 'gray'}>{IS_DEMO ? '브라우저에서 실행 · 인터넷 연결 불필요' : '서버 측 마스킹 결과'}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">입력 (예비군이 쓴 원문)</h2>
            <span className="text-xs text-ink-3">{text.length}자</span>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex.label} type="button" onClick={() => setText(ex.text)} className="min-h-9 rounded-full border border-line px-3 text-sm font-medium hover:bg-surface-2">
                {ex.label}
              </button>
            ))}
            <button type="button" onClick={() => setText('')} className="min-h-9 rounded-full px-3 text-sm text-ink-3 hover:bg-surface-2">지우기</button>
          </div>
          <textarea
            data-testid="mask-input"
            aria-label="마스킹할 문장"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder="심사위원께서 불러 주시는 문장을 그대로 입력해 보세요."
            className="w-full rounded-xl border border-line p-3 text-[16px] leading-relaxed outline-none focus:border-primary"
          />
          <p className="mt-2 text-xs text-ink-3">
            처리 순서: 정규화 → 차단 검사(좌표·작전) → 정규식 → 사전(무기·작전용어·시설) → 이름 패턴. 같은 원문은 같은 토큰을 씁니다.
          </p>
        </Card>

        <div className="space-y-4">
          {result?.blocked && (
            <div role="alert" data-testid="mask-blocked" className="rounded-2xl border-2 border-danger bg-danger-soft p-4 text-danger">
              <div className="text-lg font-semibold">외부 전송 차단 · 사람 검토 대기</div>
              <p className="mt-1 text-sm">이 글은 상용 AI로 보내지 않습니다. 사유: {result.blockReasons.join(', ')}</p>
            </div>
          )}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">외부 AI로 나가는 텍스트</h2>
              {result && !result.blocked && <Badge tone="ai">가려진 표현 {result.entities.length}개</Badge>}
            </div>
            <div data-testid="mask-output" className={`min-h-28 rounded-xl p-3 text-[16px] leading-relaxed ${result?.blocked ? 'bg-surface-2 text-ink-3 line-through decoration-danger/50' : 'bg-surface-2'}`}>
              {result ? <MaskHighlight text={result.masked || ' '} /> : '…'}
            </div>
          </Card>
          <Card className="overflow-hidden">
            <h2 className="px-4 pt-4 font-semibold">탐지 항목</h2>
            {result && result.entities.length > 0 ? (
              <div className="overflow-x-auto">
                <table data-testid="mask-table" className="mt-2 w-full text-sm">
                  <thead className="bg-surface-2 text-left text-ink-2">
                    <tr><th className="px-4 py-2">유형</th><th className="px-2 py-2">원문</th><th className="px-2 py-2">토큰</th><th className="px-4 py-2">규칙</th></tr>
                  </thead>
                  <tbody>
                    {result.entities.map((e, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-4 py-2 whitespace-nowrap">{ENTITY_TYPE_LABEL[e.type as EntityType] ?? e.type}</td>
                        <td className="px-2 py-2 font-semibold">{e.original}</td>
                        <td className="px-2 py-2"><MaskHighlight text={e.token} /></td>
                        <td className="px-4 py-2 font-mono text-xs text-ink-3">{e.rule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 pb-4 pt-2 text-sm text-ink-3">가릴 표현이 없습니다. 생활 단어(식당, 화장실, 버스)는 AI가 의미를 이해하도록 그대로 둡니다.</p>
            )}
          </Card>
        </div>
      </div>

      {!local.blocked && sampleAiReply && (
        <Card className="mt-4 p-4">
          <h2 className="font-semibold">AI 응답 복원 (예시)</h2>
          <p className="mb-3 text-sm text-ink-2">토큰↔원문 대응표(vault)는 이 기기 안에만 있고 외부로 보내지 않습니다. 개인정보(전화번호 등)는 복원하지 않습니다.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-ai-soft p-3 text-sm"><div className="mb-1 text-xs font-semibold text-ai">AI가 돌려준 문장</div><MaskHighlight text={sampleAiReply} /></div>
            <div className="rounded-xl bg-surface-2 p-3 text-sm"><div className="mb-1 text-xs font-semibold text-ink-3">담당자 화면에 보이는 문장</div>{restoreText(sampleAiReply, local.vault)}</div>
          </div>
        </Card>
      )}

      <Notice className="mt-4">
        저장 단계에서도 같은 엔진이 돕니다. 예비군이 글을 쓸 때 부대명·장비명은 <b>[부대]</b>, <b>[장비]</b>로 가려진 채 저장되고, 좌표·작전 관련 내용은 등록 자체가 막힙니다.
      </Notice>
    </div>
  );
}
