import { z } from 'zod';
import { report } from '@/lib/core/mutations';
import { body, context, handle, json, write } from '@/lib/server/handler';

const Input = z.object({ targetType: z.enum(['REVIEW', 'PROPOSAL', 'GUIDE', 'ANSWER']), targetId: z.string(), reason: z.string().max(200).default('') });

export const POST = handle(async (req: Request) => {
  const { targetType, targetId, reason } = await body(req, Input);
  const { result } = await write(await context(), (c) => report(c, targetType, targetId, reason));
  return json(result, 201);
});
