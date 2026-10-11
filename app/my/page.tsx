'use client';
import Link from 'next/link';
import { Card, EmptyState, Loading, PageHeader, SectionTitle } from '@/components/ui';
import { ProposalCard } from '@/components/proposal/ProposalCard';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { TRAINING_TYPE_LABEL } from '@/lib/constants';
import { fmtDate } from '@/lib/format';

/** 내 활동: 내 제안·공감한 제안의 처리 상태, 이수 기록 */
export default function MyPage() {
  const ds = getDataSource();
  const { viewer, ready } = useViewer();
  const mine = useQuery(() => ds.listProposals({ mine: true, sort: 'recent', pageSize: 50 }), [viewer?.id], !!viewer);
  const liked = useQuery(() => ds.listProposals({ empathized: true, sort: 'recent', pageSize: 50 }), [viewer?.id], !!viewer);
  if (!ready) return <Loading />;
  if (!viewer) return <EmptyState title="로그인이 필요합니다" action={<Link href="/login" className="text-primary">로그인</Link>} />;
  return (
    <div className="space-y-8">
      <PageHeader title="내 활동" sub={`${viewer.nickname} · 제안한 내용과 공감한 제안이 어떻게 처리되고 있는지 확인하세요.`} />
      <section>
        <SectionTitle>공감한 제안</SectionTitle>
        {!liked.data ? <Loading rows={2} /> : liked.data.items.length === 0 ? <EmptyState title="공감한 제안이 없습니다" icon="👍" /> : (
          <div className="grid gap-3 md:grid-cols-2" data-testid="my-empathized">{liked.data.items.map((p) => <ProposalCard key={p.id} p={p} showRange />)}</div>
        )}
      </section>
      <section>
        <SectionTitle>내가 쓴 제안</SectionTitle>
        {!mine.data ? <Loading rows={2} /> : mine.data.items.length === 0 ? <EmptyState title="아직 쓴 제안이 없습니다" icon="✍️" /> : (
          <div className="grid gap-3 md:grid-cols-2" data-testid="my-proposals">{mine.data.items.map((p) => <ProposalCard key={p.id} p={p} showRange />)}</div>
        )}
      </section>
      <section>
        <SectionTitle>이수 기록</SectionTitle>
        <Card className="divide-y divide-line">
          {viewer.records.map((r) => (
            <Link key={r.id} href={`/ranges/${r.rangeId}`} className="flex items-center justify-between p-4 hover:bg-surface-2">
              <span className="font-semibold">{r.rangeName}</span>
              <span className="text-sm text-ink-3">{TRAINING_TYPE_LABEL[r.trainingType]} · {fmtDate(r.completedAt)}</span>
            </Link>
          ))}
        </Card>
        <p className="mt-2 text-xs text-ink-3">실제 도입 시 예비군 홈페이지 본인인증·이수 기록과 연동합니다.</p>
      </section>
    </div>
  );
}
