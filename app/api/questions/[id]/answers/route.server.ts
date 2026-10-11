import { z } from 'zod';
import { answerQuestion } from '@/lib/core/mutations';
import { body, context, handle, json, write, type RouteParams } from '@/lib/server/handler';

const Input = z.object({ body: z.string().min(1).max(500) });

export const POST = handle(async (req: Request, { params }: RouteParams<{ id: string }>) => {
  const id = (await params).id;
  const { body: text } = await body(req, Input);
  await write(await context(), (c) => answerQuestion(c, id, text));
  return json({ ok: true }, 201);
});
