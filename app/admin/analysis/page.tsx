'use client';
import { useState, type ReactNode } from 'react';
import { AdminGuard } from '@/components/layout/AdminGuard';
import { AdminNav } from '@/components/layout/AdminNav';
import { Card, Chip, ChipRow, EmptyState, ErrorBox, Loading, PageHeader, SectionTitle } from '@/components/ui';
import { CategoryBreakdown, RangeLink, RangeMatrix, StatusLegend, SubtopicList } from '@/components/admin/AnalysisCharts';
import { MonthlyTrend } from '@/components/trends/MonthlyTrend';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { CATEGORIES } from '@/lib/constants';
import { cx, fmtDate } from '@/lib/format';
import type { AnalysisPeriod } from '@/lib/types';

function Kpi({ label, value, sub, danger, wide }: { label: string; value: ReactNode; sub: ReactNode; danger?: boolean; wide?: boolean }) {
  return (
    <div className={cx('bg-surface px-4 py-3 sm:px-5 sm:py-4', wide && 'col-span-2 sm:col-span-1')}>
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className={cx('mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight sm:mt-1 sm:text-[26px]', danger && 'text-danger')}>{value}</div>
      <div className="text-[11px] text-ink-3 sm:text-[12px]">{sub}</div>
    </div>
  );
}

const PERIODS: Array<[AnalysisPeriod, string]> = [[30, '최근 30일'], [90, '최근 3개월'], [180, '최근 6개월'], [365, '최근 1년']];

function Analysis() {
  const [days, setDays] = useState<AnalysisPeriod>(90);
  const [rangeId, setRangeId] = useState('');
  const q = useQuery(() => getDataSource().getProposalAnalysis({ days, rangeId: rangeId || undefined }), [days, rangeId]);
  const d = q.data;

  const scopePicker = d?.scope.canChange ? (
    <select
      aria-label="분석 범위" data-testid="analysis-scope"
      className="h-10 rounded-full border border-line bg-surface pl-4 pr-3 text-[14px] outline-none focus:border-ink"
      value={rangeId} onChange={(e) => setRangeId(e.target.value)}
    >
      <option value="">전체 훈련장</option>
      {d.ranges.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  ) : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="제안 분석"
        sub={d ? `${d.scope.label} · ${fmtDate(d.from)} ~ ${fmtDate(d.to)}에 접수된 개선 제안을 분야별로 봅니다.` : '개선 제안을 분야별로 봅니다.'}
        right={scopePicker}
      />
      <ChipRow>
        {PERIODS.map(([v, label]) => <Chip key={v} active={days === v} onClick={() => setDays(v)}>{label}</Chip>)}
      </ChipRow>

      <ErrorBox error={q.error} onRetry={q.reload} />
      {!d ? <Loading rows={4} /> : (
        <>
          <div data-testid="analysis-kpi" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-5">
            <Kpi label="접수된 제안" value={`${d.kpi.total}건`} sub={<>이전 {d.kpi.prevTotal}건 {d.kpi.total !== d.kpi.prevTotal && <span className={d.kpi.total > d.kpi.prevTotal ? 'text-danger' : 'text-st-done'}>{d.kpi.total > d.kpi.prevTotal ? '+' : ''}{d.kpi.total - d.kpi.prevTotal}</span>}</>} />
            <Kpi label="공감 합계" value={d.kpi.empathies} sub="이 기간 제안" />
            <Kpi label="조치율" value={d.kpi.resolvedRate === null ? '–' : `${Math.round(d.kpi.resolvedRate * 100)}%`} sub="계획 수립 + 완료" />
            <Kpi label="평균 처리 기간" value={d.kpi.avgDays === null ? '–' : `${d.kpi.avgDays}일`} sub="접수 → 완료" />
            <Kpi label="7일 이상 미처리" value={`${d.kpi.overdue}건`} danger={d.kpi.overdue > 0} sub="현재 접수 상태" wide />
          </div>

          {d.kpi.total === 0 && d.categories.length === 0 ? (
            <EmptyState title="이 기간에 접수된 제안이 없습니다" desc="기간을 늘려 보세요." />
          ) : (
            <>
              <section>
                <SectionTitle className="mb-2">분야별 제안</SectionTitle>
                <div className="mb-3"><StatusLegend /></div>
                <Card className="px-4 py-1 sm:px-5 sm:py-2"><CategoryBreakdown rows={d.categories} /></Card>
                <p className="mt-2 text-[12px] text-ink-3">막대 색은 분야를 나타내며 순위가 바뀌어도 같습니다. ▲는 이전 같은 기간보다 늘어난 건수입니다.</p>
              </section>

              <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.4fr_1fr]">
                <section>
                  <SectionTitle>분야별 월별 추이 <span className="text-[13px] font-normal text-ink-3">최근 6개월</span></SectionTitle>
                  <Card className="p-3 sm:p-4"><MonthlyTrend data={d} className="h-52 sm:h-72" /></Card>
                </section>
                <section>
                  <SectionTitle>많이 나온 세부 주제</SectionTitle>
                  <Card className="p-4 sm:p-5">
                    {d.subtopics.length ? <SubtopicList rows={d.subtopics} /> : <p className="text-[14px] text-ink-3">세부 주제가 없습니다.</p>}
                  </Card>
                </section>
              </div>

              {d.rangeMatrix && (
                <section>
                  <SectionTitle className="mb-2">훈련장별 분야 분포</SectionTitle>
                  <p className="mb-3 text-[12px] text-ink-3">행을 누르면 그 훈련장 분석으로 바뀝니다. 색이 진할수록 제안이 많습니다.</p>
                  <RangeMatrix rows={d.rangeMatrix} categories={CATEGORIES} onPick={(id) => { setRangeId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                </section>
              )}

              {d.scope.rangeId && (
                <p className={cx('text-[13px] text-ink-3')}>
                  {d.scope.canChange && <button type="button" className="mr-3 text-ink-2 underline-offset-4 hover:underline" onClick={() => setRangeId('')}>← 전체 훈련장으로</button>}
                  <RangeLink id={d.scope.rangeId}>{d.scope.label} 상세 보기 →</RangeLink>
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return <AdminGuard><AdminNav /><Analysis /></AdminGuard>;
}
