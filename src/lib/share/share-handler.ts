/**
 * Share Handler
 * Processes content shared from other apps via iOS Share Extension or Android Share Intent
 *
 * Platform-specific storage:
 * - iOS: App Groups UserDefaults (group.com.skelenote.app)
 * - Android: SharedPreferences (skelenote_shares)
 */

import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';

export interface PendingShare {
  /** Type of shared content */
  type: 'url' | 'text';
  /** URL if type is 'url' */
  url?: string;
  /** Text content or note accompanying URL */
  text?: string;
  /** Unix timestamp when share was created */
  timestamp: number;
}

/**
 * Read pending shares from platform-specific storage
 * iOS: Reads from App Groups UserDefaults
 * Android: Reads from SharedPreferences
 *
 * @returns Array of pending shares, empty if none or error
 */
export async function getPendingShares(): Promise<PendingShare[]> {
  try {
    const currentPlatform = await platform();

    if (currentPlatform === 'ios') {
      return await invoke<PendingShare[]>('share_get_pending_ios');
    } else if (currentPlatform === 'android') {
      return await invoke<PendingShare[]>('share_get_pending_android');
    }

    // Desktop - no share extension
    return [];
  } catch (error) {
    console.warn('[ShareHandler] Failed to get pending shares:', error);
    return [];
  }
}

/**
 * Clear all pending shares after processing
 */
export async function clearPendingShares(): Promise<void> {
  try {
    const currentPlatform = await platform();

    if (currentPlatform === 'ios') {
      await invoke('share_clear_pending_ios');
    } else if (currentPlatform === 'android') {
      await invoke('share_clear_pending_android');
    }
  } catch (error) {
    console.warn('[ShareHandler] Failed to clear pending shares:', error);
  }
}

/**
 * Check if text looks like a URL
 */
export function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract a title from a URL (uses domain as fallback)
 */
export function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}
