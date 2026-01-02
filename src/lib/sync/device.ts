/**
 * Device ID Management
 *
 * Generates and persists unique device and user IDs for sync.
 * In Tauri mode, device IDs are persisted via Stronghold for consistency.
 */

import { invoke } from '@tauri-apps/api/core';

const USER_ID_KEY = 'skelenote:userId';
const DEVICE_ID_KEY = 'skelenote:deviceId';

// Cache for the Tauri device ID after sync
let cachedTauriDeviceId: string | null = null;

/**
 * Generate a random UUID v4
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get or create a persistent user ID
 * User ID is shared across all devices for the same user
 */
export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Set the user ID (for importing from another device)
 */
export function setUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

/**
 * Synchronize device ID with Tauri's persistent storage
 *
 * Should be called after crypto_init to ensure consistent device ID
 * across app restarts. Returns the synchronized device ID.
 */
export async function syncDeviceId(): Promise<string> {
  try {
    const deviceId = await invoke<string>('network_sync_device_id');
    cachedTauriDeviceId = deviceId;
    // Also sync to localStorage for compatibility
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch (error) {
    console.warn('[Device] Failed to sync device ID with Tauri:', error);
    // Fall back to localStorage
    return getLocalDeviceId();
  }
}

/**
 * Get device ID from localStorage (fallback/web mode)
 */
function getLocalDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get the device ID synchronously
 *
 * Returns the cached Tauri device ID if available, otherwise falls back
 * to localStorage. For best results, call syncDeviceId() after crypto_init.
 */
export function getDeviceId(): string {
  // Return cached Tauri ID if available
  if (cachedTauriDeviceId) {
    return cachedTauriDeviceId;
  }
  // Fall back to localStorage
  return getLocalDeviceId();
}

/**
 * Get device ID asynchronously from Tauri
 *
 * Fetches the current device ID from Tauri. Use this when you need
 * the most up-to-date device ID from the Rust backend.
 */
export async function getDeviceIdAsync(): Promise<string> {
  try {
    const deviceId = await invoke<string>('network_get_device_id');
    cachedTauriDeviceId = deviceId;
    return deviceId;
  } catch {
    // Fall back to localStorage
    return getLocalDeviceId();
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
