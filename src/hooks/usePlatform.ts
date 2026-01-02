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
 * On macOS with overlay title bar, provides the height/width needed for
 * traffic light clearance. On other platforms, returns 0.
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

  // macOS traffic lights: ~38px height provides clearance without excessive gap
  // Traffic lights are ~12px diameter, positioned ~20px from top
  return {
    platform: currentPlatform,
    isMacOS,
    isWindows,
    isLinux,
    windowControlsHeight: isMacOS ? 38 : 0,
    windowControlsWidth: isMacOS ? 80 : 0,
  };
}
