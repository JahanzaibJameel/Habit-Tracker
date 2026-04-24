import { useEffect, useState } from 'react';

/**
 * Hook to safely access client-side APIs (window, document, navigator, localStorage)
 * Prevents SSR/CSR hydration issues
 */
export function useSafeClientAPI() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return {
    isClient,
    // Safe window access
    window: isClient ? (typeof window !== 'undefined' ? window : null) : null,
    // Safe document access
    document: isClient ? (typeof document !== 'undefined' ? document : null) : null,
    // Safe navigator access
    navigator: isClient ? (typeof navigator !== 'undefined' ? navigator : null) : null,
    // Safe localStorage access
    localStorage: isClient ? (typeof localStorage !== 'undefined' ? localStorage : null) : null,
    // Safe sessionStorage access
    sessionStorage: isClient
      ? typeof sessionStorage !== 'undefined'
        ? sessionStorage
        : null
      : null,
  };
}

/**
 * Hook for safe clipboard operations
 */
export function useClipboard() {
  const { isClient, navigator } = useSafeClientAPI();

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!isClient || !navigator?.clipboard) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  };

  return { copyToClipboard, isSupported: isClient && !!navigator?.clipboard };
}

/**
 * Hook for safe share operations
 */
export function useShare() {
  const { isClient, navigator } = useSafeClientAPI();

  const share = async (data: ShareData): Promise<boolean> => {
    if (!isClient || !navigator?.share) {
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Failed to share:', error);
      return false;
    }
  };

  return { share, isSupported: isClient && !!navigator?.share };
}

/**
 * Hook for safe localStorage operations
 */
export function useLocalStorage() {
  const { isClient, localStorage } = useSafeClientAPI();

  const getItem = (key: string): string | null => {
    if (!isClient || !localStorage) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get localStorage item:', error);
      return null;
    }
  };

  const setItem = (key: string, value: string): boolean => {
    if (!isClient || !localStorage) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Failed to set localStorage item:', error);
      return false;
    }
  };

  const removeItem = (key: string): boolean => {
    if (!isClient || !localStorage) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove localStorage item:', error);
      return false;
    }
  };

  return { getItem, setItem, removeItem, isSupported: isClient && !!localStorage };
}
