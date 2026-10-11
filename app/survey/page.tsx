'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Loading } from '@/components/ui';
import { SurveyForm } from '@/components/survey/SurveyForm';

function Inner() {
  return <SurveyForm presetRangeId={useSearchParams().get('range') ?? undefined} />;
}

/** 훈련 만족도 설문 (?range= 로 훈련장 지정 가능) */
export default function SurveyPage() {
  return <Suspense fallback={<Loading />}><Inner /></Suspense>;
}
