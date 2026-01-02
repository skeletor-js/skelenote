import { useMemo } from 'react';
import { platform } from '@tauri-apps/plugin-os';

export type Platform = 'macos' | 'windows' | 'linux' | 'unknown';

interface PlatformInfo {
  platform: Platform;
  isMacOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
  /** Height in pixels to reserve for window controls (traffic lights on macOS) */
  windowControlsHeight: number;
  /** Width in pixels to reserve for window controls (traffic lights on macOS) */
  windowControlsWidth: number;
}

/**
 * Hook for detecting the current platform and providing window control dimensions.
 *
 * Provides the height/width needed for window control clearance on each platform:
 * - macOS: Traffic lights in top-left (32px height, 80px width)
 * - Windows: Title bar controls in top-right (32px height)
 * - Linux: Similar to Windows (32px height)
 */
export function usePlatform(): PlatformInfo {
  // platform() is synchronous and returns the OS at compile time
  const currentPlatform = useMemo((): Platform => {
    const p = platform();
    if (p === 'macos') return 'macos';
    if (p === 'windows') return 'windows';
    if (p === 'linux') return 'linux';
    return 'unknown';
  }, []);

  const isMacOS = currentPlatform === 'macos';
  const isWindows = currentPlatform === 'windows';
  const isLinux = currentPlatform === 'linux';

  // Window control heights per platform
  // - macOS: 32px for traffic lights
  // - Windows: 32px for minimize/maximize/close buttons
  // - Linux: 32px (varies by DE, but 32px is a safe default)
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

  return {
    platform: currentPlatform,
    isMacOS,
    isWindows,
    isLinux,
    windowControlsHeight: getWindowControlsHeight(),
    windowControlsWidth: getWindowControlsWidth(),
  };
}
