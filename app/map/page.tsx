'use client';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { KoreaMap } from '@/components/map/KoreaMap';
import { RangePanel } from '@/components/map/RangePanel';
import { Card, Chip, ChipRow, EmptyState, ErrorBox, inputCls, Loading, PageHeader, scoreColor, TrendMark } from '@/components/ui';
import { getDataSource } from '@/lib/data';
import { useMediaQuery, useQuery } from '@/lib/hooks';
import { RANGE_TYPE_LABEL, SCORE_AXES, SIDO_SHORT, TRAINING_TYPE_LABEL } from '@/lib/constants';
import { cx, fmtScore } from '@/lib/format';
import type { RangeFilter, RangeSummary, ScoreSet, TrainingType } from '@/lib/types';

type Metric = 'overall' | keyof ScoreSet;

export default function MapPage() {
  const ds = getDataSource();
  const [trainingType, setTrainingType] = useState<TrainingType | ''>('');
  const [sido, setSido] = useState('');
  const [metric, setMetric] = useState<Metric>('overall');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<string | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const filter: RangeFilter = { trainingType, sido, sort: metric };
  const q = useQuery(() => ds.listRanges(filter), [trainingType, sido, metric]);
  const all = useQuery(() => ds.listRanges({}), []);
  const sidos = useMemo(() => [...new Set((all.data ?? []).map((r) => r.sido))].sort(), [all.data]);
  const value = useCallback((r: RangeSummary) => (metric === 'overall' ? r.overall : r.scores[metric]), [metric]);
  const sel = q.data?.find((r) => r.id === selected) ?? null;

  return (
    <div>
      <PageHeader
        title="만족도 지도"
        sub="예비군이 직접 남긴 평가로 만든 훈련장 점수입니다. 숫자 옆 ▲▼는 최근 3개월 변화입니다."
        right={
          <div className="flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="보기 방식">
            {(['map', 'list'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cx('min-h-9 rounded-lg px-3 text-sm font-semibold', view === v ? 'bg-primary text-white' : 'text-ink-2')}>
                {v === 'map' ? '지도' : '목록'}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <select aria-label="훈련 유형" className={inputCls} value={trainingType} onChange={(e) => setTrainingType(e.target.value as TrainingType | '')}>
          <option value="">모든 훈련 유형</option>
          {(Object.keys(TRAINING_TYPE_LABEL) as TrainingType[]).map((t) => <option key={t} value={t}>{TRAINING_TYPE_LABEL[t]}</option>)}
        </select>
        <select aria-label="시도" className={inputCls} value={sido} onChange={(e) => setSido(e.target.value)}>
          <option value="">전국</option>
          {sidos.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <ChipRow className="mb-4">
        <Chip active={metric === 'overall'} onClick={() => setMetric('overall')}>종합</Chip>
        {SCORE_AXES.map((a) => <Chip key={a.key} active={metric === a.key} onClick={() => setMetric(a.key)}>{a.label}</Chip>)}
      </ChipRow>

      <ErrorBox error={q.error} onRetry={q.reload} />
      {!q.data ? <Loading rows={4} /> : q.data.length === 0 ? (
        <EmptyState title="조건에 맞는 훈련장이 없습니다" desc="훈련 유형이나 지역을 바꿔 보세요." />
      ) : view === 'map' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="h-[68vh] min-h-[460px] lg:h-[720px]">
            <KoreaMap ranges={q.data} value={value} selectedId={selected} onSelect={setSelected} />
          </div>
          {isDesktop ? (
            <Card className="hidden h-[720px] lg:block">
              {sel ? <RangePanel range={sel} onClose={() => setSelected(null)} /> : (
                <div className="grid h-full place-items-center p-6 text-center text-ink-3">지도에서 훈련장 핀을 눌러 보세요.<br />핀의 숫자는 선택한 지표의 평균 점수입니다.</div>
              )}
            </Card>
          ) : sel && (
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] rounded-t-3xl border-t border-line bg-surface shadow-2xl">
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line" />
              <RangePanel range={sel} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="range-list">
          {q.data.map((r) => {
            const v = value(r);
            return (
              <li key={r.id}>
                <Link href={`/ranges/${r.id}`}>
                  <Card className="flex items-center gap-3 p-4 hover:border-primary">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-lg font-extrabold text-white" style={{ background: scoreColor(v) }}>
                      {v === null ? '–' : fmtScore(v)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold">{r.name} <TrendMark trend={r.trend} delta={r.trendDelta} /></div>
                      <div className="text-sm text-ink-3">{SIDO_SHORT[r.sido]} {r.sigungu} · {RANGE_TYPE_LABEL[r.type]}</div>
                      <div className="text-xs text-ink-3">평가 {r.reviewCount}건{v === null ? ' · 평가 부족' : ''}</div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
