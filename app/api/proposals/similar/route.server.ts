import { z } from 'zod';
import { similarProposals } from '@/lib/core/queries';
import { CATEGORIES } from '@/lib/constants';
import { body, context, handle, json } from '@/lib/server/handler';
import type { Category } from '@/lib/types';

const Input = z.object({ rangeId: z.string(), text: z.string().max(1100), category: z.enum(CATEGORIES as [string, ...string[]]).optional() });

export const POST = handle(async (req: Request) => {
  const { rangeId, text, category } = await body(req, Input);
  return json(similarProposals(await context(), rangeId, text, category as Category | undefined));
});
