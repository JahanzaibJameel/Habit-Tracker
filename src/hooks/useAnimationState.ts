import { useCallback, useRef, useState } from 'react';

/**
 * Hook to manage animation state safely and prevent corruption
 */

export function useAnimationState(duration: number = 600) {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const startAnimation = useCallback(() => {
    if (isAnimating || !isMountedRef.current) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsAnimating(true);

    // Auto-stop animation after duration
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsAnimating(false);
      }
      timeoutRef.current = null;
    }, duration);
  }, [isAnimating, duration]);

  const stopAnimation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isMountedRef.current) {
      setIsAnimating(false);
    }
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    isMountedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    isAnimating,
    startAnimation,
    stopAnimation,
    cleanup,
  };
}
