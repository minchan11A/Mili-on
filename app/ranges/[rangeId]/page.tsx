import { Suspense } from 'react';
import ranges from '@/data/demo/ranges.json';
import { RangeDetailView } from '@/components/range/RangeDetailView';
import { Loading } from '@/components/ui';

/** 정적 빌드: 모든 훈련장 id를 미리 생성 (명세 §6.2) */
export function generateStaticParams() {
  return ranges.map((r) => ({ rangeId: r.id }));
}

export default async function RangePage({ params }: { params: Promise<{ rangeId: string }> }) {
  const { rangeId } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <RangeDetailView rangeId={rangeId} />
    </Suspense>
  );
}
