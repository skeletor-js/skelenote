/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as clipboard from '../mention-clipboard';

describe('Mention Clipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copyMentionToClipboard should store data and write to clipboard', async () => {
    const data = {
      objectId: 'obj-1',
      objectName: 'Obj 1',
      objectTypeId: 'type-1',
    };

    const result = await clipboard.copyMentionToClipboard(data);
    expect(result).toBe(true);

    // Check clipboard
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('@[[skelenote:obj-1]]')
    );

    // Check storage
    const stored = sessionStorage.getItem('skelenote:pendingMention');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.objectId).toBe('obj-1');
    expect(parsed.timestamp).toBeDefined();
  });

  it('getPendingMention should return stored data', async () => {
    const data = {
      objectId: 'obj-1',
      objectName: 'Obj 1',
      objectTypeId: 'type-1',
      timestamp: Date.now(),
    };
    sessionStorage.setItem('skelenote:pendingMention', JSON.stringify(data));

    const retrieved = clipboard.getPendingMention();
    expect(retrieved).toEqual(data);
  });

  it('getPendingMention should return null if expired', () => {
    const data = {
      objectId: 'obj-1',
      objectName: 'Obj 1',
      objectTypeId: 'type-1',
      timestamp: Date.now() - 60001, // 1 min and 1ms ago
    };
    sessionStorage.setItem('skelenote:pendingMention', JSON.stringify(data));

    const retrieved = clipboard.getPendingMention();
    expect(retrieved).toBeNull();
    expect(sessionStorage.getItem('skelenote:pendingMention')).toBeNull();
  });

  it('isMentionClipboardText should identify valid format', () => {
    expect(clipboard.isMentionClipboardText('@[[skelenote:123]]')).toBe(true);
    expect(clipboard.isMentionClipboardText('something else')).toBe(false);
  });
});
