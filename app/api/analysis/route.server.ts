import { getProposalAnalysis } from '@/lib/core/queries';
import { context, handle, json, searchParams } from '@/lib/server/handler';
import type { AnalysisPeriod } from '@/lib/types';

export const GET = handle(async (req: Request) => {
  const sp = searchParams(req);
  return json(getProposalAnalysis(await context(), {
    rangeId: sp.get('rangeId') || undefined,
    days: Number(sp.get('days') ?? 90) as AnalysisPeriod,
  }));
});
