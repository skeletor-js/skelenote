/**
 * Sync Configuration Management
 *
 * Persists sync server configuration to localStorage.
 */

const SYNC_SERVER_URL_KEY = 'skelenote:syncServerUrl';

export interface SyncServerConfig {
  serverUrl: string;
}

/**
 * Get the saved sync server URL
 */
export function getSyncServerUrl(): string | null {
  return localStorage.getItem(SYNC_SERVER_URL_KEY);
}

/**
 * Save the sync server URL
 */
export function setSyncServerUrl(url: string): void {
  localStorage.setItem(SYNC_SERVER_URL_KEY, url);
}

/**
 * Clear the sync server URL
 */
export function clearSyncServerUrl(): void {
  localStorage.removeItem(SYNC_SERVER_URL_KEY);
}

/**
 * Clear all sync-related settings from localStorage
 * Call this when resetting or changing skeleton key
 */
export function clearAllSyncSettings(): void {
  localStorage.removeItem(SYNC_SERVER_URL_KEY);
  localStorage.removeItem('skelenote:userId');
  localStorage.removeItem('skelenote:deviceId');
}

/**
 * Validate a WebSocket URL
 */
export function isValidWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}
