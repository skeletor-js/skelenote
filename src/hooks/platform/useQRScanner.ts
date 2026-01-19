/**
 * QR Code Scanner Hook
 *
 * Provides QR code scanning capability on mobile platforms using the
 * Tauri barcode scanner plugin.
 */

import { useState, useCallback } from 'react';
import { usePlatform } from './usePlatform';

// Types for the barcode scanner plugin
// We'll dynamically import to avoid issues on desktop
interface ScanResult {
  content: string;
  format: string;
}

interface UseQRScannerResult {
  /** Whether QR scanning is available on this platform */
  isAvailable: boolean;
  /** Whether the scanner is currently active */
  isScanning: boolean;
  /** Error message if scanning failed */
  error: string | null;
  /** Start scanning for a QR code */
  scanQR: () => Promise<string | null>;
  /** Cancel an active scan */
  cancelScan: () => Promise<void>;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Hook for scanning QR codes on mobile devices.
 *
 * Uses the Tauri barcode scanner plugin which is only available on iOS/Android.
 * On desktop, `isAvailable` will be false and scanning functions will no-op.
 */
export function useQRScanner(): UseQRScannerResult {
  const { isMobile } = usePlatform();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QR scanner is only available on mobile platforms
  const isAvailable = isMobile;

  const scanQR = useCallback(async (): Promise<string | null> => {
    if (!isAvailable) {
      console.log('[QRScanner] Not available on this platform');
      return null;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Dynamically import the scanner to avoid issues on desktop
      const { scan, Format } =
        await import('@tauri-apps/plugin-barcode-scanner');

      const result: ScanResult = await scan({
        windowed: false, // Full camera view for better UX
        formats: [Format.QRCode],
      });

      console.log('[QRScanner] Scan successful:', result.content.slice(0, 50));
      return result.content;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to scan QR code';
      console.error('[QRScanner] Scan failed:', message);

      // Don't show error if user cancelled
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        setError(message);
      }
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [isAvailable]);

  const cancelScan = useCallback(async (): Promise<void> => {
    if (!isAvailable || !isScanning) return;

    try {
      const { cancel } = await import('@tauri-apps/plugin-barcode-scanner');
      await cancel();
      console.log('[QRScanner] Scan cancelled');
    } catch (err) {
      console.error('[QRScanner] Cancel failed:', err);
    } finally {
      setIsScanning(false);
    }
  }, [isAvailable, isScanning]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAvailable,
    isScanning,
    error,
    scanQR,
    cancelScan,
    clearError,
  };
}
