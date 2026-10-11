import { BlockedError } from '../core/queries';
import { toStorableText } from '../masking';

/** 사용자 입력 한 줄을 저장용으로: 차단이면 422 */
export function storableOrThrow(text: string, _field: string): string {
  const r = toStorableText(text);
  if (!r.ok) throw new BlockedError(r.reasons);
  return r.text;
}
