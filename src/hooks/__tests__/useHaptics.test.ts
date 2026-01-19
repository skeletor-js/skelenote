/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHaptics } from '..';

// Mock Tauri's invoke
// Mock Tauri's invoke
vi.mock('@tauri-apps/api/core', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    invoke: vi.fn(),
  };
});

// Mock usePlatform
// Mock usePlatform
vi.mock('../platform/usePlatform', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    usePlatform: vi.fn(() => ({
      isMobile: true,
      isIOS: true,
      isAndroid: false,
      isDesktop: false,
      platform: 'ios',
    })),
  };
});

import { invoke } from '@tauri-apps/api/core';
import { usePlatform } from '../platform/usePlatform';

describe('useHaptics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(usePlatform).mockReturnValue({
      isMobile: true,
      isIOS: true,
      isAndroid: false,
      isDesktop: false,
      isMacOS: false,
      isWindows: false,
      isLinux: false,
      platform: 'ios',
      windowControlsHeight: 0,
      windowControlsWidth: 0,
      safeAreaTop: 47,
      safeAreaBottom: 34,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('availability', () => {
    it('should be available on mobile platforms', () => {
      const { result } = renderHook(() => useHaptics());
      expect(result.current.isAvailable).toBe(true);
    });

    it('should not be available on desktop platforms', () => {
      vi.mocked(usePlatform).mockReturnValue({
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isMacOS: true,
        isWindows: false,
        isLinux: false,
        platform: 'macos',
        windowControlsHeight: 32,
        windowControlsWidth: 80,
        safeAreaTop: 0,
        safeAreaBottom: 0,
      });

      const { result } = renderHook(() => useHaptics());
      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('impact', () => {
    it('should call haptic_impact with default medium style', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.impact();
      });

      expect(invoke).toHaveBeenCalledWith('haptic_impact', { style: 'medium' });
    });

    it('should call haptic_impact with specified style', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.impact('heavy');
      });

      expect(invoke).toHaveBeenCalledWith('haptic_impact', { style: 'heavy' });
    });

    it('should support all haptic styles', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useHaptics());

      const styles = ['light', 'medium', 'heavy', 'soft', 'rigid'] as const;

      for (const style of styles) {
        await act(async () => {
          await result.current.impact(style);
        });
        expect(invoke).toHaveBeenCalledWith('haptic_impact', { style });
      }
    });

    it('should not call invoke on desktop', async () => {
      vi.mocked(usePlatform).mockReturnValue({
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isMacOS: true,
        isWindows: false,
        isLinux: false,
        platform: 'macos',
        windowControlsHeight: 32,
        windowControlsWidth: 80,
        safeAreaTop: 0,
        safeAreaBottom: 0,
      });

      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.impact();
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it('should silently fail on error', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Native error'));
      const { result } = renderHook(() => useHaptics());

      // Should not throw
      await act(async () => {
        await result.current.impact();
      });

      expect(invoke).toHaveBeenCalled();
    });
  });

  describe('notification', () => {
    it('should call haptic_notification with success type', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.notification('success');
      });

      expect(invoke).toHaveBeenCalledWith('haptic_notification', {
        notificationType: 'success',
      });
    });

    it('should call haptic_notification with warning type', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.notification('warning');
      });

      expect(invoke).toHaveBeenCalledWith('haptic_notification', {
        notificationType: 'warning',
      });
    });

    it('should call haptic_notification with error type', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.notification('error');
      });

      expect(invoke).toHaveBeenCalledWith('haptic_notification', {
        notificationType: 'error',
      });
    });

    it('should not call invoke on desktop', async () => {
      vi.mocked(usePlatform).mockReturnValue({
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isMacOS: true,
        isWindows: false,
        isLinux: false,
        platform: 'macos',
        windowControlsHeight: 32,
        windowControlsWidth: 80,
        safeAreaTop: 0,
        safeAreaBottom: 0,
      });

      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.notification('success');
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it('should silently fail on error', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Native error'));
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.notification('success');
      });

      expect(invoke).toHaveBeenCalled();
    });
  });

  describe('selection', () => {
    it('should call haptic_selection', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.selection();
      });

      expect(invoke).toHaveBeenCalledWith('haptic_selection');
    });

    it('should not call invoke on desktop', async () => {
      vi.mocked(usePlatform).mockReturnValue({
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isMacOS: true,
        isWindows: false,
        isLinux: false,
        platform: 'macos',
        windowControlsHeight: 32,
        windowControlsWidth: 80,
        safeAreaTop: 0,
        safeAreaBottom: 0,
      });

      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.selection();
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it('should silently fail on error', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Native error'));
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        await result.current.selection();
      });

      expect(invoke).toHaveBeenCalled();
    });
  });
});
