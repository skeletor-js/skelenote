/**
 * Analytics Context
 *
 * Manages PostHog analytics with opt-out support.
 * Analytics is enabled by default; users can disable in Settings > Privacy.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { usePlatform, type Platform } from '@/hooks/usePlatform';
import { initPostHog } from '@/lib/analytics';

const STORAGE_KEY = 'skelenote:analyticsEnabled';

interface AnalyticsContextValue {
  /** Whether analytics is enabled (opt-out model: true by default) */
  isEnabled: boolean;
  /** Enable analytics tracking */
  enable: () => void;
  /** Disable analytics tracking (opt-out) */
  disable: () => void;
  /** Track a custom event */
  track: (event: string, properties?: Record<string, unknown>) => void;
  /** Check if a feature flag is enabled */
  isFeatureEnabled: (flag: string) => boolean;
  /** Get feature flag variant key */
  getFeatureFlagVariant: (flag: string) => string | boolean | undefined;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

/**
 * Get initial enabled state from localStorage.
 * Defaults to true (opt-out model).
 */
function getInitialEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    // If never set, default to enabled (opt-out)
    if (stored === null) return true;
    return stored === 'true';
  }
  return true;
}

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [isEnabled, setIsEnabled] = useState(getInitialEnabled);
  const [isInitialized, setIsInitialized] = useState(false);
  const { platform, isMobile } = usePlatform();
  const platformRef = useRef<Platform>(platform);

  // Keep platform ref updated
  useEffect(() => {
    platformRef.current = platform;
  }, [platform]);

  // Initialize PostHog on mount
  useEffect(() => {
    const apiKey = import.meta.env.VITE_POSTHOG_KEY;
    const apiHost = import.meta.env.VITE_POSTHOG_HOST;

    if (!apiKey) {
      console.warn('[Analytics] PostHog API key not configured');
      return;
    }

    const success = initPostHog({
      apiKey,
      apiHost,
      enabled: isEnabled,
      platform,
    });

    if (success) {
      setIsInitialized(true);

      // Set super properties that will be sent with every event
      posthog.register({
        $platform: platform,
        $is_mobile: isMobile,
        $app_version:
          typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const enable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsEnabled(true);

    if (isInitialized) {
      posthog.opt_in_capturing();
    }
  }, [isInitialized]);

  const disable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'false');
    setIsEnabled(false);

    if (isInitialized) {
      posthog.opt_out_capturing();
    }
  }, [isInitialized]);

  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      if (!isEnabled || !isInitialized) return;

      posthog.capture(event, {
        ...properties,
        // Include current platform in case it changed
        $platform: platformRef.current,
      });
    },
    [isEnabled, isInitialized]
  );

  const isFeatureEnabled = useCallback(
    (flag: string): boolean => {
      if (!isEnabled || !isInitialized) return false;
      return posthog.isFeatureEnabled(flag) ?? false;
    },
    [isEnabled, isInitialized]
  );

  const getFeatureFlagVariant = useCallback(
    (flag: string): string | boolean | undefined => {
      if (!isEnabled || !isInitialized) return undefined;
      return posthog.getFeatureFlag(flag);
    },
    [isEnabled, isInitialized]
  );

  const value: AnalyticsContextValue = {
    isEnabled,
    enable,
    disable,
    track,
    isFeatureEnabled,
    getFeatureFlagVariant,
  };

  // Wrap with PostHogProvider for React hooks
  if (isInitialized) {
    return (
      <AnalyticsContext.Provider value={value}>
        <PostHogProvider client={posthog}>{children}</PostHogProvider>
      </AnalyticsContext.Provider>
    );
  }

  // Not initialized yet, just provide context without PostHog
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnalyticsSafe(): AnalyticsContextValue | null {
  return useContext(AnalyticsContext);
}
