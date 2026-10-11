import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { AppError, buildViewer } from '@/lib/core/queries';
import { prisma } from '@/lib/server/db';
import { loadDataset } from '@/lib/server/dataset';
import { body, handle, json, newServerId } from '@/lib/server/handler';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/server/session';
import { storableOrThrow } from '@/lib/server/text';

const AGE_BANDS = ['20대 초반', '20대 후반', '30대 초반', '30대 후반', '40대 이상'] as const;
const Input = z.object({
  accessToken: z.string().min(20),
  nickname: z.string().trim().min(2).max(20).optional(),
  ageBand: z.enum(AGE_BANDS).optional(),
});

/**
 * Supabase 로그인 → 앱 세션.
 * 브라우저가 받은 Supabase 액세스 토큰을 Supabase에 직접 확인(getUser)한 뒤,
 * 처음 오는 사용자는 예비군 계정을 만들고 httpOnly 서명 쿠키를 발급합니다.
 * 역할(담당자·정책 담당자)은 가입으로 얻을 수 없고 DB에서만 부여합니다.
 */
export const POST = handle(async (req: Request) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new AppError('Supabase가 설정되지 않았습니다', 503, 'SUPABASE_DISABLED');
  const input = await body(req, Input);
  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(input.accessToken);
  if (error || !data.user) throw new AppError('로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요', 401, 'UNAUTHORIZED');
  const au = data.user;

  let user = await prisma.user.findUnique({ where: { authId: au.id } });
  if (!user) {
    const meta = (au.user_metadata ?? {}) as { nickname?: string; ageBand?: string };
    const rawNick = input.nickname ?? meta.nickname ?? `예비군_${String(Math.floor(1000 + Math.random() * 9000))}`;
    const ageBand = input.ageBand ?? (AGE_BANDS as readonly string[]).find((a) => a === meta.ageBand) ?? null;
    user = await prisma.user.create({
      data: {
        id: newServerId('usr'), role: 'RESERVIST', nickname: storableOrThrow(rawNick, '별명'), ageBand,
        loginId: `sb_${au.id}`, authId: au.id, email: au.email ?? null,
      },
    });
  }
  (await cookies()).set(SESSION_COOKIE, await signSession(user.id, user.role), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_MAX_AGE,
  });
  return json(buildViewer(await loadDataset(), user.id));
});
