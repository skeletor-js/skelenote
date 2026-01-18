/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as clipboard from '../mention-clipboard';

describe('Mention Clipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
    vi.clearAllMocks();
    sessionStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('copyMentionToClipboard', () => {
    it('should store data and write to clipboard', async () => {
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

    it('should return false when clipboard.writeText fails', async () => {
      // Mock clipboard to reject
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')),
        },
      });

      // Suppress console.error for this test
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const data = {
        objectId: 'obj-1',
        objectName: 'Obj 1',
        objectTypeId: 'type-1',
      };

      const result = await clipboard.copyMentionToClipboard(data);
      expect(result).toBe(false);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('should add timestamp to stored data', async () => {
      const beforeCopy = Date.now();

      const data = {
        objectId: 'obj-2',
        objectName: 'Obj 2',
        objectTypeId: 'type-2',
      };

      await clipboard.copyMentionToClipboard(data);

      const stored = sessionStorage.getItem('skelenote:pendingMention');
      const parsed = JSON.parse(stored!);

      expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeCopy);
      expect(parsed.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('getPendingMention', () => {
    it('should return stored data when valid', async () => {
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

    it('should return null when no data exists', () => {
      const retrieved = clipboard.getPendingMention();
      expect(retrieved).toBeNull();
    });

    it('should return null and clear storage when expired', () => {
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

    it('should return null and clear storage when JSON is invalid', () => {
      sessionStorage.setItem('skelenote:pendingMention', 'not valid json');

      const retrieved = clipboard.getPendingMention();
      expect(retrieved).toBeNull();
      expect(sessionStorage.getItem('skelenote:pendingMention')).toBeNull();
    });

    it('should return data at exactly the expiry boundary (> not >=)', () => {
      const data = {
        objectId: 'obj-1',
        objectName: 'Obj 1',
        objectTypeId: 'type-1',
        timestamp: Date.now() - 60000, // Exactly at the boundary (NOT expired since check is >)
      };
      sessionStorage.setItem('skelenote:pendingMention', JSON.stringify(data));

      const retrieved = clipboard.getPendingMention();
      // Since the check is `> EXPIRY_MS`, exactly 60000ms is NOT expired
      expect(retrieved).toEqual(data);
    });

    it('should return data when just before expiry', () => {
      const data = {
        objectId: 'obj-1',
        objectName: 'Obj 1',
        objectTypeId: 'type-1',
        timestamp: Date.now() - 59999, // Just under 1 minute
      };
      sessionStorage.setItem('skelenote:pendingMention', JSON.stringify(data));

      const retrieved = clipboard.getPendingMention();
      expect(retrieved).toEqual(data);
    });
  });

  describe('isMentionClipboardText', () => {
    it('should return true for valid mention format', () => {
      expect(clipboard.isMentionClipboardText('@[[skelenote:123]]')).toBe(true);
    });

    it('should return true for valid format with complex ID', () => {
      expect(
        clipboard.isMentionClipboardText('@[[skelenote:abc-def-123-xyz]]')
      ).toBe(true);
    });

    it('should return false for non-mention text', () => {
      expect(clipboard.isMentionClipboardText('something else')).toBe(false);
    });

    it('should return false for partial prefix match', () => {
      expect(clipboard.isMentionClipboardText('@[[skelenote:123')).toBe(false);
    });

    it('should return false for wrong prefix', () => {
      expect(clipboard.isMentionClipboardText('[[skelenote:123]]')).toBe(false);
    });

    it('should return false for wrong suffix', () => {
      expect(clipboard.isMentionClipboardText('@[[skelenote:123]')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(clipboard.isMentionClipboardText('')).toBe(false);
    });
  });

  describe('clearPendingMention', () => {
    it('should clear stored mention data', () => {
      sessionStorage.setItem('skelenote:pendingMention', 'some data');
      expect(sessionStorage.getItem('skelenote:pendingMention')).toBeTruthy();

      clipboard.clearPendingMention();
      expect(sessionStorage.getItem('skelenote:pendingMention')).toBeNull();
    });

    it('should not throw when nothing to clear', () => {
      expect(() => clipboard.clearPendingMention()).not.toThrow();
    });
  });
});
