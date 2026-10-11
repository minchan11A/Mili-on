import { z } from 'zod';
import { maskText } from '@/lib/masking';
import { body, handle, json } from '@/lib/server/handler';

const Input = z.object({ text: z.string().max(2000) });

/** 보안 마스킹 체험 (서버 측 결과). vault는 돌려주지 않음 */
export const POST = handle(async (req: Request) => {
  const r = maskText((await body(req, Input)).text);
  return json({ masked: r.masked, entities: r.entities, blocked: r.blocked, blockReasons: r.blockReasons });
});
