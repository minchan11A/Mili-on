import { cookies } from 'next/headers';
import { z } from 'zod';
import { buildViewer } from '@/lib/core/queries';
import { ValidationError } from '@/lib/core/queries';
import { prisma } from '@/lib/server/db';
import { loadDataset } from '@/lib/server/dataset';
import { body, handle, json } from '@/lib/server/handler';
import { verifyPassword } from '@/lib/server/password';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/server/session';

const Input = z.object({ loginId: z.string().min(1).max(64), password: z.string().min(1).max(128) });

export const POST = handle(async (req: Request) => {
  const { loginId, password } = await body(req, Input);
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !verifyPassword(password, user.passwordHash)) throw new ValidationError('아이디 또는 비밀번호가 올바르지 않습니다');
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(user.id, user.role), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_MAX_AGE,
  });
  return json(buildViewer(await loadDataset(), user.id));
});
