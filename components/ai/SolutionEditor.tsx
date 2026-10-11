'use client';
import { Button, inputCls } from '@/components/ui';
import type { Solution } from '@/lib/types';

/** 수정 후 채택: 초안 인라인 편집 */
export function SolutionEditor({ value, onChange }: { value: Solution; onChange: (s: Solution) => void }) {
  const set = <K extends keyof Solution>(k: K, v: Solution[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4 text-sm">
      <label className="block">
        <span className="font-semibold">문제 요약</span>
        <textarea className={inputCls} rows={3} maxLength={400} value={value.problemSummary} onChange={(e) => set('problemSummary', e.target.value)} />
      </label>
      <fieldset>
        <legend className="font-semibold">즉시 조치</legend>
        {value.immediateActions.map((a, i) => (
          <div key={i} className="mt-1 grid gap-1 sm:grid-cols-[1fr_160px_auto]">
            <input className={inputCls} value={a.action} aria-label={`즉시 조치 ${i + 1}`} onChange={(e) => set('immediateActions', value.immediateActions.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)))} />
            <input className={inputCls} value={a.owner} aria-label={`담당 ${i + 1}`} onChange={(e) => set('immediateActions', value.immediateActions.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)))} />
            <Button variant="ghost" size="sm" onClick={() => set('immediateActions', value.immediateActions.filter((_, j) => j !== i))}>삭제</Button>
          </div>
        ))}
        {value.immediateActions.length < 5 && <Button variant="ghost" size="sm" onClick={() => set('immediateActions', [...value.immediateActions, { action: '', owner: '훈련장 담당' }])}>+ 추가</Button>}
      </fieldset>
      <fieldset>
        <legend className="font-semibold">단기 개선</legend>
        {value.shortTerm.map((a, i) => (
          <div key={i} className="mt-1 grid gap-1 sm:grid-cols-[1fr_1fr_auto]">
            <input className={inputCls} value={a.action} aria-label={`단기 개선 ${i + 1}`} onChange={(e) => set('shortTerm', value.shortTerm.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)))} />
            <input className={inputCls} value={a.expectedEffect} aria-label={`기대 효과 ${i + 1}`} onChange={(e) => set('shortTerm', value.shortTerm.map((x, j) => (j === i ? { ...x, expectedEffect: e.target.value } : x)))} />
            <Button variant="ghost" size="sm" onClick={() => set('shortTerm', value.shortTerm.filter((_, j) => j !== i))}>삭제</Button>
          </div>
        ))}
      </fieldset>
      <fieldset>
        <legend className="font-semibold">중장기 과제</legend>
        {value.longTerm.map((a, i) => (
          <div key={i} className="mt-1 grid gap-1 sm:grid-cols-[1fr_auto_auto]">
            <input className={inputCls} value={a.task} aria-label={`중장기 과제 ${i + 1}`} onChange={(e) => set('longTerm', value.longTerm.map((x, j) => (j === i ? { ...x, task: e.target.value } : x)))} />
            <label className="flex items-center gap-1 whitespace-nowrap"><input type="checkbox" checked={a.budgetNeeded} onChange={(e) => set('longTerm', value.longTerm.map((x, j) => (j === i ? { ...x, budgetNeeded: e.target.checked } : x)))} />예산 필요</label>
            <Button variant="ghost" size="sm" onClick={() => set('longTerm', value.longTerm.filter((_, j) => j !== i))}>삭제</Button>
          </div>
        ))}
      </fieldset>
      <label className="block">
        <span className="font-semibold">확인 필요 사항 (한 줄에 하나)</span>
        <textarea className={inputCls} rows={3} value={value.needsVerification.join('\n')} onChange={(e) => set('needsVerification', e.target.value.split('\n').filter((x) => x.trim()))} />
      </label>
    </div>
  );
}
