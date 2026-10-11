'use client';
import Link from 'next/link';
import { BestPracticeCards } from '@/components/proposal/BestPracticeCards';
import { Card, ErrorBox, LinkButton, Loading, SectionTitle, Skeleton, Stat } from '@/components/ui';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';

export default function HomePage() {
  const ds = getDataSource();
  const stats = useQuery(() => ds.getHomeStats(), []);
  const cases = useQuery(() => ds.getBestPractices(6), []);
  const { viewer } = useViewer();
  const myRange = viewer?.records[0];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-primary px-5 py-7 text-white sm:px-8 sm:py-10">
        <p className="text-sm font-semibold text-white/80">예비군 훈련장 개선 플랫폼</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-4xl">제보하면 바뀝니다.</h1>
        <p className="mt-2 max-w-xl text-white/90">훈련장 만족도를 남기고 개선을 제안하면, 담당자가 처리 과정을 공개하고 결과를 알려드립니다.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <LinkButton href="/map" variant="secondary" className="!border-0">🗺️ 내 훈련장 찾기</LinkButton>
          <LinkButton href={myRange ? `/ranges/${myRange.rangeId}?tab=guide` : '/guide'} variant="secondary" className="!border-0 !bg-white/15 !text-white hover:!bg-white/25">🎒 훈련 전 준비물 보기</LinkButton>
        </div>
      </section>

      <section>
        <ErrorBox error={stats.error} onRetry={stats.reload} />
        <div className="grid grid-cols-3 gap-2 sm:gap-3" data-testid="home-stats">
          {stats.data ? (
            <>
              <Stat label="이번 달 제안" value={`${stats.data.proposalsThisMonth}건`} />
              <Stat label="개선 완료" value={`${stats.data.doneCount}건`} />
              <Stat label="평균 처리 기간" value={stats.data.avgProcessingDays === null ? '–' : `${stats.data.avgProcessingDays}일`} />
            </>
          ) : [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </section>

      <section>
        <SectionTitle right={<Link href="/trends" className="text-sm font-semibold text-primary">개선 동향 보기 →</Link>}>예비군 제안으로 바뀐 것들</SectionTitle>
        {cases.data ? <BestPracticeCards items={cases.data} /> : <Loading rows={1} />}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { href: '/map', t: '만족도 지도', d: '훈련장별 교통·식사·시설·운영·안내 점수와 추세' },
          { href: '/proposals', t: '개선 제안', d: '불편을 제안하고 처리 상태를 끝까지 확인' },
          { href: '/masking-demo', t: '보안 마스킹', d: '부대명·좌표는 가리고 막는 AI 보안 장치 체험' },
        ].map((x) => (
          <Link key={x.href} href={x.href}>
            <Card className="h-full p-4 transition-colors hover:border-primary">
              <div className="font-bold">{x.t}</div>
              <div className="mt-1 text-sm text-ink-2">{x.d}</div>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
