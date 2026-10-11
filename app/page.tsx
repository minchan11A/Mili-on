'use client';
import Link from 'next/link';
import { BestPracticeCards } from '@/components/proposal/BestPracticeCards';
import { HeroSwitch } from '@/components/home/HeroSwitch';
import { ErrorBox, Eyebrow, Icon, LinkButton, Loading, SectionTitle, Skeleton, Stat, StatRow, TextLink } from '@/components/ui';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';

export default function HomePage() {
  const ds = getDataSource();
  const stats = useQuery(() => ds.getHomeStats(), []);
  const cases = useQuery(() => ds.getBestPractices(6), []);

  return (
    <div className="space-y-16">
      <section className="pt-4 sm:pt-10">
        <Eyebrow>예비군 훈련장 개선 플랫폼</Eyebrow>
        <div className="mt-5"><HeroSwitch /></div>
        <div className="mt-9 flex flex-wrap gap-2">
          <LinkButton href="/survey">훈련 설문 참여하기</LinkButton>
          <LinkButton href="/map" variant="secondary">만족도 지도 보기</LinkButton>
        </div>
      </section>

      <section>
        <ErrorBox error={stats.error} onRetry={stats.reload} />
        {stats.data ? (
          <StatRow className="sm:grid-cols-3" data-testid="home-stats">
            <Stat label="이번 달 제안" value={`${stats.data.proposalsThisMonth}건`} />
            <Stat label="개선 완료" value={`${stats.data.doneCount}건`} />
            <Stat label="평균 처리 기간" value={stats.data.avgProcessingDays === null ? '–' : `${stats.data.avgProcessingDays}일`} />
          </StatRow>
        ) : <Skeleton className="h-24" />}
      </section>

      <section>
        <SectionTitle right={<TextLink href="/trends">개선 동향</TextLink>}>예비군의 목소리로 바뀐 것들</SectionTitle>
        {cases.data ? <BestPracticeCards items={cases.data} /> : <Loading rows={1} />}
      </section>

      <section className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {[
          { href: '/survey', t: '훈련 설문', d: '일정 고지·교통·숙식·기타를 5단계로 평가', icon: 'survey' as const },
          { href: '/proposals', t: '개선 제안', d: '불편을 제안하고 처리 상태를 끝까지 확인', icon: 'pen' as const },
          { href: '/masking-demo', t: '보안 마스킹', d: '부대명은 가리고 좌표는 막는 AI 보안 장치', icon: 'shield' as const },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="group flex items-start gap-3 bg-surface p-5 transition-colors hover:bg-surface-2">
            <Icon name={x.icon} size={20} className="mt-0.5 text-ink-3" />
            <span>
              <span className="block text-[15px] font-medium">{x.t}</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">{x.d}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
