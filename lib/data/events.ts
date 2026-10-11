'use client';
import { useSyncExternalStore } from 'react';

/** 데이터가 바뀌면 화면이 다시 읽도록 알리는 간단한 버전 카운터 (두 모드 공용) */
let version = 0;
const listeners = new Set<() => void>();

export function notifyDataChanged() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}
