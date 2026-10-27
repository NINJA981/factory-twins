import { useEffect, useState } from 'react';

// Motion tokens (DESIGN.md, Motion system) as the strings WAAPI wants, and the reduced-motion check.
// The overlay animates with the Web Animations API; popup and options use Motion.

export const EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  outSoft: 'cubic-bezier(0.25, 1, 0.5, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  /** CSS approximation of SPEC playful spring (visualDuration 0.4, bounce 0.25): signature moments only. */
  springPlayful: 'linear(0, 0.157, 0.48, 0.79, 1.01, 1.11, 1.12, 1.08, 1.03, 0.99, 0.98, 0.99, 1)',
} as const;

export function prefersReducedMotion(win: Window | null | undefined = globalThis.window): boolean {
  return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function canAnimate(el: Element): boolean {
  return typeof (el as HTMLElement).animate === 'function';
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());
  useEffect(() => {
    const mq = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
