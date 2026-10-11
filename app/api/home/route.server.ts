import { getHomeStats } from '@/lib/core/queries';
import { context, handle, json } from '@/lib/server/handler';

export const GET = handle(async () => json(getHomeStats(await context())));
