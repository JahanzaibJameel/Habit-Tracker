/**
 * Migration definitions for application settings
 * Handles version upgrades for settings stored in localStorage
 * 
 * @fileoverview Settings migration definitions
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { Migration } from '../types';
import { AppSettingsSchema } from '../../validation/schemas';
import { z } from 'zod';

// Type definitions for different versions
type SettingsV0 = {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
  };
};

type SettingsV1 = z.infer<typeof AppSettingsSchema>;

type SettingsV2 = SettingsV1 & {
  accessibility: {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    screenReader: boolean;
    keyboardNavigation: boolean;
    highContrastMode: boolean;
    reducedTransparency: boolean;
  };
};

type SettingsV3 = SettingsV2 & {
  experimental: {
    aiFeatures: boolean;
    betaFeatures: boolean;
    debugMode: boolean;
    performanceMonitoring: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
    telemetry: boolean;
    dataRetention: number; // days
  };
};

/**
 * Complete migration chain for settings: v0 -> v1 -> v2 -> v3
 */
export const settingsMigrations: Migration<any>[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    description: 'Migrate from unstructured settings to v1 schema',
    estimatedTime: 50,
    critical: true,
    migrate: (oldData: unknown, fromVersion: number, toVersion: number): SettingsV1 => {
      const v0Data = oldData as SettingsV0;
      
      return {
        _version: 1,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        featureFlags: {},
        ui: {
          density: 'comfortable',
          animations: true,
          reducedMotion: false,
          highContrast: false,
        },
        api: {
          baseUrl: 'https://api.example.com',
          timeout: 10000,
          retryAttempts: 3,
        },
        security: {
          sessionTimeout: 3600,
          requireMfa: false,
          allowedOrigins: [],
        },
      };
    },
  },
  {
    fromVersion: 1,
    toVersion: 2,
    description: 'Add accessibility settings and enhanced UI options',
    estimatedTime: 25,
    critical: false,
    migrate: (oldData: unknown, fromVersion: number, toVersion: number): SettingsV2 => {
      const v1Data = oldData as SettingsV1;
      
      return {
        ...v1Data,
        _version: 2,
        _updatedAt: new Date().toISOString(),
        accessibility: {
          fontSize: v1Data.ui?.highContrast ? 'large' : 'medium',
          screenReader: false,
          keyboardNavigation: true,
          highContrastMode: v1Data.ui?.highContrast || false,
          reducedTransparency: v1Data.ui?.reducedMotion || false,
        },
      };
    },
  },
  {
    fromVersion: 2,
    toVersion: 3,
    description: 'Add experimental features and privacy controls',
    estimatedTime: 30,
    critical: false,
    migrate: (oldData: unknown, fromVersion: number, toVersion: number): SettingsV3 => {
      const v2Data = oldData as SettingsV2;
      
      return {
        ...v2Data,
        _version: 3,
        _updatedAt: new Date().toISOString(),
        experimental: {
          aiFeatures: false,
          betaFeatures: false,
          debugMode: false,
          performanceMonitoring: true,
        },
        privacy: {
          analytics: true,
          crashReporting: true,
          telemetry: false,
          dataRetention: 365,
        },
      };
    },
  },
];

/**
 * Migration registry for easy access and version tracking
 */
export const settingsMigrationRegistry = {
  migrations: settingsMigrations,
  latestVersion: 3,
  getMigration(fromVersion: number, toVersion: number): Migration<any> | undefined {
    return this.migrations.find(m => m.fromVersion === fromVersion && m.toVersion === toVersion);
  },
  getMigrationPath(fromVersion: number, toVersion: number): Migration<any>[] {
    const path: Migration<any>[] = [];
    let currentVersion = fromVersion;
    
    while (currentVersion < toVersion) {
      const migration = this.migrations.find(m => m.fromVersion === currentVersion);
      if (!migration) break;
      path.push(migration);
      currentVersion = migration.toVersion;
    }
    
    return path;
  },
  getTotalEstimatedTime(fromVersion: number, toVersion: number): number {
    const path = this.getMigrationPath(fromVersion, toVersion);
    return path.reduce((total, migration) => total + (migration.estimatedTime || 0), 0);
  },
};
