/**
 * Device ID Management
 *
 * Generates and persists unique device and user IDs for sync.
 */

const USER_ID_KEY = 'ephemera:userId';
const DEVICE_ID_KEY = 'ephemera:deviceId';

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
 * Get or create a persistent device ID
 * Device ID is unique per device/browser
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
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
