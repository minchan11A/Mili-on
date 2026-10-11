'use client';
import { IS_DEMO } from '../config';
import { apiDataSource } from './api';
import { demoDataSource } from './demo';
import type { DataSource } from './types';

/** IS_DEMO ? demo : api. 빌드 시 값이 고정되므로 쓰지 않는 쪽은 번들에서 빠집니다. */
export function getDataSource(): DataSource {
  return IS_DEMO ? demoDataSource : apiDataSource;
}

export { DataError } from './types';
export type { DataSource } from './types';
