'use client';
import { useState } from 'react';
import { Button, Card, Chip, ChipRow, EmptyState, ErrorBox, Loading, Notice, PageHeader, SectionTitle } from '@/components/ui';
import { CategoryRanking } from '@/components/trends/CategoryRanking';
import { MonthlyTrend } from '@/components/trends/MonthlyTrend';
import { SpikeAlert } from '@/components/trends/SpikeAlert';
import { IssueTable } from '@/components/trends/IssueTable';
import { isManagerRole, useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';

/** 전군 개선 동향 (명세 §6.5). 예비군도 열람 가능, AI 대책은 담당자만 */
export default function TrendsPage() {
  const ds = getDataSource();
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const t = useQuery(() => ds.getTrends({ months }), [months]);
  const issues = useQuery(() => ds.listIssues({}), []);
  const { viewer } = useViewer();
  const [showAll, setShowAll] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader title="전군 개선 동향" sub="모든 훈련장의 제안을 분야별로 모아 봅니다." right={
        <ChipRow>{([3, 6, 12] as const).map((m) => <Chip key={m} active={months === m} onClick={() => setMonths(m)}>최근 {m}개월</Chip>)}</ChipRow>
      } />
      <ErrorBox error={t.error} onRetry={t.reload} />
      {!t.data ? <Loading /> : (
        <>
          <SpikeAlert spikes={t.data.spikes} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <SectionTitle>분야별 제안·공감</SectionTitle>
              {t.data.ranking.length ? <CategoryRanking ranking={t.data.ranking} /> : <EmptyState title="기간 내 제안이 없습니다" />}
            </Card>
            <Card className="p-4">
              <SectionTitle>월별 추이 (상위 4개 분야)</SectionTitle>
              <MonthlyTrend data={t.data} />
            </Card>
          </div>
        </>
      )}
      <section>
        <SectionTitle right={<span className="text-[12px] text-ink-3">우선순위 점수</span>}>개선 이슈</SectionTitle>
        {!isManagerRole(viewer) && <Notice className="mb-3">AI 대책 초안은 훈련장·정책 담당자만 볼 수 있습니다.</Notice>}
        {!issues.data ? <Loading /> : <><IssueTable issues={issues.data} limit={showAll ? undefined : 10} />{!showAll && issues.data.length > 10 && <Button variant="secondary" className="mt-3 w-full" onClick={() => setShowAll(true)}>이슈 {issues.data.length - 10}개 더 보기</Button>}</>}
      </section>
    </div>
  );
}
