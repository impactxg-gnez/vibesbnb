'use client';

import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';

/**
 * One-shot celebratory bursts for email verification success.
 * Respects prefers-reduced-motion.
 */
export function useVerificationConfetti() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    fired.current = true;

    const colors = ['#00E676', '#7C3AED', '#FBBF24', '#38BDF8', '#F472B6', '#A78BFA'];

    const burst = (opts: confetti.Options) => {
      confetti({
        colors,
        disableForReducedMotion: true,
        ...opts,
      });
    };

    burst({ particleCount: 120, spread: 70, origin: { y: 0.65, x: 0.5 } });

    const left = setTimeout(() => {
      burst({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.65 } });
    }, 200);
    const right = setTimeout(() => {
      burst({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.65 } });
    }, 350);
    const finale = setTimeout(() => {
      burst({ particleCount: 90, spread: 360, startVelocity: 35, ticks: 120, origin: { x: 0.5, y: 0.45 } });
    }, 600);

    return () => {
      clearTimeout(left);
      clearTimeout(right);
      clearTimeout(finale);
    };
  }, []);
}
