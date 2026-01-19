/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlatform } from '..';

// Mock Tauri's plugin-os
// Mock Tauri's plugin-os
vi.mock('@tauri-apps/plugin-os', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    platform: vi.fn(() => 'macos'),
  };
});

// Get reference to mocked function for modification
import { platform as mockPlatform } from '@tauri-apps/plugin-os';

describe('usePlatform', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('platform detection', () => {
    it('should detect macOS', () => {
      vi.mocked(mockPlatform).mockReturnValue('macos');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.platform).toBe('macos');
      expect(result.current.isMacOS).toBe(true);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });

    it('should detect Windows', () => {
      vi.mocked(mockPlatform).mockReturnValue('windows');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.platform).toBe('windows');
      expect(result.current.isWindows).toBe(true);
      expect(result.current.isDesktop).toBe(true);
    });

    it('should detect Linux', () => {
      vi.mocked(mockPlatform).mockReturnValue('linux');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.platform).toBe('linux');
      expect(result.current.isLinux).toBe(true);
      expect(result.current.isDesktop).toBe(true);
    });

    it('should detect iOS', () => {
      vi.mocked(mockPlatform).mockReturnValue('ios');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.platform).toBe('ios');
      expect(result.current.isIOS).toBe(true);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect Android', () => {
      vi.mocked(mockPlatform).mockReturnValue('android');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.platform).toBe('android');
      expect(result.current.isAndroid).toBe(true);
      expect(result.current.isMobile).toBe(true);
    });

    it('should handle unknown platform when Tauri throws', () => {
      vi.mocked(mockPlatform).mockImplementation(() => {
        throw new Error('Not in Tauri');
      });
      const { result } = renderHook(() => usePlatform());

      expect(result.current.platform).toBe('unknown');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });
  });

  describe('window controls dimensions', () => {
    it('should return macOS window control dimensions', () => {
      vi.mocked(mockPlatform).mockReturnValue('macos');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.windowControlsHeight).toBe(32);
      expect(result.current.windowControlsWidth).toBe(80);
    });

    it('should return Windows window control dimensions', () => {
      vi.mocked(mockPlatform).mockReturnValue('windows');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.windowControlsHeight).toBe(32);
      expect(result.current.windowControlsWidth).toBe(0);
    });

    it('should return Linux window control dimensions', () => {
      vi.mocked(mockPlatform).mockReturnValue('linux');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.windowControlsHeight).toBe(32);
      expect(result.current.windowControlsWidth).toBe(0);
    });

    it('should return 0 for mobile platforms', () => {
      vi.mocked(mockPlatform).mockReturnValue('ios');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.windowControlsHeight).toBe(0);
      expect(result.current.windowControlsWidth).toBe(0);
    });
  });

  describe('safe area insets', () => {
    it('should return iOS safe area insets', () => {
      vi.mocked(mockPlatform).mockReturnValue('ios');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.safeAreaTop).toBe(47);
      expect(result.current.safeAreaBottom).toBe(34);
    });

    it('should return Android safe area insets', () => {
      vi.mocked(mockPlatform).mockReturnValue('android');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.safeAreaTop).toBe(24);
      expect(result.current.safeAreaBottom).toBe(0);
    });

    it('should return 0 for desktop platforms', () => {
      vi.mocked(mockPlatform).mockReturnValue('macos');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.safeAreaTop).toBe(0);
      expect(result.current.safeAreaBottom).toBe(0);
    });
  });

  describe('boolean flags consistency', () => {
    it('should have mutually exclusive platform flags on macOS', () => {
      vi.mocked(mockPlatform).mockReturnValue('macos');
      const { result } = renderHook(() => usePlatform());

      // Only one should be true
      const platformFlags = [
        result.current.isMacOS,
        result.current.isWindows,
        result.current.isLinux,
        result.current.isIOS,
        result.current.isAndroid,
      ];
      expect(platformFlags.filter(Boolean).length).toBe(1);
    });

    it('should have correct mobile/desktop groupings for iOS', () => {
      vi.mocked(mockPlatform).mockReturnValue('ios');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isIOS).toBe(true);
    });

    it('should have correct mobile/desktop groupings for Android', () => {
      vi.mocked(mockPlatform).mockReturnValue('android');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isAndroid).toBe(true);
    });
  });
});
