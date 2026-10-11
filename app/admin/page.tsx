'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AdminGuard } from '@/components/layout/AdminGuard';
import { AdminNav } from '@/components/layout/AdminNav';
import { useToast } from '@/components/layout/Toast';
import { Button, Card, ErrorBox, Loading, Modal, PageHeader, SectionTitle, Stat, TrendMark } from '@/components/ui';
import { IssueTable } from '@/components/trends/IssueTable';
import { SpikeAlert } from '@/components/trends/SpikeAlert';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { IS_DEMO } from '@/lib/config';
import { fmtScore } from '@/lib/format';
import { trendOf } from '@/lib/analysis/stats';

function ResetDemo() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  if (!IS_DEMO) return null;
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} data-testid="reset-demo">↺ 시연 데이터 초기화</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="시연 데이터 초기화">
        <p className="text-sm text-ink-2">시연 중 만든 평가·제안·공감·상태 변경·AI 결정을 모두 지우고 원래 예시 데이터로 되돌립니다. 리허설과 본 시연 사이에 반드시 누르세요.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={async () => { await getDataSource().resetDemo?.(); setOpen(false); toast('시연 데이터를 초기화했습니다'); }}>초기화</Button>
        </div>
      </Modal>
    </>
  );
}

function Dashboard() {
  const q = useQuery(() => getDataSource().getDashboard(), []);
  if (q.error) return <ErrorBox error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading rows={4} />;
  const d = q.data;
  return (
    <div className="space-y-6">
      <PageHeader title="대시보드" sub={`범위: ${d.scopeLabel}`} right={<ResetDemo />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="kpi">
        <Stat label="미처리 제안" value={`${d.kpi.open}건`} sub="접수·검토 중" />
        <Stat label="7일 이상 미처리" value={`${d.kpi.overdue}건`} tone={d.kpi.overdue > 0 ? 'danger' : undefined} sub="접수 상태로 7일 경과" />
        <Stat label="이번 달 완료" value={`${d.kpi.doneThisMonth}건`} />
        <Stat label="평균 처리 기간" value={d.kpi.avgDays === null ? '–' : `${d.kpi.avgDays}일`} sub="접수 → 개선 완료" />
      </div>
      <SpikeAlert spikes={d.spikes} />
      <section>
        <SectionTitle right={<Link href="/trends" className="text-sm font-semibold text-primary">전체 동향 →</Link>}>우선순위 상위 이슈</SectionTitle>
        <IssueTable issues={d.topIssues} />
        <p className="mt-2 text-xs text-ink-3">우선순위 = log2(1 + 제안 수 + 공감 수) × 평균 불만 강도(1~3) × 안전 관련 1.5 × 최근성(최근 30일 비율 50% 이상이면 1.2). 점수 옆 ⓘ에 계산 근거가 있습니다.</p>
      </section>
      {d.rangeTable && (
        <section>
          <SectionTitle>훈련장별 만족도</SectionTitle>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="range-table">
              <thead className="bg-surface-2 text-left text-ink-2">
                <tr><th className="px-4 py-2">훈련장</th><th className="px-2 py-2">지역</th><th className="px-2 py-2 text-right">종합</th><th className="px-2 py-2 text-right">3개월 변화</th><th className="px-2 py-2 text-right">평가 수</th><th className="px-4 py-2 text-right">처리 중 제안</th></tr>
              </thead>
              <tbody>
                {d.rangeTable.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-4 py-2 font-semibold"><Link href={`/ranges/${r.id}`} className="hover:text-primary">{r.name}</Link></td>
                    <td className="px-2 py-2 text-ink-2">{r.sido}</td>
                    <td className="px-2 py-2 text-right font-bold tabular-nums">{r.overall === null ? '평가 부족' : fmtScore(r.overall)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.delta === null ? '–' : <><TrendMark trend={trendOf(r.delta)} /> {r.delta > 0 ? '+' : ''}{r.delta.toFixed(2)}</>}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.reviewCount}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-2 text-xs text-ink-3">순위 번호는 붙이지 않습니다. 훈련장 이름순입니다.</p>
        </section>
      )}
    </div>
  );
}

export default function AdminPage() {
  return <AdminGuard><AdminNav /><Dashboard /></AdminGuard>;
}
