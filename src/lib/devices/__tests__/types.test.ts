import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRevocationMessage,
  formatLastSeen,
  getPlatformDisplayName,
  type DevicePlatform,
} from '../types';

describe('Device Types Utilities', () => {
  describe('createRevocationMessage', () => {
    it('should create canonical revocation message format', () => {
      const deviceId = 'device-123';
      const revokedAt = 1704067200000; // 2024-01-01 00:00:00 UTC
      const revokedBy = 'device-456';

      const message = createRevocationMessage(deviceId, revokedAt, revokedBy);

      expect(message).toBe('revoke:device-123:1704067200000:device-456');
    });

    it('should handle UUIDs as device IDs', () => {
      const deviceId = '550e8400-e29b-41d4-a716-446655440000';
      const revokedAt = 1700000000000;
      const revokedBy = '550e8400-e29b-41d4-a716-446655440001';

      const message = createRevocationMessage(deviceId, revokedAt, revokedBy);

      expect(message).toBe(
        'revoke:550e8400-e29b-41d4-a716-446655440000:1700000000000:550e8400-e29b-41d4-a716-446655440001'
      );
    });

    it('should be consistent for same inputs', () => {
      const params = {
        deviceId: 'abc',
        revokedAt: 123456,
        revokedBy: 'def',
      };

      const message1 = createRevocationMessage(
        params.deviceId,
        params.revokedAt,
        params.revokedBy
      );
      const message2 = createRevocationMessage(
        params.deviceId,
        params.revokedAt,
        params.revokedBy
      );

      expect(message1).toBe(message2);
    });

    it('should produce different messages for different inputs', () => {
      const message1 = createRevocationMessage('device-1', 1000, 'by-1');
      const message2 = createRevocationMessage('device-2', 1000, 'by-1');
      const message3 = createRevocationMessage('device-1', 2000, 'by-1');
      const message4 = createRevocationMessage('device-1', 1000, 'by-2');

      expect(message1).not.toBe(message2);
      expect(message1).not.toBe(message3);
      expect(message1).not.toBe(message4);
    });
  });

  describe('formatLastSeen', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for timestamps within 60 seconds', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now)).toBe('Just now');
      expect(formatLastSeen(now - 30000)).toBe('Just now'); // 30 seconds ago
      expect(formatLastSeen(now - 59000)).toBe('Just now'); // 59 seconds ago
    });

    it('should return minutes for timestamps within an hour', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 60000)).toBe('1 minute ago');
      expect(formatLastSeen(now - 120000)).toBe('2 minutes ago');
      expect(formatLastSeen(now - 300000)).toBe('5 minutes ago');
      expect(formatLastSeen(now - 3540000)).toBe('59 minutes ago'); // 59 minutes
    });

    it('should use singular "minute" for exactly 1 minute', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 60000)).toBe('1 minute ago');
    });

    it('should return hours for timestamps within a day', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 3600000)).toBe('1 hour ago'); // 1 hour
      expect(formatLastSeen(now - 7200000)).toBe('2 hours ago'); // 2 hours
      expect(formatLastSeen(now - 43200000)).toBe('12 hours ago'); // 12 hours
      expect(formatLastSeen(now - 82800000)).toBe('23 hours ago'); // 23 hours
    });

    it('should use singular "hour" for exactly 1 hour', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 3600000)).toBe('1 hour ago');
    });

    it('should return days for timestamps within a week', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 86400000)).toBe('1 day ago'); // 1 day
      expect(formatLastSeen(now - 172800000)).toBe('2 days ago'); // 2 days
      expect(formatLastSeen(now - 518400000)).toBe('6 days ago'); // 6 days
    });

    it('should use singular "day" for exactly 1 day', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 86400000)).toBe('1 day ago');
    });

    it('should return formatted date for timestamps older than a week', () => {
      // Set to a known date
      const now = new Date('2024-01-15T12:00:00Z').getTime();
      vi.setSystemTime(now);

      // 10 days ago
      const oldTimestamp = now - 10 * 86400000;
      const result = formatLastSeen(oldTimestamp);

      // Should be a formatted date string (locale-dependent)
      expect(result).not.toContain('ago');
      expect(result).toMatch(/\d+/); // Should contain numbers (date)
    });

    it('should handle edge case at exactly 60 seconds', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 60000)).toBe('1 minute ago');
    });

    it('should handle edge case at exactly 1 hour', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 3600000)).toBe('1 hour ago');
    });

    it('should handle edge case at exactly 1 day', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatLastSeen(now - 86400000)).toBe('1 day ago');
    });

    it('should handle edge case at exactly 7 days', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // 7 days = 7 * 86400000 = 604800000 ms
      const result = formatLastSeen(now - 604800000);
      // At exactly 7 days, it should show date (days >= 7)
      expect(result).not.toContain('days ago');
    });
  });

  describe('getPlatformDisplayName', () => {
    it('should return "macOS" for macos', () => {
      expect(getPlatformDisplayName('macos')).toBe('macOS');
    });

    it('should return "Windows" for windows', () => {
      expect(getPlatformDisplayName('windows')).toBe('Windows');
    });

    it('should return "Linux" for linux', () => {
      expect(getPlatformDisplayName('linux')).toBe('Linux');
    });

    it('should return "iOS" for ios', () => {
      expect(getPlatformDisplayName('ios')).toBe('iOS');
    });

    it('should return "Android" for android', () => {
      expect(getPlatformDisplayName('android')).toBe('Android');
    });

    it('should return "Web" for web', () => {
      expect(getPlatformDisplayName('web')).toBe('Web');
    });

    it('should handle all platform types', () => {
      const platforms: DevicePlatform[] = [
        'macos',
        'windows',
        'linux',
        'ios',
        'android',
        'web',
      ];

      for (const platform of platforms) {
        const displayName = getPlatformDisplayName(platform);
        expect(typeof displayName).toBe('string');
        expect(displayName.length).toBeGreaterThan(0);
      }
    });
  });
});
