'use client';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtMonth } from '@/lib/format';

/** 월별 종합점수 추이 */
export function ScoreTrend({ monthly }: { monthly: Array<{ month: string; overall: number | null; count: number }> }) {
  const data = monthly.map((m) => ({ ...m, label: fmtMonth(m.month) }));
  return (
    <div className="h-52" data-testid="score-trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="#e6e9e0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7d8475' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#7d8475' }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [typeof v === 'number' ? v.toFixed(1) : '-', '종합']} labelFormatter={(l) => `${l}`} />
          <Line type="monotone" dataKey="overall" stroke="var(--c-primary)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
