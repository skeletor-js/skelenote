/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock usePlatform
vi.mock('../platform/usePlatform', () => ({
  usePlatform: vi.fn(() => ({
    isMobile: true,
    isIOS: true,
    isAndroid: false,
    isDesktop: false,
    platform: 'ios',
  })),
}));

// Track handlers
const handlers: ((urls: string[]) => void)[] = [];

// Mock deep link plugin
vi.mock('@tauri-apps/plugin-deep-link', () => ({
  onOpenUrl: (cb: (urls: string[]) => void) => {
    handlers.push(cb);
    return Promise.resolve(() => {});
  },
}));

// Mock contexts
const mockNavigateToObject = vi.fn();
const mockNavigateToView = vi.fn();
const mockStoreGet = vi.fn();

vi.mock('@/contexts', () => ({
  useNavigation: () => ({
    navigateToObject: mockNavigateToObject,
    navigateToView: mockNavigateToView,
  }),
  useObjects: () => ({
    store: {
      get: mockStoreGet,
    },
  }),
}));

import { usePlatform } from '../platform/usePlatform';
import { useDeepLinks } from '..';

describe('useDeepLinks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    handlers.length = 0;
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

  describe('setup', () => {
    it('should register URL listener on mobile', () => {
      renderHook(() => useDeepLinks());
      expect(handlers.length).toBe(1);
    });

    it('should not register URL listener on desktop', () => {
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

      renderHook(() => useDeepLinks());
      expect(handlers.length).toBe(0);
    });
  });

  describe('URL handling', () => {
    it('should ignore non-skelenote protocols', () => {
      renderHook(() => useDeepLinks());
      const handler = handlers[0];
      handler(['https://google.com']);
      expect(mockNavigateToObject).not.toHaveBeenCalled();
      expect(mockNavigateToView).not.toHaveBeenCalled();
    });

    it('should handle view navigation', () => {
      renderHook(() => useDeepLinks());
      const handler = handlers[0];

      handler(['skelenote://inbox']);
      expect(mockNavigateToView).toHaveBeenCalledWith('inbox');

      handler(['skelenote://tasks']);
      expect(mockNavigateToView).toHaveBeenCalledWith('tasks');

      handler(['skelenote://daily']);
      expect(mockNavigateToView).toHaveBeenCalledWith('daily-notes');

      handler(['skelenote://settings']);
      expect(mockNavigateToView).toHaveBeenCalledWith('settings');

      handler(['skelenote://archive']);
      expect(mockNavigateToView).toHaveBeenCalledWith('archive');
    });

    it('should handle object navigation', () => {
      renderHook(() => useDeepLinks());
      const handler = handlers[0];

      // Mock store.get to return object
      mockStoreGet.mockReturnValue({ id: '123' });

      handler(['skelenote://note/123']);
      expect(mockStoreGet).toHaveBeenCalledWith('123');
      expect(mockNavigateToObject).toHaveBeenCalledWith('123');
    });

    it('should warn when object not found', () => {
      renderHook(() => useDeepLinks());
      const handler = handlers[0];

      // Mock store.get to return null
      mockStoreGet.mockReturnValue(null);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      handler(['skelenote://note/999']);
      expect(mockStoreGet).toHaveBeenCalledWith('999');
      expect(mockNavigateToObject).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle invalid URLs safely', () => {
      renderHook(() => useDeepLinks());
      const handler = handlers[0];
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      handler(['not-a-url']);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
