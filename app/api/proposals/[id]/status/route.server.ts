import { z } from 'zod';
import { updateProposalStatus } from '@/lib/core/mutations';
import { getProposal } from '@/lib/core/queries';
import { STATUSES } from '@/lib/constants';
import { body, context, handle, json, write, type RouteParams } from '@/lib/server/handler';
import type { ProposalStatus } from '@/lib/types';

const Input = z.object({ to: z.enum(STATUSES as [string, ...string[]]), note: z.string().max(300).optional() });

export const PATCH = handle(async (req: Request, { params }: RouteParams<{ id: string }>) => {
  const id = (await params).id;
  const { to, note } = await body(req, Input);
  const { ctx } = await write(await context(), (c) => updateProposalStatus(c, id, to as ProposalStatus, note));
  return json(getProposal(ctx, id));
});
