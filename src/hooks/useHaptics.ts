/**
 * Haptic feedback hook for mobile platforms
 *
 * Provides tactile feedback via native iOS/Android haptic APIs through Tauri.
 * Falls back to no-op on desktop platforms.
 */

import { invoke } from '@tauri-apps/api/core';
import { useCallback } from 'react';
import { usePlatform } from './usePlatform';

/**
 * Impact feedback styles
 * - light: Subtle tap feedback (swipe threshold, selection)
 * - medium: Standard feedback (task complete, action triggered)
 * - heavy: Strong feedback (long-press detected, important action)
 * - soft: Gentle feedback (iOS 13+, softer than light)
 * - rigid: Sharp feedback (iOS 13+, more pronounced)
 */
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';

/**
 * Notification feedback types
 * - success: Positive outcome (unlock, save complete)
 * - warning: Cautionary action (delete confirmation)
 * - error: Negative outcome (auth failure, error)
 */
export type HapticNotification = 'success' | 'warning' | 'error';

export interface UseHapticsResult {
  /**
   * Trigger impact feedback with specified intensity.
   * Use for physical interactions like taps, swipes, toggles.
   */
  impact: (style?: HapticStyle) => Promise<void>;

  /**
   * Trigger notification feedback for outcome indication.
   * Use for success, warning, or error states.
   */
  notification: (type: HapticNotification) => Promise<void>;

  /**
   * Trigger selection feedback.
   * Use for selection changes, picker scrolling, day selection.
   * Lightest haptic, for continuous feedback during gestures.
   */
  selection: () => Promise<void>;

  /** Whether haptics are available on this platform */
  isAvailable: boolean;
}

/**
 * Hook for haptic feedback on mobile platforms.
 *
 * Provides impact, notification, and selection haptics through Tauri commands.
 * Silently no-ops on desktop platforms or when haptics fail.
 *
 * @example
 * ```tsx
 * function TaskCheckbox({ checked, onChange }) {
 *   const { impact } = useHaptics();
 *
 *   const handleToggle = async () => {
 *     await impact('medium');
 *     onChange(!checked);
 *   };
 *
 *   return <Checkbox checked={checked} onChange={handleToggle} />;
 * }
 * ```
 */
export function useHaptics(): UseHapticsResult {
  const { isMobile } = usePlatform();

  const impact = useCallback(
    async (style: HapticStyle = 'medium') => {
      if (!isMobile) return;
      try {
        await invoke('haptic_impact', { style });
      } catch {
        // Silently fail - haptics are enhancement, not critical
      }
    },
    [isMobile]
  );

  const notification = useCallback(
    async (type: HapticNotification) => {
      if (!isMobile) return;
      try {
        await invoke('haptic_notification', { notificationType: type });
      } catch {
        // Silently fail
      }
    },
    [isMobile]
  );

  const selection = useCallback(async () => {
    if (!isMobile) return;
    try {
      await invoke('haptic_selection');
    } catch {
      // Silently fail
    }
  }, [isMobile]);

  return {
    impact,
    notification,
    selection,
    isAvailable: isMobile,
  };
}
