/**
 * App Icon Switching Hook
 *
 * Provides runtime app icon switching across platforms:
 * - macOS: Changes dock icon (session only)
 * - iOS: Changes home screen icon (persistent, shows system prompt)
 * - Android: Changes launcher icon (persistent)
 * - Windows/Linux: Not supported
 */

import { invoke } from '@tauri-apps/api/core';
import { useState, useCallback, useEffect } from 'react';

/** Storage key for persisted icon preference */
const STORAGE_KEY = 'skelenote-app-icon';

/** Android JavaScript bridge interface (injected by MainActivity.kt) */
interface AndroidIconBridge {
  setIcon: (iconName: string) => void;
  getCurrentIcon: () => string;
}

interface AndroidWindow extends Window {
  AndroidIconBridge?: AndroidIconBridge;
}

/** Available icon variants */
export type IconId = 'dark' | 'light';

/** Icon variant info from Rust backend */
export interface IconVariant {
  id: string;
  name: string;
}

export interface UseAppIconResult {
  /** Currently selected icon ID */
  currentIcon: IconId;

  /** Change the app icon */
  changeIcon: (iconId: IconId) => Promise<void>;

  /** Whether an icon change is in progress */
  isChanging: boolean;

  /** Whether icon switching is supported on this platform */
  isSupported: boolean;

  /** Available icon variants */
  variants: IconVariant[];

  /** Any error from the last icon change attempt */
  error: string | null;
}

/**
 * Hook for app icon switching.
 *
 * Persists the user's icon preference to localStorage and calls the Tauri
 * backend to change the actual app icon on supported platforms.
 *
 * @example
 * ```tsx
 * function IconSettings() {
 *   const { currentIcon, changeIcon, isSupported, variants } = useAppIcon();
 *
 *   if (!isSupported) {
 *     return <Text>Icon switching not supported on this platform</Text>;
 *   }
 *
 *   return (
 *     <Group>
 *       {variants.map(v => (
 *         <IconPreview
 *           key={v.id}
 *           variant={v}
 *           selected={currentIcon === v.id}
 *           onClick={() => changeIcon(v.id)}
 *         />
 *       ))}
 *     </Group>
 *   );
 * }
 * ```
 */
export function useAppIcon(): UseAppIconResult {
  const [currentIcon, setCurrentIcon] = useState<IconId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as IconId) || 'dark';
  });
  const [isChanging, setIsChanging] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [variants, setVariants] = useState<IconVariant[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check platform support and load variants on mount
  useEffect(() => {
    const init = async () => {
      try {
        const supported = await invoke<boolean>('is_icon_switching_supported');
        setIsSupported(supported);

        const availableVariants = await invoke<IconVariant[]>(
          'get_available_icons'
        );
        setVariants(availableVariants);
      } catch (e) {
        console.warn('[useAppIcon] Failed to initialize:', e);
        setIsSupported(false);
      }
    };
    init();
  }, []);

  const changeIcon = useCallback(
    async (iconId: IconId) => {
      if (iconId === currentIcon) return;

      setIsChanging(true);
      setError(null);

      try {
        // Call Rust backend (handles macOS and iOS)
        await invoke('set_app_icon', { iconName: iconId });

        // On Android, also call the JavaScript bridge for immediate icon switch
        // The bridge is injected by MainActivity.kt
        if (typeof window !== 'undefined' && 'AndroidIconBridge' in window) {
          const bridge = (window as AndroidWindow).AndroidIconBridge;
          if (bridge && typeof bridge.setIcon === 'function') {
            bridge.setIcon(iconId);
          }
        }

        localStorage.setItem(STORAGE_KEY, iconId);
        setCurrentIcon(iconId);
      } catch (e) {
        const errorMsg =
          e instanceof Error ? e.message : 'Failed to change icon';
        setError(errorMsg);
        console.error('[useAppIcon] Failed to change icon:', e);
      } finally {
        setIsChanging(false);
      }
    },
    [currentIcon]
  );

  return {
    currentIcon,
    changeIcon,
    isChanging,
    isSupported,
    variants,
    error,
  };
}
