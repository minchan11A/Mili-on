import { listIssues } from '@/lib/core/queries';
import { context, handle, json, searchParams } from '@/lib/server/handler';
import type { IssueQuery } from '@/lib/types';

export const GET = handle(async (req: Request) => {
  const sp = searchParams(req);
  return json(listIssues(await context(), {
    category: (sp.get('category') ?? '') as IssueQuery['category'], rangeId: sp.get('rangeId') ?? undefined,
    limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
  }));
});
