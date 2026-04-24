/**
 * Cookie Consent Management for Monitoring
 * Integrates with monitoring foundation to ensure privacy compliance
 * 
 * @fileoverview Cookie consent management with monitoring integration
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react';
import { MonitoringContextValue } from './MonitoringProvider';

/**
 * Cookie consent categories
 */
export enum ConsentCategory {
  NECESSARY = 'necessary',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  FUNCTIONAL = 'functional',
  PERFORMANCE = 'performance',
}

/**
 * Consent status
 */
export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PENDING = 'pending',
  EXPIRED = 'expired',
}

/**
 * Cookie consent configuration
 */
export interface CookieConsentConfig {
  /**
   * Required consent categories
   */
  requiredCategories?: ConsentCategory[];
  
  /**
   * Default consent status for each category
   */
  defaultConsent?: Record<ConsentCategory, ConsentStatus>;
  
  /**
   * Consent expiration time (in days)
   */
  consentExpirationDays?: number;
  
  /**
   * Show consent banner on first visit
   */
  showBannerOnFirstVisit?: boolean;
  
  /**
   * Allow granular consent (per category)
   */
  allowGranularConsent?: boolean;
  
  /**
   * Custom consent banner content
   */
  bannerContent?: {
    title?: string;
    description?: string;
    acceptAllText?: string;
    acceptNecessaryText?: string;
    customizeText?: string;
    privacyPolicyUrl?: string;
  };
  
  /**
   * Cookie policy URL
   */
  cookiePolicyUrl?: string;
  
  /**
   * Region-specific consent requirements
   */
  regionConfig?: {
    eu?: {
      requireExplicitConsent: boolean;
      allowMarketing: boolean;
    };
    california?: {
      doNotSell: boolean;
      privacyRights: boolean;
    };
  };
}

/**
 * Consent state
 */
export interface ConsentState {
  /**
   * Current consent status for each category
   */
  consent: Record<ConsentCategory, ConsentStatus>;
  
  /**
   * Has user made consent choices
   */
  hasConsented: boolean;
  
  /**
   * Timestamp of last consent update
   */
  lastUpdated: number;
  
  /**
   * User's region
   */
  region: string;
  
  /**
   * Consent banner visibility
   */
  showBanner: boolean;
  
  /**
   * Show customization panel
   */
  showCustomize: boolean;
  
  /**
   * Consent preferences
   */
  preferences: {
    allowAnalytics: boolean;
    allowMarketing: boolean;
    allowFunctional: boolean;
    allowPerformance: boolean;
  };
}

/**
 * Consent actions
 */
export type ConsentAction =
  | { type: 'GRANT_CONSENT'; category: ConsentCategory }
  | { type: 'DENY_CONSENT'; category: ConsentCategory }
  | { type: 'GRANT_ALL' }
  | { type: 'DENY_ALL' }
  | { type: 'ACCEPT_NECESSARY_ONLY' }
  | { type: 'UPDATE_PREFERENCES'; preferences: Partial<ConsentState['preferences']> }
  | { type: 'SHOW_BANNER' }
  | { type: 'HIDE_BANNER' }
  | { type: 'SHOW_CUSTOMIZE' }
  | { type: 'HIDE_CUSTOMIZE' }
  | { type: 'SET_REGION'; region: string }
  | { type: 'LOAD_CONSENT'; consent: Record<ConsentCategory, ConsentStatus>; lastUpdated: number }
  | { type: 'RESET_CONSENT' };

/**
 * Default consent configuration
 */
export const DEFAULT_CONSENT_CONFIG: CookieConsentConfig = {
  requiredCategories: [ConsentCategory.NECESSARY],
  defaultConsent: {
    [ConsentCategory.NECESSARY]: ConsentStatus.GRANTED,
    [ConsentCategory.ANALYTICS]: ConsentStatus.PENDING,
    [ConsentCategory.MARKETING]: ConsentStatus.PENDING,
    [ConsentCategory.FUNCTIONAL]: ConsentStatus.PENDING,
    [ConsentCategory.PERFORMANCE]: ConsentStatus.PENDING,
  },
  consentExpirationDays: 365,
  showBannerOnFirstVisit: true,
  allowGranularConsent: true,
  bannerContent: {
    title: 'Cookie Consent',
    description: 'We use cookies to enhance your experience and analyze our traffic.',
    acceptAllText: 'Accept All',
    acceptNecessaryText: 'Accept Necessary Only',
    customizeText: 'Customize',
    privacyPolicyUrl: '/privacy-policy',
  },
  cookiePolicyUrl: '/cookie-policy',
  regionConfig: {
    eu: {
      requireExplicitConsent: true,
      allowMarketing: false,
    },
    california: {
      doNotSell: true,
      privacyRights: true,
    },
  },
};

/**
 * Consent reducer
 */
function consentReducer(state: ConsentState, action: ConsentAction): ConsentState {
  switch (action.type) {
    case 'GRANT_CONSENT': {
      const newConsent = {
        ...state.consent,
        [action.category]: ConsentStatus.GRANTED,
      };
      
      return {
        ...state,
        consent: newConsent,
        hasConsented: true,
        lastUpdated: Date.now(),
        preferences: {
          allowAnalytics: newConsent[ConsentCategory.ANALYTICS] === ConsentStatus.GRANTED,
          allowMarketing: newConsent[ConsentCategory.MARKETING] === ConsentStatus.GRANTED,
          allowFunctional: newConsent[ConsentCategory.FUNCTIONAL] === ConsentStatus.GRANTED,
          allowPerformance: newConsent[ConsentCategory.PERFORMANCE] === ConsentStatus.GRANTED,
        },
        showBanner: false,
      };
    }

    case 'DENY_CONSENT': {
      const newConsent = {
        ...state.consent,
        [action.category]: ConsentStatus.DENIED,
      };
      
      return {
        ...state,
        consent: newConsent,
        hasConsented: true,
        lastUpdated: Date.now(),
        preferences: {
          allowAnalytics: newConsent[ConsentCategory.ANALYTICS] === ConsentStatus.GRANTED,
          allowMarketing: newConsent[ConsentCategory.MARKETING] === ConsentStatus.GRANTED,
          allowFunctional: newConsent[ConsentCategory.FUNCTIONAL] === ConsentStatus.GRANTED,
          allowPerformance: newConsent[ConsentCategory.PERFORMANCE] === ConsentStatus.GRANTED,
        },
        showBanner: false,
      };
    }

    case 'GRANT_ALL': {
      const newConsent: Record<ConsentCategory, ConsentStatus> = {
        [ConsentCategory.NECESSARY]: ConsentStatus.GRANTED,
        [ConsentCategory.ANALYTICS]: ConsentStatus.GRANTED,
        [ConsentCategory.MARKETING]: ConsentStatus.GRANTED,
        [ConsentCategory.FUNCTIONAL]: ConsentStatus.GRANTED,
        [ConsentCategory.PERFORMANCE]: ConsentStatus.GRANTED,
      };
      
      return {
        ...state,
        consent: newConsent,
        hasConsented: true,
        lastUpdated: Date.now(),
        preferences: {
          allowAnalytics: true,
          allowMarketing: true,
          allowFunctional: true,
          allowPerformance: true,
        },
        showBanner: false,
      };
    }

    case 'DENY_ALL': {
      const newConsent: Record<ConsentCategory, ConsentStatus> = {
        [ConsentCategory.NECESSARY]: ConsentStatus.GRANTED, // Necessary is always granted
        [ConsentCategory.ANALYTICS]: ConsentStatus.DENIED,
        [ConsentCategory.MARKETING]: ConsentStatus.DENIED,
        [ConsentCategory.FUNCTIONAL]: ConsentStatus.DENIED,
        [ConsentCategory.PERFORMANCE]: ConsentStatus.DENIED,
      };
      
      return {
        ...state,
        consent: newConsent,
        hasConsented: true,
        lastUpdated: Date.now(),
        preferences: {
          allowAnalytics: false,
          allowMarketing: false,
          allowFunctional: false,
          allowPerformance: false,
        },
        showBanner: false,
      };
    }

    case 'ACCEPT_NECESSARY_ONLY': {
      const newConsent: Record<ConsentCategory, ConsentStatus> = {
        [ConsentCategory.NECESSARY]: ConsentStatus.GRANTED,
        [ConsentCategory.ANALYTICS]: ConsentStatus.DENIED,
        [ConsentCategory.MARKETING]: ConsentStatus.DENIED,
        [ConsentCategory.FUNCTIONAL]: ConsentStatus.DENIED,
        [ConsentCategory.PERFORMANCE]: ConsentStatus.DENIED,
      };
      
      return {
        ...state,
        consent: newConsent,
        hasConsented: true,
        lastUpdated: Date.now(),
        preferences: {
          allowAnalytics: false,
          allowMarketing: false,
          allowFunctional: false,
          allowPerformance: false,
        },
        showBanner: false,
      };
    }

    case 'UPDATE_PREFERENCES': {
      const newPreferences = {
        ...state.preferences,
        ...action.preferences,
      };
      
      const newConsent: Record<ConsentCategory, ConsentStatus> = {
        [ConsentCategory.NECESSARY]: ConsentStatus.GRANTED,
        [ConsentCategory.ANALYTICS]: newPreferences.allowAnalytics ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        [ConsentCategory.MARKETING]: newPreferences.allowMarketing ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        [ConsentCategory.FUNCTIONAL]: newPreferences.allowFunctional ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        [ConsentCategory.PERFORMANCE]: newPreferences.allowPerformance ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
      };
      
      return {
        ...state,
        consent: newConsent,
        hasConsented: true,
        lastUpdated: Date.now(),
        preferences: newPreferences,
        showBanner: false,
      };
    }

    case 'SHOW_BANNER':
      return { ...state, showBanner: true };

    case 'HIDE_BANNER':
      return { ...state, showBanner: false };

    case 'SHOW_CUSTOMIZE':
      return { ...state, showCustomize: true };

    case 'HIDE_CUSTOMIZE':
      return { ...state, showCustomize: false };

    case 'SET_REGION':
      return { ...state, region: action.region };

    case 'LOAD_CONSENT':
      return {
        ...state,
        consent: action.consent,
        lastUpdated: action.lastUpdated,
        hasConsented: true,
        preferences: {
          allowAnalytics: action.consent[ConsentCategory.ANALYTICS] === ConsentStatus.GRANTED,
          allowMarketing: action.consent[ConsentCategory.MARKETING] === ConsentStatus.GRANTED,
          allowFunctional: action.consent[ConsentCategory.FUNCTIONAL] === ConsentStatus.GRANTED,
          allowPerformance: action.consent[ConsentCategory.PERFORMANCE] === ConsentStatus.GRANTED,
        },
      };

    case 'RESET_CONSENT':
      return {
        ...state,
        consent: DEFAULT_CONSENT_CONFIG.defaultConsent!,
        hasConsented: false,
        lastUpdated: 0,
        preferences: {
          allowAnalytics: false,
          allowMarketing: false,
          allowFunctional: false,
          allowPerformance: false,
        },
        showBanner: true,
      };

    default:
      return state;
  }
}

/**
 * Cookie consent context
 */
const CookieConsentContext = createContext<{
  state: ConsentState;
  actions: {
    grantConsent: (category: ConsentCategory) => void;
    denyConsent: (category: ConsentCategory) => void;
    grantAll: () => void;
    denyAll: () => void;
    acceptNecessaryOnly: () => void;
    updatePreferences: (preferences: Partial<ConsentState['preferences']>) => void;
    showBanner: () => void;
    hideBanner: () => void;
    showCustomize: () => void;
    hideCustomize: () => void;
    resetConsent: () => void;
    hasConsent: (category: ConsentCategory) => boolean;
    isConsentRequired: () => boolean;
  };
} | null>(null);

/**
 * Cookie consent provider
 */
export function CookieConsentProvider({
  children,
  config = DEFAULT_CONSENT_CONFIG,
  monitoring,
}: {
  children: ReactNode;
  config?: CookieConsentConfig;
  monitoring?: MonitoringContextValue;
}) {
  const [state, dispatch] = useReducer(consentReducer, {
    consent: config.defaultConsent!,
    hasConsented: false,
    lastUpdated: 0,
    region: 'unknown',
    showBanner: false,
    showCustomize: false,
    preferences: {
      allowAnalytics: false,
      allowMarketing: false,
      allowFunctional: false,
      allowPerformance: false,
    },
  });

  // Detect user region
  useEffect(() => {
    const detectRegion = async () => {
      try {
        // Simple region detection based on timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let region = 'unknown';
        
        if (timezone.includes('Europe') || timezone.includes('London') || timezone.includes('Paris')) {
          region = 'eu';
        } else if (timezone.includes('America') || timezone.includes('Los_Angeles') || timezone.includes('San_Francisco')) {
          region = 'california';
        }
        
        dispatch({ type: 'SET_REGION', region });
      } catch (error) {
        console.warn('Failed to detect region:', error);
      }
    };

    detectRegion();
  }, []);

  // Load saved consent from localStorage
  useEffect(() => {
    const loadConsent = () => {
      try {
        const savedConsent = localStorage.getItem('cookie_consent');
        const savedTimestamp = localStorage.getItem('cookie_consent_timestamp');
        
        if (savedConsent && savedTimestamp) {
          const consent = JSON.parse(savedConsent);
          const lastUpdated = parseInt(savedTimestamp, 10);
          const expirationDays = config.consentExpirationDays || 365;
          const isExpired = Date.now() - lastUpdated > expirationDays * 24 * 60 * 60 * 1000;
          
          if (!isExpired) {
            dispatch({ type: 'LOAD_CONSENT', consent, lastUpdated });
          } else {
            dispatch({ type: 'RESET_CONSENT' });
          }
        } else if (config.showBannerOnFirstVisit) {
          dispatch({ type: 'SHOW_BANNER' });
        }
      } catch (error) {
        console.warn('Failed to load consent from storage:', error);
        if (config.showBannerOnFirstVisit) {
          dispatch({ type: 'SHOW_BANNER' });
        }
      }
    };

    loadConsent();
  }, [config]);

  // Save consent to localStorage when updated
  useEffect(() => {
    if (state.hasConsented && state.lastUpdated > 0) {
      try {
        localStorage.setItem('cookie_consent', JSON.stringify(state.consent));
        localStorage.setItem('cookie_consent_timestamp', state.lastUpdated.toString());
      } catch (error) {
        console.warn('Failed to save consent to storage:', error);
      }
    }
  }, [state.consent, state.lastUpdated, state.hasConsented]);

  // Update monitoring based on consent changes
  useEffect(() => {
    if (monitoring) {
      // Enable/disable monitoring based on consent
      const hasMonitoringConsent = state.consent[ConsentCategory.ANALYTICS] === ConsentStatus.GRANTED;
      monitoring.setEnabled(hasMonitoringConsent);
      
      // Set user consent in monitoring
      monitoring.setUserConsent(hasMonitoringConsent);
      
      // Track consent changes for audit
      if (state.lastUpdated > 0) {
        monitoring.trackEvent({
          message: 'Cookie consent updated',
          category: 'privacy' as any,
          severity: 'info' as any,
          data: {
            consent: state.consent,
            region: state.region,
            timestamp: state.lastUpdated,
          },
        });
      }
    }
  }, [state.consent, state.lastUpdated, state.region, monitoring]);

  const actions = {
    grantConsent: (category: ConsentCategory) => {
      dispatch({ type: 'GRANT_CONSENT', category });
    },

    denyConsent: (category: ConsentCategory) => {
      dispatch({ type: 'DENY_CONSENT', category });
    },

    grantAll: () => {
      dispatch({ type: 'GRANT_ALL' });
    },

    denyAll: () => {
      dispatch({ type: 'DENY_ALL' });
    },

    acceptNecessaryOnly: () => {
      dispatch({ type: 'ACCEPT_NECESSARY_ONLY' });
    },

    updatePreferences: (preferences: Partial<ConsentState['preferences']>) => {
      dispatch({ type: 'UPDATE_PREFERENCES', preferences });
    },

    showBanner: () => {
      dispatch({ type: 'SHOW_BANNER' });
    },

    hideBanner: () => {
      dispatch({ type: 'HIDE_BANNER' });
    },

    showCustomize: () => {
      dispatch({ type: 'SHOW_CUSTOMIZE' });
    },

    hideCustomize: () => {
      dispatch({ type: 'HIDE_CUSTOMIZE' });
    },

    resetConsent: () => {
      dispatch({ type: 'RESET_CONSENT' });
    },

    hasConsent: (category: ConsentCategory) => {
      return state.consent[category] === ConsentStatus.GRANTED;
    },

    isConsentRequired: () => {
      // Check if consent is required based on region
      if (state.region === 'eu' && config.regionConfig?.eu?.requireExplicitConsent) {
        return true;
      }
      
      if (state.region === 'california' && config.regionConfig?.california?.privacyRights) {
        return true;
      }
      
      return !state.hasConsented;
    },
  };

  return (
    <CookieConsentContext.Provider value={{ state, actions }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

/**
 * Hook to use cookie consent
 */
export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }

  return context;
}

/**
 * Cookie consent banner component
 */
export function CookieConsentBanner() {
  const { state, actions } = useCookieConsent();
  const config = DEFAULT_CONSENT_CONFIG;

  if (!state.showBanner) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '20px',
        zIndex: 9999,
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
            {config.bannerContent?.title || 'Cookie Consent'}
          </h4>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
            {config.bannerContent?.description || 'We use cookies to enhance your experience and analyze our traffic.'}
            {config.cookiePolicyUrl && (
              <>
                {' '}
                <a
                  href={config.cookiePolicyUrl}
                  style={{ color: '#4a9eff', textDecoration: 'underline' }}
                >
                  Learn more
                </a>
              </>
            )}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={actions.grantAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {config.bannerContent?.acceptAllText || 'Accept All'}
          </button>
          
          <button
            onClick={actions.acceptNecessaryOnly}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid #666',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {config.bannerContent?.acceptNecessaryText || 'Accept Necessary Only'}
          </button>
          
          {config.allowGranularConsent && (
            <button
              onClick={actions.showCustomize}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#ccc',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline',
              }}
            >
              {config.bannerContent?.customizeText || 'Customize'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Cookie consent customization panel
 */
export function CookieConsentCustomize() {
  const { state, actions } = useCookieConsent();

  if (!state.showCustomize) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Cookie Preferences</h3>
        
        <div style={{ marginBottom: '20px' }}>
          {Object.entries(state.consent).map(([category, status]) => (
            <div key={category} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ flex: 1, color: '#333', fontSize: '14px' }}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
                {category === 'necessary' && ' (Required)'}
              </label>
              <input
                type="checkbox"
                checked={status === ConsentStatus.GRANTED}
                disabled={category === 'necessary'}
                onChange={(e) => {
                  if (e.target.checked) {
                    actions.grantConsent(category as ConsentCategory);
                  } else {
                    actions.denyConsent(category as ConsentCategory);
                  }
                }}
                style={{ marginLeft: '12px' }}
              />
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={actions.hideCustomize}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              actions.hideCustomize();
              actions.hideBanner();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check consent before performing actions
 */
export function useConsentGate(category: ConsentCategory) {
  const { actions } = useCookieConsent();
  
  return {
    hasConsent: actions.hasConsent(category),
    requireConsent: (callback: () => void) => {
      if (actions.hasConsent(category)) {
        callback();
      } else {
        actions.showBanner();
      }
    },
    requestConsent: () => {
      actions.showBanner();
    },
  };
}
