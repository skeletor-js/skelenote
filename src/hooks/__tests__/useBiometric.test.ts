/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

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

vi.mock('../platform/biometric-loader', () => ({
  getBiometricModule: vi.fn().mockResolvedValue({
    checkStatus: vi.fn().mockRejectedValue(new Error('Not available')),
    authenticate: vi.fn().mockRejectedValue(new Error('Not available')),
  }),
}));

import { usePlatform } from '../platform/usePlatform';
import { useBiometric } from '..';
import { getBiometricModule } from '../platform/biometric-loader';

describe('useBiometric', () => {
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

  describe('initialization', () => {
    it('should start with loading state on mobile', () => {
      const { result } = renderHook(() => useBiometric());
      // Initial state is loading=true on mobile
      expect(result.current.isLoading).toBe(true);
    });

    it('should complete loading on mobile', async () => {
      const { result } = renderHook(() => useBiometric());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should not check status on desktop', async () => {
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

      const { result } = renderHook(() => useBiometric());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('biometry type', () => {
    it('should return null biometryType when not available', async () => {
      const { result } = renderHook(() => useBiometric());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.biometryType).toBeNull();
    });

    it('should return "Biometric" as default name when not available', async () => {
      const { result } = renderHook(() => useBiometric());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.biometryName).toBe('Biometric');
    });
  });

  describe('authenticate', () => {
    it('should return false when not on mobile', async () => {
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

      const { result } = renderHook(() => useBiometric());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const success = await result.current.authenticate();
      expect(success).toBe(false);
    });

    it('should return false when biometric not available', async () => {
      const { result } = renderHook(() => useBiometric());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const success = await result.current.authenticate();
      expect(success).toBe(false);
    });
  });

  describe('hook behavior', () => {
    it('should not throw when rendered on mobile', () => {
      expect(() => {
        renderHook(() => useBiometric());
      }).not.toThrow();
    });

    it('should not throw when rendered on desktop', () => {
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

      expect(() => {
        renderHook(() => useBiometric());
      }).not.toThrow();
    });

    it('should return expected interface', async () => {
      const { result } = renderHook(() => useBiometric());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('isAvailable');
      expect(result.current).toHaveProperty('biometryType');
      expect(result.current).toHaveProperty('biometryName');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('authenticate');
      expect(typeof result.current.authenticate).toBe('function');
    });
    it('should return true on successful authentication', async () => {
      // Update the loader mock to return a successful plugin
      const successPlugin = {
        checkStatus: vi
          .fn()
          .mockResolvedValue({ isAvailable: true, biometryType: 'faceId' }),
        authenticate: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(getBiometricModule).mockResolvedValue(successPlugin as any);

      const { result } = renderHook(() => useBiometric());

      // Wait for initial checkStatus to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should be available now
      expect(result.current.isAvailable).toBe(true);

      const success = await result.current.authenticate();
      expect(success).toBe(true);
    });

    it('should handle iris biometry type', async () => {
      vi.mocked(getBiometricModule).mockResolvedValue({
        checkStatus: vi
          .fn()
          .mockResolvedValue({ isAvailable: true, biometryType: 'iris' }),
        authenticate: vi.fn(),
      } as any);

      const { result } = renderHook(() => useBiometric());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.biometryType).toBe('iris');
      expect(result.current.biometryName).toBe('Iris');
    });

    it('should handle checkStatus error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.mocked(getBiometricModule).mockResolvedValue({
        checkStatus: vi
          .fn()
          .mockRejectedValue(new Error('Status check failed')),
        authenticate: vi.fn(),
      } as any);

      const { result } = renderHook(() => useBiometric());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAvailable).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Biometric] Failed to check status:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle authentication error', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.mocked(getBiometricModule).mockResolvedValue({
        checkStatus: vi
          .fn()
          .mockResolvedValue({ isAvailable: true, biometryType: 'faceId' }),
        authenticate: vi.fn().mockRejectedValue(new Error('Auth failed')),
      } as any);

      const { result } = renderHook(() => useBiometric());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const success = await result.current.authenticate();
      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Biometric] Authentication failed or cancelled:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
