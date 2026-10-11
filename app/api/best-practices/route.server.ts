import { getBestPractices } from '@/lib/core/queries';
import { context, handle, json, searchParams } from '@/lib/server/handler';

export const GET = handle(async (req: Request) => json(getBestPractices(await context(), Number(searchParams(req).get('limit') ?? 6))));
