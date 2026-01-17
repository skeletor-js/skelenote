/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockInvoke = vi.fn();
const mockPlatform = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: () => mockPlatform(),
}));

import {
  getPendingShares,
  clearPendingShares,
  isUrl,
  extractTitleFromUrl,
} from '../share-handler';

describe('share-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPendingShares', () => {
    it('should get shares on iOS', async () => {
      mockPlatform.mockResolvedValue('ios');
      const mockShares = [{ type: 'text', text: 'shared', timestamp: 123 }];
      mockInvoke.mockResolvedValue(mockShares);

      const result = await getPendingShares();

      expect(mockPlatform).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalledWith('share_get_pending_ios');
      expect(result).toEqual(mockShares);
    });

    it('should get shares on Android', async () => {
      mockPlatform.mockResolvedValue('android');
      const mockShares = [
        { type: 'url', url: 'https://example.com', timestamp: 456 },
      ];
      mockInvoke.mockResolvedValue(mockShares);

      const result = await getPendingShares();

      expect(mockPlatform).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalledWith('share_get_pending_android');
      expect(result).toEqual(mockShares);
    });

    it('should return empty array on desktop', async () => {
      mockPlatform.mockResolvedValue('macos');

      const result = await getPendingShares();

      expect(mockPlatform).toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockPlatform.mockRejectedValue(new Error('Platform error'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await getPendingShares();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get pending shares'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('clearPendingShares', () => {
    it('should clear shares on iOS', async () => {
      mockPlatform.mockResolvedValue('ios');

      await clearPendingShares();

      expect(mockInvoke).toHaveBeenCalledWith('share_clear_pending_ios');
    });

    it('should clear shares on Android', async () => {
      mockPlatform.mockResolvedValue('android');

      await clearPendingShares();

      expect(mockInvoke).toHaveBeenCalledWith('share_clear_pending_android');
    });

    it('should do nothing on desktop', async () => {
      mockPlatform.mockResolvedValue('windows');

      await clearPendingShares();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPlatform.mockResolvedValue('ios');
      mockInvoke.mockRejectedValue(new Error('Clear error'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await clearPendingShares();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear pending shares'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('isUrl', () => {
    it('should return true for valid HTTP/HTTPS URLs', () => {
      expect(isUrl('https://google.com')).toBe(true);
      expect(isUrl('http://example.org/page')).toBe(true);
    });

    it('should return false for non-URLs or other protocols', () => {
      expect(isUrl('not a url')).toBe(false);
      expect(isUrl('ftp://server.com')).toBe(false); // only http/s allowed by implementation
      expect(isUrl('')).toBe(false);
    });
  });

  describe('extractTitleFromUrl', () => {
    it('should extract hostname as title', () => {
      expect(extractTitleFromUrl('https://www.google.com/search')).toBe(
        'google.com'
      );
      expect(extractTitleFromUrl('http://example.org/path?q=1')).toBe(
        'example.org'
      );
    });

    it('should return original string if invalid URL', () => {
      expect(extractTitleFromUrl('not-a-url')).toBe('not-a-url');
    });
  });
});
