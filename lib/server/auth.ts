import 'server-only';
import { cookies } from 'next/headers';
import { buildViewer } from '../core/queries';
import type { Dataset, Viewer } from '../types';
import { readSession, SESSION_COOKIE } from './session';

export async function sessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const s = await readSession(jar.get(SESSION_COOKIE)?.value);
  return s?.userId ?? null;
}

export async function viewerFrom(ds: Dataset): Promise<Viewer | null> {
  const id = await sessionUserId();
  return id ? buildViewer(ds, id) : null;
}
