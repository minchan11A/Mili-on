'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataVersion } from './data/events';

export interface QueryState<T> { data: T | undefined; error: Error | null; loading: boolean; reload: () => void }

/** DataSource 호출 결과. 데이터가 바뀌면(notifyDataChanged) 자동으로 다시 읽음 */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[], enabled = true): QueryState<T> {
  const version = useDataVersion();
  const [state, setState] = useState<{ data: T | undefined; error: Error | null; loading: boolean }>({ data: undefined, error: null, loading: enabled });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) { setState((s) => ({ ...s, loading: false })); return; }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fnRef.current().then(
      (data) => { if (alive) setState({ data, error: null, loading: false }); },
      (error: Error) => { if (alive) setState((s) => ({ data: s.data, error, loading: false })); },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, tick, enabled]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** localStorage 기반 개인 편의 상태 (막혀 있으면 메모리로만) */
export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setV(JSON.parse(raw) as T);
    } catch { /* 무시 */ }
  }, [key]);
  const set = useCallback((nv: T) => {
    setV(nv);
    try { window.localStorage.setItem(key, JSON.stringify(nv)); } catch { /* 무시 */ }
  }, [key]);
  return [v, set];
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    setM(mq.matches);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}
