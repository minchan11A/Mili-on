'use client';
import { Fragment } from 'react';
import { cx } from '@/lib/format';

const TOKEN_RE = /\[(부대|장비|작전용어|시설|위치|인물|전화번호|군번|주민번호|차량번호|이메일)(?:_(\d+))?\]/g;
const PII = new Set(['전화번호', '군번', '주민번호', '차량번호', '이메일']);

/** 마스킹 토큰을 칩으로 강조해 보여줌 ("[부대_1]" → 칩) */
export function MaskHighlight({ text, className }: { text: string; className?: string }) {
  const parts: Array<string | { token: string; label: string; pii: boolean }> = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ token: m[0], label: m[1], pii: PII.has(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <span className={cx('whitespace-pre-wrap', className)}>
      {parts.map((p, i) => typeof p === 'string'
        ? <Fragment key={i}>{p}</Fragment>
        : (
          <span
            key={i}
            data-token={p.token}
            className={cx('mx-0.5 inline-flex items-center rounded-md px-1.5 py-px text-[0.85em] font-bold', p.pii ? 'bg-gray-200 text-gray-800' : 'bg-ai-soft text-ai ring-1 ring-ai/30')}
          >
            {p.token}
          </span>
        ))}
    </span>
  );
}
