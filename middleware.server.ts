/**
 * 서버 모드 권한 미들웨어 (명세 §9, §10.2).
 * 시연 빌드에서는 pageExtensions에서 빠져 포함되지 않습니다. API 라우트도 따로 권한을 검사합니다.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { readSession, SESSION_COOKIE } from './lib/server/session';

export async function middleware(req: NextRequest) {
  const s = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  const path = req.nextUrl.pathname;
  const needPolicy = path.startsWith('/admin/audit');
  const ok = s && (needPolicy ? s.role === 'POLICY_ADMIN' : s.role === 'RANGE_MANAGER' || s.role === 'POLICY_ADMIN');
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(path)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*'] };
