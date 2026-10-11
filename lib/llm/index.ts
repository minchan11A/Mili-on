/**
 * 공급자 선택 (명세 §5.3). 서버 전용.
 * - 시연 모드: 항상 cache
 * - 서버 모드: LLM_PROVIDER(claude|gemini|openai). 키가 없으면 cache로 대체하고 화면에 표시
 * 브라우저 코드는 이 파일 대신 ./cache 를 직접 씁니다.
 */
import 'server-only';
import { IS_DEMO } from '../config';
import { cacheProvider } from './cache';
import { createCommercialProvider, type CommercialName } from './commercial';
import type { LlmProvider } from './types';

export interface ProviderChoice { provider: LlmProvider; fallbackNotice: string | null }

export function getLlmProvider(): ProviderChoice {
  if (IS_DEMO) return { provider: cacheProvider, fallbackNotice: null };
  const name = (process.env.LLM_PROVIDER ?? 'claude').toLowerCase() as CommercialName;
  const key = process.env.LLM_API_KEY;
  if (!['claude', 'gemini', 'openai'].includes(name)) {
    return { provider: cacheProvider, fallbackNotice: `알 수 없는 LLM_PROVIDER(${name}) → 사전 생성 캐시로 대체` };
  }
  if (!key) return { provider: cacheProvider, fallbackNotice: 'AI API 키가 설정되지 않아 사전 생성 캐시로 대체했습니다' };
  return { provider: createCommercialProvider(name, key, process.env.LLM_MODEL || undefined), fallbackNotice: null };
}

export type { LlmProvider } from './types';
