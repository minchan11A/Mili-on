'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Chip, ChipRow, EmptyState, ErrorBox, LinkButton, Loading, Notice, ScoreBig, SectionTitle, Tabs } from '@/components/ui';
import { RadarScore } from './RadarScore';
import { ScoreBars } from './ScoreBars';
import { ScoreTrend } from './ScoreTrend';
import { ReviewList } from './ReviewList';
import { ProposalCard } from '@/components/proposal/ProposalCard';
import { GuideTab, QnaTab } from '@/components/guide/GuideTab';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { RANGE_TYPE_LABEL, STATUS_LABEL, STATUSES } from '@/lib/constants';
import type { ProposalStatus } from '@/lib/types';

type Tab = 'score' | 'proposals' | 'guide' | 'qna';

function SatisfactionTab({ rangeId }: { rangeId: string }) {
  const ds = getDataSource();
  const r = useQuery(() => ds.getRange(rangeId), [rangeId]);
  const el = useQuery(() => ds.getReviewEligibility(rangeId), [rangeId]);
  const { viewer } = useViewer();
  if (r.error) return <ErrorBox error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Loading />;
  const canReply = (viewer?.role === 'RANGE_MANAGER' && viewer.managedRangeId === rangeId) || viewer?.role === 'POLICY_ADMIN';
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <ScoreBig score={r.data.overall} trend={r.data.trend} delta={r.data.trendDelta} count={r.data.reviewCount} />
          <RadarScore scores={r.data.scores} />
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-bold">지표별 점수</h3>
          <ScoreBars scores={r.data.scores} />
          <h3 className="mb-1 mt-5 font-bold">월별 종합점수</h3>
          <ScoreTrend monthly={r.data.monthly} />
        </Card>
      </div>
      <div>
        <SectionTitle right={
          el.data?.eligible
            ? <LinkButton href={`/ranges/${rangeId}/review`}>⭐ 평가하기</LinkButton>
            : <div className="text-right"><Button disabled data-testid="review-disabled">⭐ 평가하기</Button>{el.data?.reason && <p className="mt-1 text-xs text-ink-3">{el.data.reason}</p>}</div>
        }>평가 목록</SectionTitle>
        <ReviewList rangeId={rangeId} canReply={canReply} />
      </div>
    </div>
  );
}

function ProposalsTab({ rangeId }: { rangeId: string }) {
  const [status, setStatus] = useState<ProposalStatus | ''>('');
  const [sort, setSort] = useState<'empathy' | 'recent'>('empathy');
  const [page, setPage] = useState(1);
  const q = useQuery(() => getDataSource().listProposals({ rangeId, status, sort, page, pageSize: 12 }), [rangeId, status, sort, page]);
  const { viewer } = useViewer();
  const pages = q.data ? Math.ceil(q.data.total / q.data.pageSize) : 1;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipRow>
          <Chip active={status === ''} onClick={() => { setStatus(''); setPage(1); }}>전체</Chip>
          {STATUSES.map((s) => <Chip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>{s === 'PLANNED' ? '조치 계획' : s === 'LONG_TERM' ? '장기 검토' : s === 'DONE' ? '완료' : STATUS_LABEL[s]}</Chip>)}
        </ChipRow>
        <div className="flex items-center gap-2">
          <select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as 'empathy' | 'recent')} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-sm">
            <option value="empathy">공감순</option>
            <option value="recent">최신순</option>
          </select>
          {(!viewer || viewer.role === 'RESERVIST') && <LinkButton href={`/ranges/${rangeId}/propose`}>✍️ 개선 제안</LinkButton>}
        </div>
      </div>
      {q.error && <ErrorBox error={q.error} onRetry={q.reload} />}
      {!q.data ? <Loading /> : q.data.items.length === 0 ? <EmptyState title="해당하는 제안이 없습니다" desc="첫 제안을 남겨 보세요." icon="✍️" /> : (
        <>
          <div className="grid gap-3 md:grid-cols-2">{q.data.items.map((p) => <ProposalCard key={p.id} p={p} />)}</div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</Button>
              <span className="text-sm text-ink-2">{page} / {pages}</span>
              <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>다음</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function RangeDetailView({ rangeId }: { rangeId: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (sp.get('tab') as Tab) || 'score';
  const r = useQuery(() => getDataSource().getRange(rangeId), [rangeId]);
  // 최근 본 훈련장 기록 (가이드 진입 화면용, 이 기기에만 저장)
  useEffect(() => {
    if (!r.data) return;
    try {
      const prev = JSON.parse(window.localStorage.getItem('milaind-recent-ranges') ?? '[]') as string[];
      window.localStorage.setItem('milaind-recent-ranges', JSON.stringify([rangeId, ...prev.filter((x) => x !== rangeId)].slice(0, 6)));
    } catch { /* 무시 */ }
  }, [r.data, rangeId]);
  const setTab = (t: Tab) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  if (r.error) return <EmptyState title="훈련장을 찾을 수 없습니다" action={<Link href="/map" className="text-primary">지도로 돌아가기</Link>} />;
  return (
    <div>
      <div className="mb-4">
        <Link href="/map" className="text-sm text-ink-3">← 만족도 지도</Link>
        {r.data ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold" data-testid="range-title">{r.data.name}</h1>
            <Badge tone="olive">{RANGE_TYPE_LABEL[r.data.type]}</Badge>
            <span className="text-sm text-ink-3">{r.data.sido} {r.data.sigungu}</span>
          </div>
        ) : <div className="skeleton mt-1 h-8 w-48" />}
        {r.data?.description && <p className="mt-1 text-sm text-ink-3">{r.data.description}</p>}
      </div>
      <Tabs<Tab>
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[{ value: 'score', label: '만족도' }, { value: 'proposals', label: '개선 제안' }, { value: 'guide', label: '가이드' }, { value: 'qna', label: 'Q&A' }]}
      />
      {tab === 'score' && <SatisfactionTab rangeId={rangeId} />}
      {tab === 'proposals' && <ProposalsTab rangeId={rangeId} />}
      {tab === 'guide' && <GuideTab rangeId={rangeId} />}
      {tab === 'qna' && <QnaTab rangeId={rangeId} />}
      {tab === 'score' && r.data && r.data.reviewCount < 5 && <Notice className="mt-4">평가가 5건 미만이라 점수 대신 "평가 부족"으로 표시합니다.</Notice>}
    </div>
  );
}
