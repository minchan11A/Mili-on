import { listMaskingAudit } from '@/lib/core/queries';
import { context, handle, json, searchParams } from '@/lib/server/handler';

export const GET = handle(async (req: Request) => {
  const sp = searchParams(req);
  return json(listMaskingAudit(await context(), Number(sp.get('page') ?? 1), sp.get('blocked') === '1'));
});
