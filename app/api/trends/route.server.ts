import { getTrends } from '@/lib/core/queries';
import { context, handle, json, searchParams } from '@/lib/server/handler';

export const GET = handle(async (req: Request) => {
  const m = Number(searchParams(req).get('months') ?? 6);
  return json(getTrends(await context(), { months: ([3, 6, 12].includes(m) ? m : 6) as 3 | 6 | 12 }));
});
