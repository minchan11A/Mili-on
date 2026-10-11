import { listRanges } from '@/lib/core/queries';
import { context, handle, json, searchParams } from '@/lib/server/handler';
import type { RangeFilter } from '@/lib/types';

export const GET = handle(async (req: Request) => {
  const sp = searchParams(req);
  const filter: RangeFilter = {
    trainingType: (sp.get('trainingType') ?? '') as RangeFilter['trainingType'],
    sido: sp.get('sido') ?? undefined, q: sp.get('q') ?? undefined,
    sort: (sp.get('sort') ?? 'overall') as RangeFilter['sort'],
  };
  return json(listRanges(await context(), filter));
});
