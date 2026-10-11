'use client';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { SCORE_AXES } from '@/lib/constants';
import type { ScoreSet } from '@/lib/types';

/** 5개 지표 방사형 그래프 */
export function RadarScore({ scores, height = 220 }: { scores: ScoreSet; height?: number }) {
  const data = SCORE_AXES.map((a) => ({ axis: a.label, score: scores[a.key] ?? 0 }));
  const empty = SCORE_AXES.every((a) => scores[a.key] === null);
  if (empty) return <div className="grid h-40 place-items-center rounded-xl bg-surface-2 text-sm text-ink-3">평가가 5건 미만이라 점수를 표시하지 않습니다</div>;
  return (
    <div style={{ height }} data-testid="radar-score" role="img" aria-label={SCORE_AXES.map((a) => `${a.label} ${scores[a.key] ?? '-'}점`).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#d7dccd" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: '#545c4e' }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
          <Radar dataKey="score" stroke="var(--c-primary)" fill="var(--c-primary)" fillOpacity={0.35} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
