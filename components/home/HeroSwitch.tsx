'use client';
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/format';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * 홈 첫 화면 제목: "mili" + 켜지는 스위치(on).
 * 화면이 열리면 빨간 off 상태로 1.4초 머문 뒤 천천히 녹색 on으로 켜지고, 누르면 꺼졌다가 다시 켜집니다. 움직임 줄이기 설정이면 처음부터 켜짐.
 */
export function HeroSwitch() {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reducedMotion()) { setOn(true); return; }
    timer.current = setTimeout(() => setOn(true), 1400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  function replay() {
    if (reducedMotion()) return;
    if (timer.current) clearTimeout(timer.current);
    setOn(false);
    timer.current = setTimeout(() => setOn(true), 1100);
  }

  return (
    <div>
      <h1 aria-label="mili:on" className="flex items-center text-[56px] font-semibold leading-none tracking-[-0.045em] sm:text-[84px]">
        <span aria-hidden>mili</span>
        <button
          type="button" onClick={replay} aria-hidden tabIndex={-1} data-testid="hero-switch" data-on={on}
          className={cx(
            'relative ml-[0.08em] inline-block h-[0.72em] w-[1.46em] shrink-0 translate-y-[0.06em] cursor-pointer rounded-full transition-colors duration-700 ease-in-out',
            on ? 'bg-accent' : 'bg-danger',
          )}
        >
          <span
            className={cx(
              'absolute left-[0.2em] top-1/2 -translate-y-1/2 text-[0.4em] font-semibold tracking-[-0.02em] text-on-accent transition-opacity duration-300',
              on ? 'opacity-100 delay-300' : 'opacity-0',
            )}
          >on</span>
          <span
            className={cx(
              'absolute right-[0.17em] top-1/2 -translate-y-1/2 text-[0.34em] font-semibold tracking-[-0.02em] text-white/90 transition-opacity duration-300',
              on ? 'opacity-0' : 'opacity-100 delay-300',
            )}
          >off</span>
          <span
            className={cx(
              'absolute left-[0.08em] top-[0.08em] h-[0.56em] w-[0.56em] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-700 ease-[cubic-bezier(.45,1.25,.5,1)]',
              on ? 'translate-x-[0.74em]' : 'translate-x-0',
            )}
          />
        </button>
      </h1>
      <p className={cx('mt-6 text-[22px] font-medium leading-snug tracking-[-0.02em] transition-colors duration-700 sm:mt-7 sm:text-[30px]', on ? 'text-ink' : 'text-ink-3')}>
        백만 개의 불편, <br className="sm:hidden" />하나도 꺼지지 않도록.
      </p>
    </div>
  );
}
