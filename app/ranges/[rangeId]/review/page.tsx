import ranges from '@/data/demo/ranges.json';
import { ReviewForm } from '@/components/range/ReviewForm';

export function generateStaticParams() {
  return ranges.map((r) => ({ rangeId: r.id }));
}

export default async function ReviewPage({ params }: { params: Promise<{ rangeId: string }> }) {
  const { rangeId } = await params;
  return <ReviewForm rangeId={rangeId} />;
}
