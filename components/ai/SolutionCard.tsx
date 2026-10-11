'use client';
import { useState } from 'react';
import { AiBadge, Badge, Card, Modal } from '@/components/ui';
import { BestPracticeCards } from '@/components/proposal/BestPracticeCards';
import { fmtDate } from '@/lib/format';
import type { AiSolutionView, Solution } from '@/lib/types';

const CONF = { low: ['낮음', 'gray'], medium: ['보통', 'blue'], high: ['높음', 'green'] } as const;

/** AI 대책 카드 (명세 §5.3): 문제 요약 → 즉시 조치 → 단기 → 중장기(예산 배지) → 참고 사례 → 확인 필요 → 신뢰도 */
export function SolutionCard({ view, solution }: { view: AiSolutionView; solution: Solution }) {
  const [caseId, setCaseId] = useState<string | null>(null);
  const caseView = view.cases.find((c) => c.id === caseId);
  return (
    <Card className="border-ai/30 p-4 sm:p-5" data-testid="solution-card">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AiBadge />
        {view.fromCache && <Badge tone="gray">사전 생성 응답 · 생성일 {fmtDate(view.generatedAt ?? view.createdAt)}{view.reviewed === false ? ' · 검수 전 초안' : ''}</Badge>}
        {!view.fromCache && <Badge tone="gray">{view.provider} · {fmtDate(view.createdAt)}</Badge>}
        {view.edited && <Badge tone="olive">담당자 수정본</Badge>}
        <span className="ml-auto text-sm">신뢰도 <Badge tone={CONF[solution.confidence][1]}>{CONF[solution.confidence][0]}</Badge></span>
      </div>
      {view.fallbackNotice && <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-yellow-900">{view.fallbackNotice}</p>}

      <section className="mb-4">
        <h3 className="mb-1 text-sm font-bold text-ink-3">문제 요약</h3>
        <p className="text-[16px] leading-relaxed">{solution.problemSummary}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section>
          <h3 className="mb-2 font-bold">⚡ 즉시 조치 <span className="text-xs font-normal text-ink-3">예산 없이</span></h3>
          <ul className="space-y-2 text-sm">
            {solution.immediateActions.map((a, i) => (
              <li key={i} className="rounded-xl bg-surface-2 p-3">
                <div className="font-semibold">{a.action}</div>
                <div className="mt-0.5 text-xs text-ink-3">담당: {a.owner}{a.note ? ` · ${a.note}` : ''}</div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 font-bold">🗓️ 단기 개선 <span className="text-xs font-normal text-ink-3">분기 내</span></h3>
          <ul className="space-y-2 text-sm">
            {solution.shortTerm.map((a, i) => (
              <li key={i} className="rounded-xl bg-surface-2 p-3">
                <div className="font-semibold">{a.action}</div>
                <div className="mt-0.5 text-xs text-ink-3">기대 효과: {a.expectedEffect}</div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 font-bold">🏗️ 중장기 과제</h3>
          <ul className="space-y-2 text-sm">
            {solution.longTerm.map((a, i) => (
              <li key={i} className="rounded-xl bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-2"><span className="font-semibold">{a.task}</span>{a.budgetNeeded && <Badge tone="purple">예산 필요</Badge>}</div>
                {a.note && <div className="mt-0.5 text-xs text-ink-3">{a.note}</div>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-4">
        <h3 className="mb-2 font-bold">📚 참고 사례</h3>
        {solution.referencedCases.length === 0 ? <Badge tone="gray">근거 사례 없음</Badge> : (
          <ul className="space-y-2">
            {solution.referencedCases.map((c) => {
              const bp = view.cases.find((x) => x.id === c.bestPracticeId);
              return (
                <li key={c.bestPracticeId}>
                  <button type="button" onClick={() => setCaseId(c.bestPracticeId)} className="w-full rounded-xl border border-line p-3 text-left text-sm hover:border-primary">
                    <b>{bp ? `${bp.rangeName} · ${bp.title}` : c.bestPracticeId}</b>
                    <span className="block text-ink-2">{c.why}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-4">
        <h3 className="mb-2 font-bold">🔍 담당자 확인 필요</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {solution.needsVerification.map((v, i) => <li key={i}>{v}</li>)}
        </ul>
      </section>

      <Modal open={!!caseView} onClose={() => setCaseId(null)} title="개선 사례">
        {caseView && <BestPracticeCards items={[caseView]} />}
      </Modal>
    </Card>
  );
}
