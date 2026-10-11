'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { checkText, normalizeWithMap, toRawRange, toStorableText, type CheckResult } from '@/lib/masking';
import { useDebounced } from '@/lib/hooks';
import { cx } from '@/lib/format';
import { MaskHighlight } from './MaskHighlight';

export type SecurityLevel = CheckResult['level'];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onLevelChange?: (level: SecurityLevel) => void;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  /** 가이드 꿀팁: 훈련 일정(날짜+시간) 패턴 경고 */
  scheduleWarn?: boolean;
  id?: string;
  label?: string;
  testId?: string;
}

/**
 * 작성 시점 보안 경고 (명세 §5.2)
 * - 입력 후 300ms 디바운스로 checkText 실행
 * - warn: 걸린 부분 노란 밑줄 + "부대명·장비명은 자동으로 가려져 저장됩니다", 저장은 마스킹된 본문으로
 * - block: 빨간 테두리 + "좌표·작전 관련 내용은 등록할 수 없습니다", 제출 버튼 비활성화(onLevelChange)
 */
export function SecurityWarning({ value, onChange, onLevelChange, multiline = true, rows = 5, maxLength, placeholder, scheduleWarn, id, label, testId }: Props) {
  const debounced = useDebounced(value, 300);
  const result = useMemo(() => checkText(debounced, { scheduleWarn }), [debounced, scheduleWarn]);
  // 차단 문구를 지운 직후 제출이 막히지 않도록, 현재 값 기준 즉시 판정도 함께 사용
  const level: SecurityLevel = debounced === value ? result.level : checkText(value, { scheduleWarn }).level;
  useEffect(() => { onLevelChange?.(level); }, [level, onLevelChange]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  useEffect(() => { if (overlayRef.current) overlayRef.current.scrollTop = scrollTop; }, [scrollTop]);

  // 원문 위 하이라이트 구간
  const marks = useMemo(() => {
    if (debounced !== value) return [] as Array<{ s: number; e: number; block: boolean }>;
    const { map } = normalizeWithMap(value);
    return result.findings.map((f) => {
      const [s, e] = toRawRange(map, f.start, f.end, value);
      return { s, e, block: f.type === 'BLOCK' };
    }).sort((a, b) => a.s - b.s);
  }, [result, value, debounced]);

  const overlay = useMemo(() => {
    const out: React.ReactNode[] = [];
    let cur = 0;
    marks.forEach((m, i) => {
      if (m.s < cur) return;
      out.push(value.slice(cur, m.s));
      out.push(<mark key={i} className={m.block ? 'hl-block' : 'hl-warn'}>{value.slice(m.s, m.e)}</mark>);
      cur = m.e;
    });
    out.push(value.slice(cur) + '\n');
    return out;
  }, [marks, value]);

  const preview = useMemo(() => {
    if (result.level !== 'warn') return null;
    const r = toStorableText(debounced);
    return r.ok ? r.text : null;
  }, [result, debounced]);

  const blockFindings = result.findings.filter((f) => f.type === 'BLOCK');
  const warnFindings = result.findings.filter((f) => f.type !== 'BLOCK');
  const shared = 'w-full rounded-xl px-3 py-2.5 text-[15px] leading-[1.6] whitespace-pre-wrap break-words';

  return (
    <div>
      <div className={cx('relative rounded-xl border bg-surface', level === 'block' ? 'border-2 border-danger' : level === 'warn' ? 'border-warn' : 'border-line focus-within:border-primary')}>
        <div ref={overlayRef} aria-hidden className={cx(shared, 'pointer-events-none absolute inset-0 overflow-hidden text-transparent', !multiline && 'whitespace-nowrap')}>
          {overlay}
        </div>
        {multiline ? (
          <textarea
            id={id}
            aria-label={label}
            data-testid={testId}
            value={value}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            aria-invalid={level === 'block'}
            className={cx(shared, 'relative block resize-y bg-transparent outline-none')}
          />
        ) : (
          <input
            id={id}
            aria-label={label}
            data-testid={testId}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={level === 'block'}
            className={cx(shared, 'relative block min-h-11 bg-transparent outline-none')}
          />
        )}
      </div>
      {level === 'block' && (
        <div role="alert" data-testid="security-block" className="mt-2 rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          <b>좌표·작전 관련 내용은 등록할 수 없습니다.</b>
          <ul className="mt-1 list-disc pl-5">
            {[...new Set(blockFindings.map((f) => f.message.split(':')[0]))].map((r) => <li key={r}>{r}</li>)}
          </ul>
          해당 부분을 지우면 제출할 수 있습니다.
        </div>
      )}
      {level === 'warn' && (
        <div data-testid="security-warn" className="mt-2 rounded-xl border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-yellow-900">
          <b>부대명·장비명은 자동으로 가려져 저장됩니다.</b>
          <ul className="mt-1 space-y-0.5">
            {warnFindings.map((f, i) => (
              <li key={i}>
                <span className="font-semibold">“{result.normalized.slice(f.start, f.end)}”</span> — {f.message}
              </li>
            ))}
          </ul>
          {preview && (
            <div className="mt-2 rounded-lg bg-surface/80 px-2 py-1.5 text-ink">
              <span className="mr-1 text-xs font-semibold text-ink-3">저장될 내용</span>
              <MaskHighlight text={preview} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
