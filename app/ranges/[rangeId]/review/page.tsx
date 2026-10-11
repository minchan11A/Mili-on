import ranges from '@/data/demo/ranges.json';
import { SurveyForm } from '@/components/survey/SurveyForm';

export function generateStaticParams() {
  return ranges.map((r) => ({ rangeId: r.id }));
}

/** 훈련장 상세의 "평가하기" → 같은 설문, 훈련장만 미리 선택 */
export default async function ReviewPage({ params }: { params: Promise<{ rangeId: string }> }) {
  const { rangeId } = await params;
  return <SurveyForm presetRangeId={rangeId} />;
}
