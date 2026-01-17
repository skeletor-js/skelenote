/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQRScanner } from '../useQRScanner';

// Mock usePlatform
// Mock usePlatform
vi.mock('../usePlatform', async (importOriginal) => {
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

// Mock the barcode scanner module
const mockScan = vi.fn();
const mockCancel = vi.fn();

vi.mock('@tauri-apps/plugin-barcode-scanner', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    scan: (options: unknown) => mockScan(options),
    cancel: () => mockCancel(),
    Format: {
      QRCode: 'QR_CODE',
    },
  };
});

import { usePlatform } from '../usePlatform';

describe('useQRScanner', () => {
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
      const { result } = renderHook(() => useQRScanner());
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

      const { result } = renderHook(() => useQRScanner());
      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should not be scanning initially', () => {
      const { result } = renderHook(() => useQRScanner());
      expect(result.current.isScanning).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => useQRScanner());
      expect(result.current.error).toBeNull();
    });
  });

  describe('scanQR', () => {
    it('should return scanned content on success', async () => {
      mockScan.mockResolvedValue({
        content: 'https://example.com/qr-data',
        format: 'QR_CODE',
      });

      const { result } = renderHook(() => useQRScanner());

      let content: string | null = null;
      await act(async () => {
        content = await result.current.scanQR();
      });

      expect(content).toBe('https://example.com/qr-data');
      expect(mockScan).toHaveBeenCalledWith({
        windowed: false,
        formats: ['QR_CODE'],
      });
    });

    it('should return null on desktop', async () => {
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

      const { result } = renderHook(() => useQRScanner());

      let content: string | null = 'initial';
      await act(async () => {
        content = await result.current.scanQR();
      });

      expect(content).toBeNull();
      expect(mockScan).not.toHaveBeenCalled();
    });

    it('should set error on failure', async () => {
      mockScan.mockRejectedValue(new Error('Camera permission denied'));

      const { result } = renderHook(() => useQRScanner());

      await act(async () => {
        await result.current.scanQR();
      });

      expect(result.current.error).toBe('Camera permission denied');
    });

    it('should not set error when user cancels', async () => {
      mockScan.mockRejectedValue(new Error('User cancelled'));

      const { result } = renderHook(() => useQRScanner());

      await act(async () => {
        await result.current.scanQR();
      });

      expect(result.current.error).toBeNull();
    });

    it('should not set error when scan is canceled', async () => {
      mockScan.mockRejectedValue(new Error('Scan was canceled'));

      const { result } = renderHook(() => useQRScanner());

      await act(async () => {
        await result.current.scanQR();
      });

      expect(result.current.error).toBeNull();
    });

    it('should return null on failure', async () => {
      mockScan.mockRejectedValue(new Error('Scan failed'));

      const { result } = renderHook(() => useQRScanner());

      let content: string | null = 'initial';
      await act(async () => {
        content = await result.current.scanQR();
      });

      expect(content).toBeNull();
    });

    it('should clear error before new scan', async () => {
      mockScan
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ content: 'success', format: 'QR_CODE' });

      const { result } = renderHook(() => useQRScanner());

      // First scan fails
      await act(async () => {
        await result.current.scanQR();
      });
      expect(result.current.error).toBe('First error');

      // Second scan succeeds - error should be cleared
      await act(async () => {
        await result.current.scanQR();
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear the error state', async () => {
      mockScan.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useQRScanner());

      // Generate error
      await act(async () => {
        await result.current.scanQR();
      });
      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('cancelScan', () => {
    it('should call cancel and reset scanning state', async () => {
      // Start a scan that doesn't resolve immediately
      let resolvePromise: (value: ScanResult) => void;
      mockScan.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useQRScanner());

      // Start scanning (don't await)
      let scanPromise: Promise<string | null>;
      act(() => {
        scanPromise = result.current.scanQR();
      });

      // Wait for scanning state to be set
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.isScanning).toBe(true);

      // Cancel the scan
      await act(async () => {
        await result.current.cancelScan();
      });

      expect(mockCancel).toHaveBeenCalled();
      expect(result.current.isScanning).toBe(false);

      // Resolve the pending scan to clean up
      resolvePromise!({ content: '', format: 'QR_CODE' });
      await scanPromise!;
    });

    it('should do nothing on desktop', async () => {
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

      const { result } = renderHook(() => useQRScanner());

      await act(async () => {
        await result.current.cancelScan();
      });

      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('should do nothing when not scanning', async () => {
      const { result } = renderHook(() => useQRScanner());

      // Not scanning, just call cancel
      await act(async () => {
        await result.current.cancelScan();
      });

      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('should handle cancel errors gracefully', async () => {
      // Start a scan
      let resolvePromise: (value: ScanResult) => void;
      mockScan.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );
      mockCancel.mockRejectedValue(new Error('Cancel failed'));

      const { result } = renderHook(() => useQRScanner());

      // Start scanning
      let scanPromise: Promise<string | null>;
      act(() => {
        scanPromise = result.current.scanQR();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Cancel - should not throw even if cancel fails
      await act(async () => {
        await result.current.cancelScan();
      });

      expect(result.current.isScanning).toBe(false);

      // Clean up
      resolvePromise!({ content: '', format: 'QR_CODE' });
      await scanPromise!;
    });
  });

  describe('edge cases', () => {
    it('should handle non-Error thrown objects', async () => {
      mockScan.mockRejectedValue('String error');

      const { result } = renderHook(() => useQRScanner());

      await act(async () => {
        await result.current.scanQR();
      });

      expect(result.current.error).toBe('Failed to scan QR code');
    });
  });
});

interface ScanResult {
  content: string;
  format: string;
}
