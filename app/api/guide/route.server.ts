import { z } from 'zod';
import { createGuideEntry } from '@/lib/core/mutations';
import { listGuide } from '@/lib/core/queries';
import { body, context, handle, json, write } from '@/lib/server/handler';

const Input = z.object({ rangeId: z.string(), section: z.enum(['CHECKLIST', 'TRANSPORT', 'MEAL', 'ENTRY', 'ETC']), body: z.string().min(1).max(500) });

export const POST = handle(async (req: Request) => {
  const input = await body(req, Input);
  const { result, ctx } = await write(await context(), (c) => createGuideEntry(c, input));
  return json(listGuide(ctx, input.rangeId).find((g) => g.id === result.id), 201);
});
