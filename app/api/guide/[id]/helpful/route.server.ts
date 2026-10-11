import { markHelpful } from '@/lib/core/mutations';
import { context, handle, json, write, type RouteParams } from '@/lib/server/handler';

export const POST = handle(async (_req: Request, { params }: RouteParams<{ id: string }>) => {
  const id = (await params).id;
  await write(await context(), (c) => markHelpful(c, id));
  return json({ ok: true });
});
