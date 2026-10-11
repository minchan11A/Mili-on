'use client';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORIES, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/constants';
import { fmtMonth } from '@/lib/format';
import type { TrendData } from '@/lib/types';

/** 카테고리별 월별 추이: 상위 4개는 고정 색, 나머지는 "기타 분야" 회색 하나로 합침 */
export function MonthlyTrend({ data }: { data: Pick<TrendData, 'monthly' | 'topCategories'> }) {
  const top = data.topCategories;
  const rows = data.monthly.map((m) => {
    const row: Record<string, number | string> = { label: fmtMonth(m.month) };
    for (const c of top) row[c] = m[c] ?? 0;
    row.REST = CATEGORIES.filter((c) => !top.includes(c)).reduce((s, c) => s + (m[c] ?? 0), 0);
    return row;
  });
  return (
    <div className="h-72" data-testid="monthly-trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#e6e9e0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7d8475' }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7d8475' }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v, name) => [`${v}건`, name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="REST" name="기타 분야" stroke="#c4c9bd" strokeWidth={2} dot={false} isAnimationActive={false} />
          {top.map((c) => (
            <Line key={c} dataKey={c} name={CATEGORY_LABEL[c]} stroke={CATEGORY_COLOR[c]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
