'use client';
import { useState } from 'react';
import { AiBadge, Badge, Button, Card, EmptyState, ErrorBox, inputCls, Loading, Notice } from '@/components/ui';
import { SecurityWarning, type SecurityLevel } from '@/components/security/SecurityWarning';
import { ReportButton } from '@/components/proposal/ReportButton';
import { useToast } from '@/components/layout/Toast';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource, DataError } from '@/lib/data';
import { useLocalState, useQuery } from '@/lib/hooks';
import { GUIDE_SECTION_LABEL } from '@/lib/constants';
import { cx } from '@/lib/format';
import type { GuideSection, GuideView } from '@/lib/types';

const SECTIONS = Object.keys(GUIDE_SECTION_LABEL) as GuideSection[];

function Checklist({ rangeId, items }: { rangeId: string; items: GuideView[] }) {
  // 체크 상태는 이 기기 localStorage에만 저장 (개인 편의 기능)
  const [checked, setChecked] = useLocalState<string[]>(`milind-checklist-${rangeId}`, []);
  return (
    <ul className="space-y-2">
      {items.map((g) => {
        const on = checked.includes(g.id);
        return (
          <li key={g.id}>
            <label className={cx('flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3', on ? 'border-primary/40 bg-primary-soft' : 'border-line bg-surface')}>
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--c-primary)]" checked={on} onChange={() => setChecked(on ? checked.filter((x) => x !== g.id) : [...checked, g.id])} />
              <span className={cx('flex-1', on && 'text-ink-3 line-through')}>
                {g.isOfficial && <Badge tone="olive" className="mr-1.5">공식</Badge>}
                {g.body}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function GuideItem({ g }: { g: GuideView }) {
  const toast = useToast();
  return (
    <li className={cx('rounded-xl border p-3', g.isOfficial ? 'border-primary/30 bg-primary-soft/50' : 'border-line bg-surface')}>
      <div className="mb-1 flex items-center gap-2 text-xs text-ink-3">
        {g.isOfficial ? <Badge tone="olive">공식</Badge> : <Badge>꿀팁</Badge>}
        {!g.isOfficial && <span>{g.authorLabel}</span>}
        {g.hidden && <Badge tone="red">숨김</Badge>}
        <span className="ml-auto"><ReportButton targetType="GUIDE" targetId={g.id} /></span>
      </div>
      <p>{g.body}</p>
      <button type="button" className="mt-1 min-h-9 rounded-lg px-2 text-sm text-ink-2 hover:bg-surface-2" onClick={async () => {
        try { await getDataSource().markHelpful(g.id); } catch (e) { toast((e as Error).message, 'error'); }
      }}>도움돼요 {g.helpfulCount}</button>
    </li>
  );
}

function TipForm({ rangeId, official }: { rangeId: string; official: boolean }) {
  const [section, setSection] = useState<GuideSection>('CHECKLIST');
  const [body, setBody] = useState('');
  const [level, setLevel] = useState<SecurityLevel>('ok');
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  return (
    <Card className="p-4">
      <h3 className="mb-2 font-semibold">{official ? '공식 안내 작성' : '꿀팁 남기기'}</h3>
      <select aria-label="섹션" className={cx(inputCls, 'mb-2')} value={section} onChange={(e) => setSection(e.target.value as GuideSection)}>
        {SECTIONS.map((s) => <option key={s} value={s}>{GUIDE_SECTION_LABEL[s]}</option>)}
      </select>
      <SecurityWarning value={body} onChange={setBody} onLevelChange={setLevel} rows={3} maxLength={500} scheduleWarn placeholder="다음 훈련 오는 분께 도움이 될 팁 (훈련 일정·부대 정보는 쓰지 마세요)" label="가이드 내용" />
      {err && <Notice tone="danger" className="mt-2">{err}</Notice>}
      <div className="mt-2 flex justify-end">
        <Button disabled={!body.trim() || level === 'block'} onClick={async () => {
          setErr(null);
          try { await getDataSource().createGuideEntry({ rangeId, section, body }); setBody(''); toast('등록했습니다'); } catch (e) { setErr(e instanceof DataError && e.reasons ? `차단: ${e.reasons.join(', ')}` : (e as Error).message); }
        }}>등록</Button>
      </div>
    </Card>
  );
}

export function GuideTab({ rangeId }: { rangeId: string }) {
  const q = useQuery(() => getDataSource().listGuide(rangeId), [rangeId]);
  const { viewer } = useViewer();
  if (q.error) return <ErrorBox error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading />;
  const canOfficial = viewer?.role === 'RANGE_MANAGER' && viewer.managedRangeId === rangeId;
  const canTip = viewer?.role === 'RESERVIST';
  return (
    <div className="space-y-6" data-testid="guide-tab">
      {SECTIONS.map((s) => {
        const items = q.data!.filter((g) => g.section === s);
        return (
          <section key={s}>
            <h3 className="mb-2 text-base font-semibold">{GUIDE_SECTION_LABEL[s]}</h3>
            {items.length === 0 ? <p className="text-sm text-ink-3">아직 안내가 없습니다.</p>
              : s === 'CHECKLIST' ? <Checklist rangeId={rangeId} items={items} />
                : <ul className="space-y-2">{items.map((g) => <GuideItem key={g.id} g={g} />)}</ul>}
          </section>
        );
      })}
      {(canTip || canOfficial) && <TipForm rangeId={rangeId} official={canOfficial} />}
    </div>
  );
}

export function QnaTab({ rangeId }: { rangeId: string }) {
  const q = useQuery(() => getDataSource().listQuestions(rangeId), [rangeId]);
  const { viewer } = useViewer();
  const [body, setBody] = useState('');
  const [level, setLevel] = useState<SecurityLevel>('ok');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const toast = useToast();
  const canAnswer = viewer?.role === 'RESERVIST' || (viewer?.role === 'RANGE_MANAGER' && viewer.managedRangeId === rangeId);
  return (
    <div className="space-y-4" data-testid="qna-tab">
      {viewer?.role === 'RESERVIST' && (
        <Card className="p-4">
          <h3 className="mb-2 font-semibold">질문하기</h3>
          <SecurityWarning value={body} onChange={setBody} onLevelChange={setLevel} rows={2} maxLength={300} placeholder="예: 셔틀버스는 어디서 타나요?" label="질문" testId="qna-input" />
          {err && <Notice tone="danger" className="mt-2">{err}</Notice>}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-ink-3">가이드에 근거가 있으면 AI가 바로 1차 답변을 답니다.</span>
            <Button disabled={!body.trim() || level === 'block' || busy} onClick={async () => {
              setBusy(true); setErr(null);
              try { await getDataSource().askQuestion(rangeId, body); setBody(''); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
            }}>{busy ? '등록 중…' : '질문 등록'}</Button>
          </div>
        </Card>
      )}
      {q.error && <ErrorBox error={q.error} onRetry={q.reload} />}
      {!q.data ? <Loading /> : q.data.length === 0 ? <EmptyState title="아직 질문이 없습니다" /> : (
        <ul className="space-y-3">
          {q.data.map((qq) => (
            <li key={qq.id}>
              <Card className="p-4">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-primary">Q.</span>
                  <div className="flex-1">
                    <p className="font-semibold">{qq.body}</p>
                    <p className="text-xs text-ink-3">{qq.authorLabel}</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {qq.answers.map((a) => (
                    <li key={a.id} className={cx('rounded-xl p-3 text-sm', a.isAi ? 'bg-ai-soft' : 'bg-surface-2')}>
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                        {a.isAi ? <AiBadge>AI 답변</AiBadge> : <Badge>{a.authorLabel}</Badge>}
                        {a.isAi && a.sources.length > 0 && <span className="text-ai">근거: {a.sources.map((s) => `가이드 ${s.label}`).join(', ')}</span>}
                        <span className="ml-auto"><ReportButton targetType="ANSWER" targetId={a.id} /></span>
                      </div>
                      <p className="whitespace-pre-line">{a.body}</p>
                    </li>
                  ))}
                  {qq.waitingForHuman && (
                    <li className="text-xs text-ink-3">{qq.answers.length ? '사람 답변을 기다리는 중' : '⏳ 담당자 답변을 기다리는 중 (가이드에 근거가 없어 AI가 답하지 않았습니다)'}</li>
                  )}
                </ul>
                {canAnswer && (answering === qq.id ? (
                  <div className="mt-2 flex gap-2">
                    <input className={inputCls} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="답변" aria-label="답변" />
                    <Button size="sm" disabled={!answer.trim()} onClick={async () => {
                      try { await getDataSource().answerQuestion(qq.id, answer); setAnswer(''); setAnswering(null); } catch (e) { toast((e as Error).message, 'error'); }
                    }}>등록</Button>
                  </div>
                ) : <button type="button" className="mt-2 min-h-9 text-sm font-semibold text-primary" onClick={() => setAnswering(qq.id)}>답변 달기</button>)}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
