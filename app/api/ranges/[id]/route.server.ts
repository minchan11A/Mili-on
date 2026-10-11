import { getRange } from '@/lib/core/queries';
import { context, handle, json, type RouteParams } from '@/lib/server/handler';

export const GET = handle(async (_req: Request, { params }: RouteParams<{ id: string }>) => {
  return json(getRange(await context(), (await params).id));
});
