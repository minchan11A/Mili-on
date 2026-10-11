import { listReviews } from '@/lib/core/queries';
import { context, handle, json, searchParams, type RouteParams } from '@/lib/server/handler';

export const GET = handle(async (req: Request, { params }: RouteParams<{ id: string }>) => {
  return json(listReviews(await context(), (await params).id, Number(searchParams(req).get('page') ?? 1)));
});
