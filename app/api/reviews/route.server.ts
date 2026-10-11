import { z } from 'zod';
import { createReview } from '@/lib/core/mutations';
import { listReviews } from '@/lib/core/queries';
import { TRAINING_TYPE_LABEL } from '@/lib/constants';
import { MESSAGE_MAX } from '@/lib/survey';
import { body, context, handle, json, write } from '@/lib/server/handler';
import type { ReviewInput, TrainingType } from '@/lib/types';

const Score = z.number().int().min(1).max(5);
/** 설문(answers) 또는 이전 방식(5개 점수). 이수 기록이 없으면 selfReport로 훈련 정보를 직접 입력 */
const Input = z.object({
  rangeId: z.string(),
  recordId: z.string().optional(),
  selfReport: z.object({
    trainingType: z.enum(Object.keys(TRAINING_TYPE_LABEL) as [TrainingType, ...TrainingType[]]),
    completedAt: z.string().datetime({ offset: true }),
  }).optional(),
  answers: z.record(z.string(), Score).optional(),
  scoreTransport: Score.optional(), scoreMeal: Score.optional(), scoreFacility: Score.optional(), scoreOperation: Score.optional(), scoreComm: Score.optional(),
  comment: z.string().max(MESSAGE_MAX).optional(),
}).refine((v) => v.recordId || v.selfReport, { message: '이수 기록 또는 훈련 정보가 필요합니다' });

export const POST = handle(async (req: Request) => {
  const input = (await body(req, Input)) as ReviewInput;
  const { result, ctx } = await write(await context(), (c) => createReview(c, input));
  return json(listReviews(ctx, result.rangeId).items.find((r) => r.id === result.id), 201);
});
