import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCarouselOptions {
  itemCount: number;
  interval?: number;
  autoPlay?: boolean;
}

interface UseCarouselResult {
  currentIndex: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  pause: () => void;
  resume: () => void;
  isPaused: boolean;
}

/**
 * Carousel hook with auto-advance and pause functionality
 * @param itemCount - Total number of items in the carousel
 * @param interval - Auto-advance interval in milliseconds (default: 5000)
 * @param autoPlay - Whether to auto-advance (default: true)
 * @returns Carousel controls and state
 */
export function useCarousel({
  itemCount,
  interval = 5000,
  autoPlay = true,
}: UseCarouselOptions): UseCarouselResult {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(!autoPlay);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Navigate to next item (loop around)
  const next = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % itemCount);
  }, [itemCount]);

  // Navigate to previous item (loop around)
  const prev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + itemCount) % itemCount);
  }, [itemCount]);

  // Navigate to specific index
  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < itemCount) {
        setCurrentIndex(index);
      }
    },
    [itemCount]
  );

  // Pause auto-advance
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume auto-advance
  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Auto-advance effect
  useEffect(() => {
    // Clear any existing interval
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Only set up interval if not paused and itemCount > 1
    if (!isPaused && itemCount > 1) {
      intervalIdRef.current = setInterval(() => {
        next();
      }, interval);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isPaused, interval, itemCount, next]);

  // Reset index if itemCount changes and current index is out of bounds
  useEffect(() => {
    if (currentIndex >= itemCount) {
      setCurrentIndex(0);
    }
  }, [itemCount, currentIndex]);

  return {
    currentIndex,
    next,
    prev,
    goTo,
    pause,
    resume,
    isPaused,
  };
}
