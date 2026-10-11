import { z } from 'zod';
import { createProposal } from '@/lib/core/mutations';
import { listProposals, proposalView } from '@/lib/core/queries';
import { CATEGORIES, STATUSES } from '@/lib/constants';
import { body, context, handle, json, searchParams, write } from '@/lib/server/handler';
import type { ProposalQuery } from '@/lib/types';

export const GET = handle(async (req: Request) => {
  const sp = searchParams(req);
  const q: ProposalQuery = {
    rangeId: sp.get('rangeId') ?? undefined, issueId: sp.get('issueId') ?? undefined,
    status: (sp.get('status') ?? '') as ProposalQuery['status'], category: (sp.get('category') ?? '') as ProposalQuery['category'],
    sort: (sp.get('sort') ?? 'empathy') as ProposalQuery['sort'], page: Number(sp.get('page') ?? 1),
    pageSize: Math.min(100, Number(sp.get('pageSize') ?? 20)), mine: sp.get('mine') === 'true',
    managedOnly: sp.get('managedOnly') === 'true', openOnly: sp.get('openOnly') === 'true',
  };
  if (q.status && !STATUSES.includes(q.status)) q.status = '';
  if (q.category && !CATEGORIES.includes(q.category)) q.category = '';
  return json(listProposals(await context(), q));
});

const Input = z.object({
  rangeId: z.string(), category: z.enum(CATEGORIES as [string, ...string[]]),
  subtopic: z.string().max(30).optional(), title: z.string().min(1).max(50), body: z.string().min(1).max(1000),
});

export const POST = handle(async (req: Request) => {
  const input = await body(req, Input);
  // 클라이언트가 마스킹했더라도 서버에서 차단 검사·마스킹을 다시 적용 (createProposal 내부)
  const { result, ctx } = await write(await context(), (c) => createProposal(c, input as Parameters<typeof createProposal>[1]));
  return json(proposalView(ctx, result), 201);
});
