'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, EmptyState, Eyebrow, Field, inputCls, LinkButton, Loading, Notice } from '@/components/ui';
import { SecurityWarning, type SecurityLevel } from '@/components/security/SecurityWarning';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource, DataError } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { RANGE_TRAINING_TYPES, REVIEW_WINDOW_DAYS, SCORE_AXES, TRAINING_TYPE_LABEL } from '@/lib/constants';
import { MESSAGE_MAX, SCALE_LABELS, SURVEY_QUESTIONS, SURVEY_SECTIONS, scoresFromAnswers } from '@/lib/survey';
import { cx, fmtDate } from '@/lib/format';
import { IS_DEMO } from '@/lib/config';
import type { TrainingType } from '@/lib/types';
import { ScaleInput } from './ScaleInput';

type Training = { kind: 'record'; recordId: string; rangeId: string } | { kind: 'self'; rangeId: string; trainingType: TrainingType; date: string };

const today = () => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() + 9 * 3_600_000 - n * 86_400_000).toISOString().slice(0, 10);

/** 훈련 만족도 설문: 훈련 정보 → 일정 고지·교통·숙식·기타 (5단계) → 다른 예비군에게 전하고 싶은 말 */
export function SurveyForm({ presetRangeId }: { presetRangeId?: string }) {
  const ds = getDataSource();
  const { viewer, ready } = useViewer();
  const ranges = useQuery(() => ds.listRanges({}), []);
  const [training, setTraining] = useState<Training | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<SecurityLevel>('ok');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ rangeId: string; rangeName: string } | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 평가할 수 있는 이수 기록 (30일 이내, 아직 평가 전)
  const openRecords = useMemo(() => (viewer?.records ?? []).filter((r) => !r.reviewed && (Date.now() - new Date(r.completedAt).getTime()) / 86_400_000 <= REVIEW_WINDOW_DAYS), [viewer]);

  // 기본 선택: 지정 훈련장의 기록 → 첫 기록 → 본인 입력
  useEffect(() => {
    if (!viewer || training) return;
    const rec = openRecords.find((r) => !presetRangeId || r.rangeId === presetRangeId);
    if (rec) setTraining({ kind: 'record', recordId: rec.id, rangeId: rec.rangeId });
    else if (presetRangeId) setTraining({ kind: 'self', rangeId: presetRangeId, trainingType: 'BASIC', date: today() });
  }, [viewer, openRecords, presetRangeId, training]);

  const answered = SURVEY_QUESTIONS.filter((q) => answers[q.id]).length;
  const total = SURVEY_QUESTIONS.length;
  const complete = answered === total;

  function answer(id: string, v: number) {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    // 다음 미응답 문항으로 부드럽게 이동
    const idx = SURVEY_QUESTIONS.findIndex((q) => q.id === id);
    const nextQ = SURVEY_QUESTIONS.slice(idx + 1).find((q) => !next[q.id]);
    if (nextQ) setTimeout(() => rowRefs.current[nextQ.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }

  if (!ready) return <Loading />;
  if (!viewer) {
    return <EmptyState title="로그인 후 참여할 수 있습니다" desc="설문은 훈련을 받은 예비군만 참여합니다." action={<LinkButton href="/login?next=/survey">로그인</LinkButton>} />;
  }
  if (viewer.role !== 'RESERVIST') {
    return <EmptyState title="설문은 예비군만 참여할 수 있습니다" desc={IS_DEMO ? '상단에서 역할을 예비군으로 바꿔 보세요.' : '담당자 계정으로는 참여할 수 없습니다.'} />;
  }

  if (done) {
    const s = scoresFromAnswers(answers);
    return (
      <div className="mx-auto max-w-xl py-6 text-center" data-testid="survey-done">
        <Eyebrow>설문 완료</Eyebrow>
        <h1 className="mt-3 text-[30px] font-semibold">고맙습니다.</h1>
        <p className="mt-2 text-ink-2">{done.rangeName} 평가가 반영되었습니다. 남겨 주신 말은 다음 예비군에게 전해집니다.</p>
        <dl className="mx-auto mt-8 max-w-sm space-y-2 text-left">
          {SCORE_AXES.map((a) => (
            <div key={a.key} className="grid grid-cols-[72px_1fr_20px] items-center gap-3 text-[13px]">
              <dt className="text-ink-2">{a.label}</dt>
              <dd className="h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-ink" style={{ width: `${(s[a.key] / 5) * 100}%` }} /></dd>
              <dd className="text-right tabular-nums">{s[a.key]}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          <LinkButton href={`/ranges/${done.rangeId}/propose`}>불편한 점 제안하기</LinkButton>
          <LinkButton href={`/ranges/${done.rangeId}`} variant="secondary">훈련장 보기</LinkButton>
        </div>
      </div>
    );
  }

  const rangeById = new Map((ranges.data ?? []).map((r) => [r.id, r]));
  const selfRange = training?.kind === 'self' ? rangeById.get(training.rangeId) : undefined;
  const trainingReady = training && (training.kind === 'record' || (training.rangeId && training.date));

  async function submit() {
    if (!training) return;
    setBusy(true); setErr(null);
    try {
      await ds.createReview({
        rangeId: training.rangeId,
        ...(training.kind === 'record' ? { recordId: training.recordId } : { selfReport: { trainingType: training.trainingType, completedAt: new Date(`${training.date}T17:00:00+09:00`).toISOString() } }),
        answers, comment: message,
      });
      setDone({ rangeId: training.rangeId, rangeName: rangeById.get(training.rangeId)?.name ?? '' });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(e instanceof DataError && e.code === 'BLOCKED' ? `보안 검사에서 막혔습니다: ${(e.reasons ?? []).join(', ')}` : (e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <Eyebrow>훈련 만족도 설문</Eyebrow>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[34px]">이번 훈련은 어땠나요?</h1>
        <p className="mt-3 text-ink-2">{total}개 문항, 2분이면 끝납니다. 정답은 없어요. 느낀 그대로 골라 주세요.</p>
      </div>

      {/* 진행률 */}
      <div className="sticky top-16 z-30 -mx-4 mb-8 bg-[color-mix(in_srgb,var(--c-bg)_92%,transparent)] px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex items-center gap-3 text-[12px] text-ink-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
          <span className="tabular-nums" data-testid="survey-progress">{answered} / {total}</span>
        </div>
      </div>

      {/* 0. 훈련 정보 */}
      <section className="mb-14">
        <SectionHead n={0} title="훈련 정보" desc="어느 훈련에 대한 평가인가요?" />
        {openRecords.length > 0 && (
          <div className="space-y-2" role="radiogroup" aria-label="이수 기록">
            {openRecords.map((r) => {
              const on = training?.kind === 'record' && training.recordId === r.id;
              return (
                <button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => setTraining({ kind: 'record', recordId: r.id, rangeId: r.rangeId })}
                  className={cx('flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors', on ? 'border-ink bg-surface' : 'border-line bg-surface hover:border-ink-3')}>
                  <span>
                    <span className="block font-medium">{r.rangeName}</span>
                    <span className="text-[13px] text-ink-3">{TRAINING_TYPE_LABEL[r.trainingType]} · {fmtDate(r.completedAt)} 이수</span>
                  </span>
                  <span className={cx('h-4 w-4 rounded-full border-[1.5px]', on ? 'border-ink bg-ink shadow-[inset_0_0_0_3px_#fff]' : 'border-line')} />
                </button>
              );
            })}
          </div>
        )}
        <button type="button" onClick={() => setTraining({ kind: 'self', rangeId: presetRangeId ?? '', trainingType: 'BASIC', date: today() })}
          className={cx('mt-2 w-full rounded-2xl border px-5 py-4 text-left text-[14px] transition-colors', training?.kind === 'self' ? 'border-ink bg-surface' : 'border-dashed border-line text-ink-2 hover:border-ink-3')}>
          {openRecords.length ? '다른 훈련 직접 입력' : '훈련 정보 입력'}
          <span className="block text-[12px] text-ink-3">최근 {REVIEW_WINDOW_DAYS}일 안에 받은 훈련만 평가할 수 있습니다</span>
        </button>
        {training?.kind === 'self' && (
          <div className="mt-3 grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-3">
            <Field label="훈련장">
              <select aria-label="훈련장" className={inputCls} value={training.rangeId} onChange={(e) => {
                const r = rangeById.get(e.target.value);
                setTraining({ ...training, rangeId: e.target.value, trainingType: r ? RANGE_TRAINING_TYPES[r.type][0] : training.trainingType });
              }}>
                <option value="">선택</option>
                {(ranges.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((r) => <option key={r.id} value={r.id}>{r.name} · {r.sigungu}</option>)}
              </select>
            </Field>
            <Field label="훈련 유형">
              <select aria-label="훈련 유형" className={inputCls} value={training.trainingType} onChange={(e) => setTraining({ ...training, trainingType: e.target.value as TrainingType })}>
                {(selfRange ? RANGE_TRAINING_TYPES[selfRange.type] : (Object.keys(TRAINING_TYPE_LABEL) as TrainingType[])).map((t) => <option key={t} value={t}>{TRAINING_TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="훈련 날짜">
              <input aria-label="훈련 날짜" type="date" className={inputCls} value={training.date} min={daysAgo(REVIEW_WINDOW_DAYS)} max={today()} onChange={(e) => setTraining({ ...training, date: e.target.value })} />
            </Field>
            <p className="text-[12px] text-ink-3 sm:col-span-3">실제 도입 시에는 예비군 홈페이지 이수 기록과 연동해 이 단계가 사라집니다.</p>
          </div>
        )}
      </section>

      {/* 1~4. 문항 */}
      {SURVEY_SECTIONS.map((sec, si) => (
        <section key={sec.id} className="mb-14" aria-labelledby={`sec-${sec.id}`}>
          <SectionHead n={si + 1} title={sec.title} desc={sec.desc} id={`sec-${sec.id}`} />
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {sec.questions.map((q) => {
              const v = answers[q.id];
              return (
                <div key={q.id} ref={(el) => { rowRefs.current[q.id] = el; }} className={cx('px-4 py-7 text-center transition-opacity sm:px-8', !!v && 'opacity-60 hover:opacity-100')}>
                  <p className="text-[16px] font-medium leading-snug sm:text-[17px]">{q.title}</p>
                  {q.hint && <p className="mt-1 text-[12px] text-ink-3">{q.hint}</p>}
                  <div className="mt-5"><ScaleInput value={v} onChange={(x) => answer(q.id, x)} label={q.title} testId={`q-${q.id}`} /></div>
                  <div className="mx-auto mt-2 flex max-w-[260px] justify-between text-[11px] sm:hidden">
                    <span className="text-score-low">불만족</span><span className="text-accent">만족</span>
                  </div>
                  <p className="mt-2 h-4 text-[12px] text-ink-3">{v ? SCALE_LABELS[v - 1] : ''}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* 5. 다른 예비군에게 */}
      <section className="mb-10">
        <SectionHead n={5} title="다른 예비군에게 전하고 싶은 말" desc="이 훈련장에 올 다음 예비군에게 남기는 한마디 (선택)" />
        <SecurityWarning value={message} onChange={setMessage} onLevelChange={setLevel} rows={3} maxLength={MESSAGE_MAX}
          placeholder="예: 점심 줄이 길어요. 오전 교육 끝나면 바로 식당으로 가세요." label="다른 예비군에게 전하고 싶은 말" testId="survey-message" />
        <p className="mt-1.5 text-right text-[12px] text-ink-3 tabular-nums">{message.length}/{MESSAGE_MAX}</p>
      </section>

      {err && <Notice tone="danger" className="mb-3">{err}</Notice>}
      <Button size="lg" className="w-full" disabled={!complete || !trainingReady || level === 'block' || busy} onClick={submit} data-testid="survey-submit">
        {!trainingReady ? '훈련 정보를 선택해 주세요' : !complete ? `${total - answered}개 문항이 남았어요` : busy ? '제출 중…' : '설문 제출'}
      </Button>
      <p className="mt-3 text-center text-[12px] text-ink-3">응답은 훈련장별 점수로만 집계되고, 담당자에게는 작성자 별명 대신 연령대·훈련 유형만 보입니다.</p>
      <p className="mt-1 text-center text-[12px]"><Link href="/map" className="text-ink-3 underline-offset-2 hover:underline">만족도 지도에서 결과 보기</Link></p>
    </div>
  );
}

function SectionHead({ n, title, desc, id }: { n: number; title: string; desc: string; id?: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="text-[13px] font-medium tabular-nums text-ink-3">{String(n).padStart(2, '0')}</span>
      <div>
        <h2 id={id} className="text-[19px] font-semibold">{title}</h2>
        <p className="text-[13px] text-ink-3">{desc}</p>
      </div>
    </div>
  );
}
