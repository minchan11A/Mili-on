import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { AppError, BlockedError, type Ctx } from '../core/queries';
import type { Change, MutationCtx } from '../core/mutations';
import { loadDataset } from './dataset';
import { viewerFrom } from './auth';
import { persistChanges } from './persist';

export type RouteParams<T extends Record<string, string>> = { params: Promise<T> };

let seq = 0;
export const newServerId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 요청마다: DB 스냅샷 + 세션 사용자 */
export async function context(): Promise<MutationCtx> {
  const ds = await loadDataset();
  return { ds, viewer: await viewerFrom(ds), newId: newServerId };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data ?? null, { status, headers: { 'cache-control': 'no-store' } });
}

export function errorResponse(e: unknown) {
  if (e instanceof BlockedError) return json({ code: 'BLOCKED', message: e.message, reasons: e.reasons }, 422);
  if (e instanceof AppError) return json({ code: e.code, message: e.message }, e.status);
  if (e instanceof ZodError) return json({ code: 'INVALID', message: '입력값이 올바르지 않습니다', issues: e.issues }, 400);
  console.error(e);
  return json({ code: 'ERROR', message: '서버 오류가 발생했습니다' }, 500);
}

/** 라우트 공통 래퍼: 오류를 JSON으로 */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try { return await fn(...args); } catch (e) { return errorResponse(e); }
  };
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const raw = await req.json().catch(() => ({}));
  return schema.parse(raw);
}

/** 쓰기: 규칙 함수 실행 → DB 반영 → 결과 */
export async function write<T>(c: MutationCtx, fn: (c: MutationCtx) => { changes: Change[]; result: T }): Promise<{ result: T; ctx: Ctx }> {
  const r = fn(c);
  await persistChanges(r.changes);
  const { applyChanges } = await import('../core/mutations');
  return { result: r.result, ctx: { ...c, ds: applyChanges(c.ds, r.changes) } };
}

export function searchParams(req: Request) {
  return new URL(req.url).searchParams;
}
