/**
 * Data migration for skelenote
 *
 * Migrates localStorage keys from legacy naming convention to current one.
 * This preserves user settings and data when upgrading.
 */

const KEY_MIGRATIONS: [string, string][] = [
  ['ephemera-theme', 'skelenote-theme'],
  ['ephemera:firstRunComplete', 'skelenote:firstRunComplete'],
  ['ephemera:userId', 'skelenote:userId'],
  ['ephemera:deviceId', 'skelenote:deviceId'],
  ['ephemera:syncServerUrl', 'skelenote:syncServerUrl'],
];

/**
 * Migrate localStorage keys from legacy naming to skelenote naming
 * - Only migrates if old key exists and new key doesn't
 * - Removes old keys after migration
 */
export function migrateLocalStorageKeys(): void {
  for (const [oldKey, newKey] of KEY_MIGRATIONS) {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, oldValue);
      localStorage.removeItem(oldKey);
    }
  }
}
