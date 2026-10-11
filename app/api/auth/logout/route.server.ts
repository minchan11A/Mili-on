import { cookies } from 'next/headers';
import { handle, json } from '@/lib/server/handler';
import { SESSION_COOKIE } from '@/lib/server/session';

export const POST = handle(async () => {
  (await cookies()).delete(SESSION_COOKIE);
  return json({ ok: true });
});
