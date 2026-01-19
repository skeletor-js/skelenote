/**
 * PostHog Initialization
 *
 * Configures PostHog for the Skelenote app with platform-specific settings.
 */

import posthog from 'posthog-js';
import type { Platform } from '@/hooks';

export interface PostHogConfig {
  apiKey: string;
  apiHost: string;
  enabled: boolean;
  platform: Platform;
}

/**
 * Initialize PostHog with the given configuration.
 * Returns true if initialization succeeded, false otherwise.
 */
export function initPostHog(config: PostHogConfig): boolean {
  const { apiKey, apiHost, enabled, platform } = config;

  if (!apiKey) {
    console.warn('[Analytics] PostHog API key not configured');
    return false;
  }

  const isMobile = platform === 'ios' || platform === 'android';

  console.log('[Analytics] Initializing PostHog...', {
    apiHost: apiHost || 'https://us.i.posthog.com',
    enabled,
    platform,
    keyPrefix: apiKey.substring(0, 4),
  });

  posthog.init(apiKey, {
    api_host: apiHost || 'https://us.i.posthog.com',

    // Disable features we don't need
    autocapture: false, // We'll track manually
    capture_pageview: false, // Not a traditional web app
    capture_pageleave: false,
    disable_session_recording: true, // No session replay

    // Persistence
    persistence: 'localStorage',

    // Start opted out if user previously disabled
    opt_out_capturing_by_default: !enabled,

    // Mobile-specific adjustments for battery life
    ...(isMobile && {
      request_batching: true,
    }),

    // Disable scroll properties on mobile (not relevant)
    disable_scroll_properties: isMobile,
  });

  return true;
}

/**
 * Get the PostHog instance.
 * Returns null if not initialized.
 */
export function getPostHog() {
  return posthog;
}
