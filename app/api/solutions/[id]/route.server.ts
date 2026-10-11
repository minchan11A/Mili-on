import { z } from 'zod';
import { decideSolution } from '@/lib/core/mutations';
import { solutionView } from '@/lib/core/queries';
import { STATUSES } from '@/lib/constants';
import { SolutionSchema } from '@/lib/llm/schema';
import { body, context, handle, json, write, type RouteParams } from '@/lib/server/handler';
import type { AiDecisionInput } from '@/lib/types';

const Input = z.object({
  decision: z.enum(['ADOPTED', 'ADOPTED_EDITED', 'REJECTED']),
  edited: SolutionSchema.optional(),
  bulkStatus: z.enum(STATUSES as [string, ...string[]]).optional(),
  bulkNote: z.string().max(300).optional(),
  replyBody: z.string().max(1000).optional(),
});

export const PATCH = handle(async (req: Request, { params }: RouteParams<{ id: string }>) => {
  const id = (await params).id;
  const d = (await body(req, Input)) as AiDecisionInput;
  const { ctx } = await write(await context(), (c) => decideSolution(c, id, d));
  return json(solutionView(ctx, ctx.ds.solutions.find((s) => s.id === id)!));
});
