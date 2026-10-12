'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, EmptyState, inputCls, Loading, PageHeader, SectionTitle } from '@/components/ui';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { useLocalState, useQuery } from '@/lib/hooks';
import { RANGE_TYPE_LABEL } from '@/lib/constants';
import type { RangeSummary } from '@/lib/types';

function RangeRow({ r }: { r: RangeSummary }) {
  return (
    <Link href={`/ranges/${r.id}?tab=guide`} className="flex items-center justify-between gap-2 p-4 hover:bg-surface-2">
      <span><b>{r.name}</b> <span className="text-sm text-ink-3">{r.sido} {r.sigungu}</span></span>
      <span className="text-xs text-ink-3">{RANGE_TYPE_LABEL[r.type]} →</span>
    </Link>
  );
}

/** 훈련장 가이드 진입: 검색 + 최근 본 훈련장 (명세 §6.6) */
export default function GuideEntryPage() {
  const q = useQuery(() => getDataSource().listRanges({}), []);
  const [text, setText] = useState('');
  const [recent] = useLocalState<string[]>('milind-recent-ranges', []);
  const { viewer } = useViewer();
  const list = useMemo(() => (q.data ?? []).filter((r) => !text || `${r.name}${r.sido}${r.sigungu}`.includes(text.trim())).sort((a, b) => a.name.localeCompare(b.name)), [q.data, text]);
  const recentRanges = recent.map((id) => q.data?.find((r) => r.id === id)).filter((r): r is RangeSummary => !!r);
  const mine = viewer?.role === 'RESERVIST' ? [...new Set(viewer.records.map((r) => r.rangeId))].map((id) => q.data?.find((r) => r.id === id)).filter((r): r is RangeSummary => !!r) : [];
  return (
    <div className="space-y-6">
      <PageHeader title="훈련장 가이드" sub="준비물, 교통편, 식사, 입소 절차를 훈련장별로 확인하세요. 공식 안내와 먼저 다녀온 예비군의 현장 팁이 있습니다." />
      <input className={inputCls} placeholder="훈련장 이름이나 지역 검색 (예: A훈련장, 가평)" value={text} onChange={(e) => setText(e.target.value)} aria-label="훈련장 검색" />
      {!q.data ? <Loading /> : (
        <>
          {!text && mine.length > 0 && <section><SectionTitle>내 이수 훈련장</SectionTitle><Card className="divide-y divide-line">{mine.map((r) => <RangeRow key={r.id} r={r} />)}</Card></section>}
          {!text && recentRanges.length > 0 && <section><SectionTitle>최근 본 훈련장</SectionTitle><Card className="divide-y divide-line">{recentRanges.map((r) => <RangeRow key={r.id} r={r} />)}</Card></section>}
          <section>
            <SectionTitle>{text ? '검색 결과' : '전체 훈련장'}</SectionTitle>
            {list.length === 0 ? <EmptyState title="검색 결과가 없습니다" /> : <Card className="divide-y divide-line">{list.map((r) => <RangeRow key={r.id} r={r} />)}</Card>}
          </section>
        </>
      )}
    </div>
  );
}
