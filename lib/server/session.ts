/** 서명 쿠키 세션 (미들웨어·API 공용, Edge 호환: Web Crypto만 사용) */
export const SESSION_COOKIE = 'milaind_session';
export const SESSION_MAX_AGE = 60 * 60 * 12;   // 12시간

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET(16자 이상)이 필요합니다');
    return 'dev-only-session-secret-change-me';
  }
  return s;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  let bin = '';
  for (const b of new Uint8Array(sig)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 값: userId.role.expires.signature */
export async function signSession(userId: string, role: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}.${role}.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function readSession(value: string | undefined | null): Promise<{ userId: string; role: string } | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [userId, role, exp, sig] = parts;
  if (Number(exp) < Date.now() / 1000) return null;
  const expected = await hmac(`${userId}.${role}.${exp}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? { userId, role } : null;
}
