import { useEffect, useState } from 'react';

/**
 * Hook to handle hydration mismatch between server and client
 * Prevents layout shifts and hydration errors
 */

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

export function useClientValue<T>(serverValue: T, clientValue: T): T {
  const isHydrated = useHydration();
  return isHydrated ? clientValue : serverValue;
}
