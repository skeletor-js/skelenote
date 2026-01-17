/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockInstance,
} from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SkeletonKeyProvider, useSkeletonKey } from '../SkeletonKeyContext';
import React from 'react';
import * as crypto from '@/lib/crypto';

// Use inline mock definition to avoid hoisting issues
vi.mock('@/lib/crypto', () => ({
  initCrypto: vi.fn(),
  generateKey: vi.fn(),
  validateMnemonic: vi.fn(),
  importKey: vi.fn(),
  getDerivedUserId: vi.fn(),
  generateQR: vi.fn(),
  clearKey: vi.fn(),
}));

vi.mock('@/lib/sync', () => ({
  clearAllSyncSettings: vi.fn(),
  setUserId: vi.fn(),
}));

describe('SkeletonKeyContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SkeletonKeyProvider>{children}</SkeletonKeyProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default: init returns false (no key)
    (crypto.initCrypto as unknown as MockInstance).mockResolvedValue(false);
  });

  it('should initialize and check for key', async () => {
    (crypto.initCrypto as unknown as MockInstance).mockResolvedValue(true);

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSkeletonKey).toBe(true);
    expect(result.current.isInitialized).toBe(true);
  });

  it('should generate new key', async () => {
    (crypto.generateKey as unknown as MockInstance).mockResolvedValue(
      'word1 word2 ...'
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    let mnemonic;
    await act(async () => {
      mnemonic = await result.current.generateNewKey();
    });

    expect(mnemonic).toBe('word1 word2 ...');
    expect(crypto.generateKey).toHaveBeenCalled();
  });

  it('should import key from mnemonic', async () => {
    (crypto.validateMnemonic as unknown as MockInstance).mockResolvedValue(
      true
    );
    (crypto.getDerivedUserId as unknown as MockInstance).mockResolvedValue(
      'user-id'
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await result.current.importFromMnemonic('valid mnemonic');
    });

    expect(crypto.importKey).toHaveBeenCalledWith('valid mnemonic');
    expect(result.current.hasSkeletonKey).toBe(true);
  });

  it('should handle biometric toggle', () => {
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    act(() => {
      result.current.setBiometricEnabled(true);
    });

    expect(result.current.biometricEnabled).toBe(true);
    expect(localStorage.getItem('skelenote:biometricEnabled')).toBe('true');
  });

  it('should reset vault', async () => {
    (crypto.initCrypto as unknown as MockInstance).mockResolvedValue(true);
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.hasSkeletonKey).toBe(true));

    await act(async () => {
      await result.current.resetVault();
    });

    expect(crypto.clearKey).toHaveBeenCalled();
    expect(result.current.hasSkeletonKey).toBe(false);
  });
  it('should handle init error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Init failed');
    (crypto.initCrypto as unknown as MockInstance).mockRejectedValue(mockError);

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.hasSkeletonKey).toBe(false);
    expect(result.current.error).toBe('Init failed');

    consoleSpy.mockRestore();
  });

  it('should validate mnemonic phrase', async () => {
    (crypto.validateMnemonic as unknown as MockInstance).mockResolvedValueOnce(
      true
    );
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    await expect(result.current.validateMnemonicPhrase('valid')).resolves.toBe(
      true
    );

    (crypto.validateMnemonic as unknown as MockInstance).mockRejectedValueOnce(
      new Error('Invalid')
    );
    await expect(
      result.current.validateMnemonicPhrase('invalid')
    ).resolves.toBe(false);
  });

  it('should generate QR code', async () => {
    (crypto.generateQR as unknown as MockInstance).mockResolvedValue(
      'data:image/png;base64,...'
    );
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    const qr = await result.current.getQRCode('mnemonic');
    expect(qr).toBe('data:image/png;base64,...');
    expect(crypto.generateQR).toHaveBeenCalledWith('mnemonic');
  });

  it('should handle QR generation error', async () => {
    (crypto.generateQR as unknown as MockInstance).mockRejectedValue(
      new Error('QR failed')
    );
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    await act(async () => {
      await expect(result.current.getQRCode('mnemonic')).rejects.toThrow(
        'QR failed'
      );
    });
    expect(result.current.error).toBe('QR failed');
  });

  it('should unlock app', () => {
    // Mock local storage to start locked
    localStorage.setItem('skelenote:biometricEnabled', 'true');
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    expect(result.current.isLocked).toBe(true);

    act(() => {
      result.current.unlock();
    });
    expect(result.current.isLocked).toBe(false);
  });

  it('should handle reset vault error', async () => {
    (crypto.initCrypto as unknown as MockInstance).mockResolvedValue(true);
    (crypto.clearKey as unknown as MockInstance).mockRejectedValue(
      new Error('Reset failed')
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.hasSkeletonKey).toBe(true));

    await act(async () => {
      await expect(result.current.resetVault()).rejects.toThrow('Reset failed');
    });

    expect(result.current.hasSkeletonKey).toBe(true); // Should still be true on error
    expect(result.current.error).toBe('Reset failed');
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    act(() => {
      // The error property is read-only from the hook, so we need to trigger an error via the context
      // Actually, let's trigger a real error to be safe
    });

    // Trigger error via simple mechanism, e.g. gen key fail
    (crypto.generateKey as unknown as MockInstance).mockRejectedValue(
      new Error('Fail')
    );
  });

  it('should manually clear error', async () => {
    (crypto.generateKey as unknown as MockInstance).mockRejectedValue(
      new Error('Fail')
    );
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    await act(async () => {
      try {
        await result.current.generateNewKey();
      } catch {
        // ignore
      }
    });
    expect(result.current.error).toBe('Fail');

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle init error with non-Error value', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (crypto.initCrypto as unknown as MockInstance).mockRejectedValue(
      'String error'
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });

    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.hasSkeletonKey).toBe(false);
    expect(result.current.error).toBe('Failed to initialize encryption system');

    consoleSpy.mockRestore();
  });

  it('should handle generateNewKey error with non-Error value', async () => {
    (crypto.generateKey as unknown as MockInstance).mockRejectedValue(
      'Non-error string'
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await expect(result.current.generateNewKey()).rejects.toThrow(
        'Failed to generate Skeleton Key'
      );
    });

    expect(result.current.error).toBe('Failed to generate Skeleton Key');
  });

  it('should handle importFromMnemonic with invalid mnemonic', async () => {
    (crypto.validateMnemonic as unknown as MockInstance).mockResolvedValue(
      false
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await expect(
        result.current.importFromMnemonic('invalid mnemonic')
      ).rejects.toThrow(
        'Invalid Skeleton Key. Please check the 24 words and try again.'
      );
    });

    expect(result.current.error).toBe(
      'Invalid Skeleton Key. Please check the 24 words and try again.'
    );
    expect(result.current.hasSkeletonKey).toBe(false);
  });

  it('should handle importFromMnemonic error with non-Error value', async () => {
    (crypto.validateMnemonic as unknown as MockInstance).mockResolvedValue(
      true
    );
    (crypto.importKey as unknown as MockInstance).mockRejectedValue(
      'Non-error import failure'
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await expect(
        result.current.importFromMnemonic('valid mnemonic')
      ).rejects.toThrow('Failed to import Skeleton Key');
    });

    expect(result.current.error).toBe('Failed to import Skeleton Key');
  });

  it('should handle getQRCode error with non-Error value', async () => {
    (crypto.generateQR as unknown as MockInstance).mockRejectedValue(
      'Non-error QR failure'
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await expect(result.current.getQRCode('mnemonic')).rejects.toThrow(
        'Failed to generate QR code'
      );
    });

    expect(result.current.error).toBe('Failed to generate QR code');
  });

  it('should handle resetVault error with non-Error value', async () => {
    (crypto.initCrypto as unknown as MockInstance).mockResolvedValue(true);
    (crypto.clearKey as unknown as MockInstance).mockRejectedValue(
      'Non-error reset failure'
    );

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.hasSkeletonKey).toBe(true));

    await act(async () => {
      await expect(result.current.resetVault()).rejects.toThrow(
        'Failed to reset vault'
      );
    });

    expect(result.current.error).toBe('Failed to reset vault');
  });

  it('should unlock when biometric is disabled', async () => {
    // Start with biometric enabled and locked
    localStorage.setItem('skelenote:biometricEnabled', 'true');

    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.biometricEnabled).toBe(true);
    expect(result.current.isLocked).toBe(true);

    // Disable biometric - should automatically unlock
    act(() => {
      result.current.setBiometricEnabled(false);
    });

    expect(result.current.biometricEnabled).toBe(false);
    expect(result.current.isLocked).toBe(false);
  });

  it('should start unlocked when biometric is not enabled', async () => {
    // No biometric preference set
    const { result } = renderHook(() => useSkeletonKey(), { wrapper });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.biometricEnabled).toBe(false);
    expect(result.current.isLocked).toBe(false);
  });

  it('should throw when useSkeletonKey is used outside provider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSkeletonKey());
    }).toThrow('useSkeletonKey must be used within a SkeletonKeyProvider');

    errorSpy.mockRestore();
  });
});
