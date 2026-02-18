import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  target: number;
  duration?: number;
  enabled?: boolean;
}

/**
 * Animated counter hook with ease-out cubic easing
 * @param target - The target value to count up to
 * @param duration - Animation duration in milliseconds (default: 2000)
 * @param enabled - Whether the animation should start (default: true)
 * @returns Current animated value
 */
export function useCountUp({ target, duration = 2000, enabled = true }: UseCountUpOptions): number {
  const [currentValue, setCurrentValue] = useState(0);
  const hasAnimatedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Only animate once
    if (!enabled || hasAnimatedRef.current) {
      return;
    }

    hasAnimatedRef.current = true;
    startTimeRef.current = null;

    // Ease-out cubic easing function
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const value = Math.floor(easedProgress * target);

      setCurrentValue(value);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(target); // Ensure we end exactly at target
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [target, duration, enabled]);

  return currentValue;
}
