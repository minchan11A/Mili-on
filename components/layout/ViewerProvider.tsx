'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getDataSource } from '@/lib/data';
import { useDataVersion } from '@/lib/data/events';
import type { Role, Viewer } from '@/lib/types';

interface ViewerCtx {
  viewer: Viewer | null;
  ready: boolean;
  switchRole: (role: Role) => Promise<void>;
  refresh: () => void;
}

const Ctx = createContext<ViewerCtx>({ viewer: null, ready: false, switchRole: async () => {}, refresh: () => {} });

export function ViewerProvider({ children }: { children: ReactNode }) {
  const version = useDataVersion();
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    getDataSource().getViewer().then((v) => { if (alive) { setViewer(v); setReady(true); } }, () => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [version, tick]);
  const switchRole = useCallback(async (role: Role) => {
    const ds = getDataSource();
    if (ds.switchRole) setViewer(await ds.switchRole(role));
  }, []);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return <Ctx.Provider value={{ viewer, ready, switchRole, refresh }}>{children}</Ctx.Provider>;
}

export const useViewer = () => useContext(Ctx);

export const isManagerRole = (v: Viewer | null) => v?.role === 'RANGE_MANAGER' || v?.role === 'POLICY_ADMIN';
