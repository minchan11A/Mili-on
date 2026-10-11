import { toggleEmpathy } from '@/lib/core/mutations';
import { context, handle, json, write, type RouteParams } from '@/lib/server/handler';

export const POST = handle(async (_req: Request, { params }: RouteParams<{ id: string }>) => {
  const id = (await params).id;
  const { result } = await write(await context(), (c) => toggleEmpathy(c, id));
  return json(result);
});
