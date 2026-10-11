'use client';
/**
 * Supabase Auth (브라우저). 이메일·비밀번호 로그인/가입만 씁니다.
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY가 있을 때만 켜지고,
 * SDK는 동적으로 불러와 오프라인 시연 빌드에는 들어가지 않습니다.
 * 로그인 후에는 액세스 토큰을 /api/auth/supabase로 보내 서버가 확인한 뒤 앱 세션 쿠키를 발급합니다.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { IS_DEMO } from '../config';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_ENABLED = !IS_DEMO && !!URL && !!ANON;

let client: SupabaseClient | null = null;
export async function getSupabase(): Promise<SupabaseClient> {
  if (!SUPABASE_ENABLED) throw new Error('Supabase가 설정되지 않았습니다');
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(URL!, ANON!, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

/** Supabase 오류 메시지를 한국어로 */
export function authErrorMessage(e: unknown): string {
  const m = (e as { message?: string })?.message ?? '';
  if (/invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 올바르지 않습니다';
  if (/email not confirmed/i.test(m)) return '이메일 인증을 먼저 완료해 주세요. 받은 메일함을 확인하세요';
  if (/already registered|already been registered/i.test(m)) return '이미 가입된 이메일입니다';
  if (/password should be at least/i.test(m)) return '비밀번호는 6자 이상이어야 합니다';
  if (/rate limit/i.test(m)) return '요청이 많습니다. 잠시 후 다시 시도해 주세요';
  return m || '로그인에 실패했습니다';
}
