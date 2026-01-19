/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoist mocks so they're available before imports
const mockPosthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getFeatureFlag: vi.fn(),
  register: vi.fn(),
}));

// Mock posthog-js
vi.mock('posthog-js', () => ({
  default: mockPosthog,
}));

// Mock PostHogProvider
vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useFeatureFlagEnabled: vi.fn(),
}));

// Mock usePlatform hook
vi.mock('@/hooks/usePlatform', () => ({
  usePlatform: () => ({
    platform: 'macos',
    isMobile: false,
    isDesktop: true,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  }),
}));

// Mock initPostHog
vi.mock('@/lib/analytics', () => ({
  initPostHog: vi.fn(() => true),
}));

import {
  AnalyticsProvider,
  useAnalytics,
  useAnalyticsSafe,
} from '../AnalyticsContext';

const STORAGE_KEY = 'skelenote:analyticsEnabled';

describe('AnalyticsContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AnalyticsProvider>{children}</AnalyticsProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Mock import.meta.env
    vi.stubEnv('VITE_POSTHOG_KEY', 'test-api-key');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://test.posthog.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('initialization', () => {
    it('should initialize with analytics enabled by default (opt-out model)', () => {
      const { result } = renderHook(() => useAnalytics(), { wrapper });
      expect(result.current.isEnabled).toBe(true);
    });

    it('should load enabled state from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      const { result } = renderHook(() => useAnalytics(), { wrapper });
      expect(result.current.isEnabled).toBe(false);
    });

    it('should default to true when localStorage value is not set', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useAnalytics(), { wrapper });
      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('enable/disable', () => {
    it('should disable analytics and persist to localStorage', () => {
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      act(() => {
        result.current.disable();
      });

      expect(result.current.isEnabled).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('should enable analytics and persist to localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      act(() => {
        result.current.enable();
      });

      expect(result.current.isEnabled).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should call posthog.opt_out_capturing when disabled', async () => {
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      // Wait for initialization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      act(() => {
        result.current.disable();
      });

      expect(mockPosthog.opt_out_capturing).toHaveBeenCalled();
    });

    it('should call posthog.opt_in_capturing when enabled', async () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      // Wait for initialization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      act(() => {
        result.current.enable();
      });

      expect(mockPosthog.opt_in_capturing).toHaveBeenCalled();
    });
  });

  describe('track', () => {
    it('should track events when analytics is enabled', async () => {
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      // Wait for initialization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      act(() => {
        result.current.track('test_event', { foo: 'bar' });
      });

      expect(mockPosthog.capture).toHaveBeenCalledWith('test_event', {
        foo: 'bar',
        $platform: 'macos',
      });
    });

    it('should not track events when analytics is disabled', async () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      // Wait for initialization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      act(() => {
        result.current.track('test_event', { foo: 'bar' });
      });

      expect(mockPosthog.capture).not.toHaveBeenCalled();
    });
  });

  describe('feature flags', () => {
    it('should check if feature flag is enabled', async () => {
      mockPosthog.isFeatureEnabled.mockReturnValue(true);
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      // Wait for initialization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const isEnabled = result.current.isFeatureEnabled('test-flag');

      expect(isEnabled).toBe(true);
      expect(mockPosthog.isFeatureEnabled).toHaveBeenCalledWith('test-flag');
    });

    it('should return false for feature flags when analytics is disabled', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      const isEnabled = result.current.isFeatureEnabled('test-flag');

      expect(isEnabled).toBe(false);
    });

    it('should get feature flag variant', async () => {
      mockPosthog.getFeatureFlag.mockReturnValue('variant-a');
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      // Wait for initialization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const variant = result.current.getFeatureFlagVariant('test-flag');

      expect(variant).toBe('variant-a');
      expect(mockPosthog.getFeatureFlag).toHaveBeenCalledWith('test-flag');
    });

    it('should return undefined for feature flag variant when analytics is disabled', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      const variant = result.current.getFeatureFlagVariant('test-flag');

      expect(variant).toBeUndefined();
    });
  });

  describe('hooks', () => {
    it('should throw error when useAnalytics is used outside provider', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      expect(() => renderHook(() => useAnalytics())).toThrow(
        'useAnalytics must be used within an AnalyticsProvider'
      );
      consoleSpy.mockRestore();
    });

    it('should return null when useAnalyticsSafe is used outside provider', () => {
      const { result } = renderHook(() => useAnalyticsSafe());
      expect(result.current).toBeNull();
    });

    it('should return context value when useAnalyticsSafe is used within provider', () => {
      const { result } = renderHook(() => useAnalyticsSafe(), { wrapper });
      expect(result.current).not.toBeNull();
      expect(result.current?.isEnabled).toBe(true);
    });
  });
});
