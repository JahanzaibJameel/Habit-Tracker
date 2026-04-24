/**
 * React hooks for feature flag functionality
 * Moved from lib to proper hooks directory
 */

import { useEffect, useState } from 'react';

import type { FeatureFlagService } from '@/lib/core/feature-flags';
import { featureFlagService } from '@/lib/core/feature-flags';

interface UserContext {
  userId: string;
  properties: Record<string, string>;
  environment: 'development' | 'staging' | 'production';
}

export function useFeatureFlag(flagKey: string): boolean {
  const [enabled, setEnabled] = useState(false);
  const flagService = featureFlagService;

  useEffect(() => {
    const isEnabled = flagService.isEnabled(flagKey);
    setEnabled(isEnabled);
    flagService.trackFlagUsage(flagKey, isEnabled);
  }, [flagKey]);

  return enabled;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState(featureFlagService.getAllFlags());
  const flagService = featureFlagService;

  const updateFlag = (key: string, updates: any) => {
    flagService.updateFlag(key, updates);
    setFlags(flagService.getAllFlags());
  };

  return {
    flags,
    updateFlag,
    isEnabled: (key: string) => flagService.isEnabled(key),
  };
}

export function useUserContext() {
  const setUserContext = (context: UserContext) => {
    featureFlagService.setUserContext(context);
  };

  return {
    setUserContext,
  };
}

export function useFeatureFlagService(): FeatureFlagService {
  return featureFlagService;
}
