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
});
