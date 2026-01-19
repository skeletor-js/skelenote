/**
 * Feature Flag Component
 *
 * Conditionally renders children based on a PostHog feature flag.
 * Falls back to fallback content when analytics is disabled or flag is off.
 */

import type { ReactNode } from 'react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useAnalyticsSafe } from '@/contexts';

export interface FeatureFlagProps {
  /** The feature flag key in PostHog */
  flag: string;
  /** Content to render when flag is enabled */
  children: ReactNode;
  /** Content to render when flag is disabled or analytics is off */
  fallback?: ReactNode;
}

/**
 * Renders children only when the specified feature flag is enabled.
 *
 * If analytics is disabled, shows fallback (conservative approach).
 * While loading, shows fallback to prevent flicker.
 */
export function FeatureFlag({
  flag,
  children,
  fallback = null,
}: FeatureFlagProps) {
  const analytics = useAnalyticsSafe();
  const isEnabled = useFeatureFlagEnabled(flag);

  // If analytics is disabled, show fallback (conservative approach)
  if (!analytics?.isEnabled) {
    return <>{fallback}</>;
  }

  // Loading state - show fallback to prevent flicker
  if (isEnabled === undefined) {
    return <>{fallback}</>;
  }

  return isEnabled ? <>{children}</> : <>{fallback}</>;
}
