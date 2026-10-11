import { listGuide } from '@/lib/core/queries';
import { context, handle, json, type RouteParams } from '@/lib/server/handler';

export const GET = handle(async (_req: Request, { params }: RouteParams<{ id: string }>) => {
  return json(listGuide(await context(), (await params).id));
});
