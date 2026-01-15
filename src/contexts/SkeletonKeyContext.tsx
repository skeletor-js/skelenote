/**
 * Skeleton Key Context
 *
 * Manages the app's master encryption key (Skeleton Key) for zero-knowledge sync.
 * The Skeleton Key is a BIP39 mnemonic that users must save - losing it means
 * losing access to all synced data.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import * as crypto from '@/lib/crypto';
import { clearAllSyncSettings, setUserId } from '@/lib/sync';

// Storage key for biometric preference
const BIOMETRIC_ENABLED_KEY = 'skelenote:biometricEnabled';

interface SkeletonKeyContextValue {
  /** Whether the crypto subsystem has been initialized */
  isInitialized: boolean;
  /** Whether a Skeleton Key exists in secure storage */
  hasSkeletonKey: boolean;
  /** Whether an async operation is in progress */
  isLoading: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Whether the app is currently locked (awaiting biometric unlock) */
  isLocked: boolean;
  /** Whether biometric unlock is enabled (user preference) */
  biometricEnabled: boolean;
  /** Generate a new Skeleton Key (returns mnemonic but does NOT store it) */
  generateNewKey: () => Promise<string>;
  /** Import a Skeleton Key from mnemonic (validates and stores it) */
  importFromMnemonic: (mnemonic: string) => Promise<void>;
  /** Generate a QR code for a mnemonic (for transfer to another device) */
  getQRCode: (mnemonic: string) => Promise<string>;
  /** Validate a mnemonic phrase without importing it */
  validateMnemonicPhrase: (mnemonic: string) => Promise<boolean>;
  /** Clear the current error */
  clearError: () => void;
  /** Clear the Skeleton Key and reset to setup screen */
  resetVault: () => Promise<void>;
  /** Unlock the app (used after successful biometric authentication) */
  unlock: () => void;
  /** Enable or disable biometric unlock requirement */
  setBiometricEnabled: (enabled: boolean) => void;
}

const SkeletonKeyContext = createContext<SkeletonKeyContextValue | null>(null);

interface SkeletonKeyProviderProps {
  children: ReactNode;
}

export function SkeletonKeyProvider({ children }: SkeletonKeyProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSkeletonKey, setHasSkeletonKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Biometric lock state
  const [biometricEnabled, setBiometricEnabledState] = useState(() => {
    // Read initial preference from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    }
    return false;
  });
  // Start locked if biometric is enabled
  const [isLocked, setIsLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    }
    return false;
  });

  // Initialize crypto subsystem on mount
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const keyExists = await crypto.initCrypto();
        setHasSkeletonKey(keyExists);
        setIsInitialized(true);
      } catch (err) {
        console.error(
          '[SkeletonKeyProvider] Failed to initialize crypto:',
          err
        );
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to initialize encryption system'
        );
        // Still mark as initialized so app doesn't hang on "Initializing..."
        // This allows the user to see the setup screen and re-import their key
        setIsInitialized(true);
        setHasSkeletonKey(false);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Generate a new Skeleton Key (does not store it)
  const generateNewKey = useCallback(async (): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      const mnemonic = await crypto.generateKey();
      return mnemonic;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate Skeleton Key';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Import a Skeleton Key from mnemonic
  const importFromMnemonic = useCallback(
    async (mnemonic: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // Validate first
        const isValid = await crypto.validateMnemonic(mnemonic);
        if (!isValid) {
          throw new Error(
            'Invalid Skeleton Key. Please check the 24 words and try again.'
          );
        }

        // Clear old sync settings before importing new key
        // This ensures a fresh start with the new skeleton key
        clearAllSyncSettings();

        // Import and store
        await crypto.importKey(mnemonic);

        // Set the derived userId for sync
        // This ensures all devices with the same Skeleton Key use the same sync room
        const derivedUserId = await crypto.getDerivedUserId();
        setUserId(derivedUserId);
        console.log('[SkeletonKeyProvider] Set derived userId:', derivedUserId);

        setHasSkeletonKey(true);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to import Skeleton Key';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Generate QR code for mnemonic
  const getQRCode = useCallback(async (mnemonic: string): Promise<string> => {
    try {
      setError(null);
      return await crypto.generateQR(mnemonic);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // Validate mnemonic without importing
  const validateMnemonicPhrase = useCallback(
    async (mnemonic: string): Promise<boolean> => {
      try {
        return await crypto.validateMnemonic(mnemonic);
      } catch {
        return false;
      }
    },
    []
  );

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Unlock the app (called after successful biometric authentication)
  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  // Enable or disable biometric unlock requirement
  const setBiometricEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
    setBiometricEnabledState(enabled);
    // If disabling, also unlock immediately
    if (!enabled) {
      setIsLocked(false);
    }
  }, []);

  // Reset the vault (clear skeleton key and all data)
  const resetVault = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Clear sync settings first
      clearAllSyncSettings();

      // Clear the skeleton key
      await crypto.clearKey();

      // Update state
      setHasSkeletonKey(false);

      console.log('[SkeletonKeyProvider] Vault reset successfully');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reset vault';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: SkeletonKeyContextValue = {
    isInitialized,
    hasSkeletonKey,
    isLoading,
    error,
    isLocked,
    biometricEnabled,
    generateNewKey,
    importFromMnemonic,
    getQRCode,
    validateMnemonicPhrase,
    clearError,
    resetVault,
    unlock,
    setBiometricEnabled,
  };

  return (
    <SkeletonKeyContext.Provider value={value}>
      {children}
    </SkeletonKeyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSkeletonKey(): SkeletonKeyContextValue {
  const context = useContext(SkeletonKeyContext);
  if (!context) {
    throw new Error('useSkeletonKey must be used within a SkeletonKeyProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if SkeletonKeyProvider is not available.
 * Use this when the component may render outside of SkeletonKeyProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSkeletonKeySafe(): SkeletonKeyContextValue | null {
  return useContext(SkeletonKeyContext);
}
