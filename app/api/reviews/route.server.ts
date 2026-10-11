import { z } from 'zod';
import { createReview } from '@/lib/core/mutations';
import { listReviews } from '@/lib/core/queries';
import { body, context, handle, json, write } from '@/lib/server/handler';

const Score = z.number().int().min(1).max(5);
const Input = z.object({
  rangeId: z.string(), recordId: z.string(),
  scoreTransport: Score, scoreMeal: Score, scoreFacility: Score, scoreOperation: Score, scoreComm: Score,
  comment: z.string().max(300).optional(),
});

export const POST = handle(async (req: Request) => {
  const input = await body(req, Input);
  const { result, ctx } = await write(await context(), (c) => createReview(c, input));
  return json(listReviews(ctx, result.rangeId).items.find((r) => r.id === result.id), 201);
});
