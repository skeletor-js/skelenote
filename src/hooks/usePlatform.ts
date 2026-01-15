import { useMemo, useState, useEffect } from 'react';
import { platform } from '@tauri-apps/plugin-os';

export type Platform =
  | 'macos'
  | 'windows'
  | 'linux'
  | 'ios'
  | 'android'
  | 'unknown';

interface PlatformInfo {
  platform: Platform;
  isMacOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  /** True if running on iOS or Android */
  isMobile: boolean;
  /** True if running on macOS, Windows, or Linux */
  isDesktop: boolean;
  /** Height in pixels to reserve for window controls (traffic lights on macOS) */
  windowControlsHeight: number;
  /** Width in pixels to reserve for window controls (traffic lights on macOS) */
  windowControlsWidth: number;
  /** Safe area inset for iOS notch/dynamic island (top) */
  safeAreaTop: number;
  /** Safe area inset for iOS home indicator (bottom) */
  safeAreaBottom: number;
}

/**
 * Detect iOS using multiple fallback methods
 */
function detectPlatform(): Platform {
  try {
    const p = platform();
    if (p === 'macos') return 'macos';
    if (p === 'windows') return 'windows';
    if (p === 'linux') return 'linux';
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
  } catch {
    // Tauri plugin failed, try fallback detection
  }

  // Fallback: Check for iOS-specific features
  if (typeof window !== 'undefined') {
    // Check if we're in a standalone iOS app (Tauri WKWebView)
    const ua = navigator.userAgent.toLowerCase();
    if (
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    ) {
      return 'ios';
    }
    if (/android/.test(ua)) {
      return 'android';
    }
  }

  return 'unknown';
}

/**
 * Hook for detecting the current platform and providing window control dimensions.
 *
 * Provides the height/width needed for window control clearance on each platform:
 * - macOS: Traffic lights in top-left (32px height, 80px width)
 * - Windows: Title bar controls in top-right (32px height)
 * - Linux: Similar to Windows (32px height)
 * - iOS: Safe area insets for notch (47px top) and home indicator (34px bottom)
 * - Android: Status bar height (24px)
 */
export function usePlatform(): PlatformInfo {
  const currentPlatform = useMemo((): Platform => {
    return detectPlatform();
  }, []);

  const isMacOS = currentPlatform === 'macos';
  const isWindows = currentPlatform === 'windows';
  const isLinux = currentPlatform === 'linux';
  const isIOS = currentPlatform === 'ios';
  const isAndroid = currentPlatform === 'android';
  const isMobile = isIOS || isAndroid;
  const isDesktop = isMacOS || isWindows || isLinux;

  // Window control heights per platform
  // - macOS: 32px for traffic lights
  // - Windows: 32px for minimize/maximize/close buttons
  // - Linux: 32px (varies by DE, but 32px is a safe default)
  // - iOS/Android: 0 (no window controls)
  const getWindowControlsHeight = (): number => {
    if (isMacOS) return 32;
    if (isWindows) return 32;
    if (isLinux) return 32;
    return 0;
  };

  // Width only matters on macOS where traffic lights are in the content area
  const getWindowControlsWidth = (): number => {
    if (isMacOS) return 80;
    return 0;
  };

  // Safe area insets - try to read from CSS env() with fallbacks
  const [safeAreaTop, setSafeAreaTop] = useState(() => {
    if (isIOS) return 47; // iPhone with notch/dynamic island
    if (isAndroid) return 24; // Status bar
    return 0;
  });

  const [safeAreaBottom, setSafeAreaBottom] = useState(() => {
    if (isIOS) return 34; // Home indicator
    return 0;
  });

  // Read actual safe area values from CSS env() on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create a temporary element to read CSS env() values
    const testEl = document.createElement('div');
    testEl.style.cssText = `
      position: fixed;
      top: env(safe-area-inset-top, 0px);
      bottom: env(safe-area-inset-bottom, 0px);
      visibility: hidden;
      pointer-events: none;
    `;
    document.body.appendChild(testEl);

    // Read computed values
    const computedStyle = getComputedStyle(testEl);
    const top = parseInt(computedStyle.top, 10);
    const bottom = parseInt(computedStyle.bottom, 10);

    // Only update if we got valid values from env()
    if (!isNaN(top) && top > 0) {
      setSafeAreaTop(top);
    }
    if (!isNaN(bottom) && bottom > 0) {
      setSafeAreaBottom(bottom);
    }

    document.body.removeChild(testEl);
  }, []);

  return {
    platform: currentPlatform,
    isMacOS,
    isWindows,
    isLinux,
    isIOS,
    isAndroid,
    isMobile,
    isDesktop,
    windowControlsHeight: getWindowControlsHeight(),
    windowControlsWidth: getWindowControlsWidth(),
    safeAreaTop,
    safeAreaBottom,
  };
}
