/**
 * Mention Clipboard Utility
 *
 * Manages copying/pasting mentions between FindSimilar and the Editor.
 * Uses a combination of clipboard text (for user feedback) and sessionStorage
 * (for the actual mention data) to enable paste-as-mention functionality.
 */

export interface MentionClipboardData {
  objectId: string;
  objectName: string;
  objectTypeId: string;
  timestamp: number;
}

const STORAGE_KEY = 'skelenote:pendingMention';
const CLIPBOARD_PREFIX = '@[[skelenote:';
const CLIPBOARD_SUFFIX = ']]';
const EXPIRY_MS = 60000; // 1 minute expiry

/**
 * Copy mention data to clipboard and storage.
 * The clipboard will contain a special format that the editor can recognize.
 */
export async function copyMentionToClipboard(
  data: Omit<MentionClipboardData, 'timestamp'>
): Promise<boolean> {
  const mentionData: MentionClipboardData = {
    ...data,
    timestamp: Date.now(),
  };

  // Store in sessionStorage for the editor to retrieve
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mentionData));

  // Copy a special format to clipboard that includes the marker
  // This allows the editor to recognize it as a mention paste
  const clipboardText = `${CLIPBOARD_PREFIX}${data.objectId}${CLIPBOARD_SUFFIX}`;

  try {
    await navigator.clipboard.writeText(clipboardText);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Check if clipboard text is a Skelenote mention marker.
 */
export function isMentionClipboardText(text: string): boolean {
  return text.startsWith(CLIPBOARD_PREFIX) && text.endsWith(CLIPBOARD_SUFFIX);
}

/**
 * Get pending mention data if it exists and hasn't expired.
 * Returns null if no pending mention or if it has expired.
 */
export function getPendingMention(): MentionClipboardData | null {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored) as MentionClipboardData;

    // Check if expired
    if (Date.now() - data.timestamp > EXPIRY_MS) {
      clearPendingMention();
      return null;
    }

    return data;
  } catch {
    clearPendingMention();
    return null;
  }
}

/**
 * Clear pending mention data.
 */
export function clearPendingMention(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
