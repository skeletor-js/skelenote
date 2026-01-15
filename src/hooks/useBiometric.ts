import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform';

// Lazy import to avoid errors on desktop
let biometricModule: typeof import('@tauri-apps/plugin-biometric') | null =
  null;

async function getBiometricModule() {
  if (!biometricModule) {
    try {
      biometricModule = await import('@tauri-apps/plugin-biometric');
    } catch {
      return null;
    }
  }
  return biometricModule;
}

export interface BiometricStatus {
  /** Whether biometric authentication is available on this device */
  isAvailable: boolean;
  /** The type of biometric available (e.g., 'faceId', 'touchId', 'fingerprint') */
  biometryType:
    | 'faceId'
    | 'touchId'
    | 'fingerprint'
    | 'iris'
    | 'unknown'
    | null;
}

export interface UseBiometricResult {
  /** Whether biometric is available on this device */
  isAvailable: boolean;
  /** Type of biometric available */
  biometryType: BiometricStatus['biometryType'];
  /** Human-readable name for the biometric type */
  biometryName: string;
  /** Whether the status is still loading */
  isLoading: boolean;
  /** Request biometric authentication */
  authenticate: (reason?: string) => Promise<boolean>;
}

/**
 * Hook for biometric authentication (Face ID, Touch ID, fingerprint).
 * Only available on mobile platforms (iOS, Android).
 */
export function useBiometric(): UseBiometricResult {
  const { isMobile, isIOS } = usePlatform();
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] =
    useState<BiometricStatus['biometryType']>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check biometric status on mount
  useEffect(() => {
    if (!isMobile) {
      setIsLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const module = await getBiometricModule();
        if (!module) {
          setIsLoading(false);
          return;
        }

        const status = await module.checkStatus();
        setIsAvailable(status.isAvailable);

        // Map biometry type
        if (status.biometryType) {
          const typeMap: Record<string, BiometricStatus['biometryType']> = {
            faceId: 'faceId',
            touchId: 'touchId',
            fingerprint: 'fingerprint',
            iris: 'iris',
          };
          setBiometryType(typeMap[status.biometryType] || 'unknown');
        }
      } catch (error) {
        console.error('[Biometric] Failed to check status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [isMobile]);

  // Get human-readable name for biometry type
  const getBiometryName = (): string => {
    if (!isAvailable) return 'Biometric';
    switch (biometryType) {
      case 'faceId':
        return 'Face ID';
      case 'touchId':
        return 'Touch ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'iris':
        return 'Iris';
      default:
        return isIOS ? 'Face ID' : 'Fingerprint';
    }
  };

  const authenticate = useCallback(
    async (reason?: string): Promise<boolean> => {
      if (!isMobile || !isAvailable) {
        return false;
      }

      try {
        const module = await getBiometricModule();
        if (!module) {
          return false;
        }

        await module.authenticate(reason || 'Unlock Skelenote', {
          allowDeviceCredential: true, // Allow passcode/PIN fallback
        });
        return true;
      } catch (error) {
        // User cancelled or auth failed
        console.log('[Biometric] Authentication failed or cancelled:', error);
        return false;
      }
    },
    [isMobile, isAvailable]
  );

  return {
    isAvailable,
    biometryType,
    biometryName: getBiometryName(),
    isLoading,
    authenticate,
  };
}
