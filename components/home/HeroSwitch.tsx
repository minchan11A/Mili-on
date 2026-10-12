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
            'relative ml-[0.24em] inline-block h-[0.76em] w-[1.66em] shrink-0 translate-y-[0.06em] cursor-pointer rounded-full transition-colors duration-700 ease-in-out',
            on ? 'bg-accent' : 'bg-danger',
          )}
        >
          {/* 손잡이 왼쪽 빈 공간의 가운데에 on */}
          <span
            className={cx(
              'absolute inset-y-0 left-[0.06em] right-[0.68em] flex items-center justify-center transition-opacity duration-300',
              on ? 'opacity-100 delay-300' : 'opacity-0',
            )}
          >
            <span className="-translate-y-[4%] text-[0.52em] font-semibold leading-none tracking-[-0.04em] text-on-accent">on</span>
          </span>
          {/* 손잡이 오른쪽 빈 공간의 가운데에 off */}
          <span
            className={cx(
              'absolute inset-y-0 left-[0.68em] right-[0.06em] flex items-center justify-center transition-opacity duration-300',
              on ? 'opacity-0' : 'opacity-100 delay-300',
            )}
          >
            <span className="-translate-y-[4%] text-[0.46em] font-semibold leading-none tracking-[-0.04em] text-white/90">off</span>
          </span>
          <span
            className={cx(
              'absolute left-[0.08em] top-[0.08em] h-[0.6em] w-[0.6em] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-700 ease-[cubic-bezier(.45,1.25,.5,1)]',
              on ? 'translate-x-[0.9em]' : 'translate-x-0',
            )}
          />
        </button>
      </h1>
      <p className={cx('mt-6 text-[22px] font-medium leading-snug tracking-[-0.02em] transition-colors duration-700 sm:mt-7 sm:text-[30px]', on ? 'text-ink' : 'text-ink-3')}>
        예비군의 백만 가지 이야기, <br className="sm:hidden" />하나도 꺼지지 않도록.
      </p>
    </div>
  );
}
