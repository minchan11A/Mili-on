import { z } from 'zod';
import { postOfficialReply } from '@/lib/core/mutations';
import { body, context, handle, json, write } from '@/lib/server/handler';

const Input = z.object({ target: z.object({ type: z.enum(['REVIEW', 'PROPOSAL']), id: z.string() }), body: z.string().min(1).max(1000) });

export const POST = handle(async (req: Request) => {
  const { target, body: text } = await body(req, Input);
  await write(await context(), (c) => postOfficialReply(c, target, text));
  return json({ ok: true }, 201);
});
