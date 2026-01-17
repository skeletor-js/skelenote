/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  DeviceRegistryProvider,
  useDeviceRegistry,
  useDeviceRegistrySafe,
} from '../DeviceRegistryContext';
import * as devicesLib from '@/lib/devices';

// Mock SyncContext
const mockSyncClient = {
  onDeviceRegistry: vi.fn(),
  onDeviceRegistryUpdate: vi.fn(),
  onDeviceRevokeReceived: vi.fn(),
  onDeviceRenameReceived: vi.fn(),
  onDeviceRevoked: vi.fn(),
  sendDeviceRename: vi.fn(),
  sendDeviceRevoke: vi.fn(),
  sendDeviceRegistryUpdate: vi.fn(),
};

const mockDisconnect = vi.fn();

vi.mock('../SyncContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useSyncContextSafe: () => ({
      syncClient: mockSyncClient,
      disconnect: mockDisconnect,
    }),
  };
});

const mockAddToast = vi.fn();
vi.mock('../ToastContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useToast: () => ({
      addToast: mockAddToast,
    }),
  };
});

// Mock libraries
vi.mock('@/lib/sync', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getDeviceId: vi.fn().mockReturnValue('current-device'),
  };
});

vi.mock('@/lib/sync/local', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    broadcastDeviceRegistry: vi.fn(),
    broadcastDeviceRevoke: vi.fn(),
  };
});

const mockRegistryStore = {
  isInitialized: vi.fn(),
  initialize: vi.fn(),
  getAllDevices: vi.fn(),
  getRevokedDeviceIds: vi.fn(),
  onRegistryChange: vi.fn(),
  setBroadcastCallback: vi.fn(),
  registerCurrentDevice: vi.fn(),
  getDevice: vi.fn(),
  renameDevice: vi.fn(),
  revokeDevice: vi.fn(),
  handleSyncUpdate: vi.fn(),
};

vi.mock('@/lib/devices', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getDeviceRegistryStore: vi.fn(() => mockRegistryStore),
    getSigningPublicKey: vi.fn(),
    createSignedRevocation: vi.fn(),
    verifyRevocation: vi.fn(),
    blockDevice: vi.fn(),
  };
});

describe('DeviceRegistryContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DeviceRegistryProvider>{children}</DeviceRegistryProvider>
  );

  const device1 = {
    deviceId: 'current-device',
    name: 'Device 1',
    lastSeen: 100,
  };
  const device2 = { deviceId: 'other-device', name: 'Device 2', lastSeen: 200 };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockRegistryStore.isInitialized.mockReturnValue(true);
    mockRegistryStore.getAllDevices.mockReturnValue([device1, device2]);
    mockRegistryStore.getRevokedDeviceIds.mockReturnValue([]);
    mockRegistryStore.onRegistryChange.mockReturnValue(() => {});
    mockRegistryStore.getDevice.mockImplementation((id) =>
      id === 'current-device'
        ? device1
        : id === 'other-device'
          ? device2
          : undefined
    );

    vi.mocked(devicesLib.getSigningPublicKey).mockResolvedValue('pub-key');
    vi.mocked(devicesLib.verifyRevocation).mockResolvedValue(true);
  });

  it('should initialize and load devices', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Current device should be first
    expect(result.current.devices).toHaveLength(2);
    expect(result.current.devices[0].deviceId).toBe('current-device');
    expect(result.current.currentDeviceId).toBe('current-device');
  });

  it('should register current device', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.registerCurrentDevice();
    });

    expect(mockRegistryStore.registerCurrentDevice).toHaveBeenCalled();
    expect(devicesLib.getSigningPublicKey).toHaveBeenCalled();
  });

  it('should rename device', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.renameDevice('other-device', 'New Name');
    });

    expect(mockRegistryStore.renameDevice).toHaveBeenCalledWith(
      'other-device',
      'New Name'
    );
    expect(mockSyncClient.sendDeviceRename).toHaveBeenCalled();
  });

  it('should revoke device', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const revocation = {
      deviceId: 'other-device',
      revokedBy: 'current-device',
      revokedAt: 123,
      reason: 'lost',
      signature: 'sig',
    };
    vi.mocked(devicesLib.createSignedRevocation).mockResolvedValue(revocation);

    await act(async () => {
      await result.current.revokeDevice('other-device', 'lost');
    });

    expect(devicesLib.createSignedRevocation).toHaveBeenCalledWith(
      'other-device',
      'current-device',
      'lost'
    );
    expect(mockRegistryStore.revokeDevice).toHaveBeenCalledWith(revocation);
    expect(devicesLib.blockDevice).toHaveBeenCalledWith('other-device');
    expect(mockSyncClient.sendDeviceRevoke).toHaveBeenCalled();
  });

  it('should handle incoming registry sync', async () => {
    // We need to capture the callback passed to syncClient
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Force effect to run by ensuring deps are ready
    // The effect runs when syncClient is available.

    // Verify wiring
    expect(mockSyncClient.onDeviceRegistry).toHaveBeenCalled();

    // Simulate incoming sync
    const handler = mockSyncClient.onDeviceRegistry.mock.calls[0][0];
    const data = new Uint8Array([1, 2, 3]);

    act(() => {
      handler(data);
    });

    expect(mockRegistryStore.handleSyncUpdate).toHaveBeenCalledWith(data);
  });

  it('should handle incoming registry update', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSyncClient.onDeviceRegistryUpdate).toHaveBeenCalled();

    const handler = mockSyncClient.onDeviceRegistryUpdate.mock.calls[0][0];
    const data = new Uint8Array([4, 5, 6]);

    act(() => {
      handler(data);
    });

    expect(mockRegistryStore.handleSyncUpdate).toHaveBeenCalledWith(data);
  });

  it('should handle device revoke received with valid signature', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSyncClient.onDeviceRevokeReceived).toHaveBeenCalled();

    const handler = mockSyncClient.onDeviceRevokeReceived.mock.calls[0][0];
    const revokePayload = {
      deviceId: 'other-device',
      revokedAt: Date.now(),
      revokedBy: 'current-device',
      reason: 'compromised',
      signature: 'valid-sig',
    };

    await act(async () => {
      await handler(revokePayload);
    });

    expect(devicesLib.verifyRevocation).toHaveBeenCalled();
    expect(mockRegistryStore.revokeDevice).toHaveBeenCalledWith(revokePayload);
    expect(devicesLib.blockDevice).toHaveBeenCalledWith('other-device');
  });

  it('should reject device revoke with invalid signature', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(devicesLib.verifyRevocation).mockResolvedValue(false);

    const handler = mockSyncClient.onDeviceRevokeReceived.mock.calls[0][0];
    const revokePayload = {
      deviceId: 'other-device',
      revokedAt: Date.now(),
      revokedBy: 'current-device',
      reason: 'compromised',
      signature: 'invalid-sig',
    };

    await act(async () => {
      await handler(revokePayload);
    });

    expect(devicesLib.verifyRevocation).toHaveBeenCalled();
    expect(mockRegistryStore.revokeDevice).not.toHaveBeenCalled();
    expect(devicesLib.blockDevice).not.toHaveBeenCalled();
  });

  it('should handle device revoke from unknown device', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRegistryStore.getDevice.mockReturnValue(undefined);

    const handler = mockSyncClient.onDeviceRevokeReceived.mock.calls[0][0];
    const revokePayload = {
      deviceId: 'other-device',
      revokedAt: Date.now(),
      revokedBy: 'unknown-device',
      reason: 'compromised',
      signature: 'sig',
    };

    await act(async () => {
      await handler(revokePayload);
    });

    // Should not process revocation from unknown device
    expect(devicesLib.verifyRevocation).not.toHaveBeenCalled();
    expect(mockRegistryStore.revokeDevice).not.toHaveBeenCalled();
  });

  it('should handle device rename received', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSyncClient.onDeviceRenameReceived).toHaveBeenCalled();

    const handler = mockSyncClient.onDeviceRenameReceived.mock.calls[0][0];
    const renamePayload = {
      deviceId: 'other-device',
      newName: 'Renamed Device',
      renamedAt: Date.now(),
    };

    act(() => {
      handler(renamePayload);
    });

    expect(mockRegistryStore.renameDevice).toHaveBeenCalledWith(
      'other-device',
      'Renamed Device'
    );
  });

  it('should handle current device revocation', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSyncClient.onDeviceRevoked).toHaveBeenCalled();

    const handler = mockSyncClient.onDeviceRevoked.mock.calls[0][0];

    act(() => {
      handler('current-device', 'Device compromised');
    });

    expect(result.current.isRevoked).toBe(true);
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'This device has been revoked: Device compromised',
      duration: 0,
    });
  });

  it('should not handle revocation callback for different device', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const handler = mockSyncClient.onDeviceRevoked.mock.calls[0][0];

    act(() => {
      handler('different-device', 'Some reason');
    });

    // Should not mark as revoked since it's a different device
    expect(result.current.isRevoked).toBe(false);
  });

  it('should prevent revoking current device', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.revokeDevice('current-device', 'testing');
      })
    ).rejects.toThrow('Cannot revoke current device');

    expect(mockRegistryStore.revokeDevice).not.toHaveBeenCalled();
  });

  it('should broadcast revocation via cloud relay', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const revocation = {
      deviceId: 'other-device',
      revokedBy: 'current-device',
      revokedAt: 123,
      reason: 'lost',
      signature: 'sig',
    };
    vi.mocked(devicesLib.createSignedRevocation).mockResolvedValue(revocation);

    await act(async () => {
      await result.current.revokeDevice('other-device', 'lost');
    });

    expect(mockSyncClient.sendDeviceRevoke).toHaveBeenCalledWith({
      deviceId: 'other-device',
      revokedBy: 'current-device',
      revokedAt: 123,
      reason: 'lost',
      signature: 'sig',
    });
  });

  it('should broadcast revocation via P2P', async () => {
    const { broadcastDeviceRevoke } = await import('@/lib/sync/local');
    vi.mocked(broadcastDeviceRevoke).mockResolvedValue(2);

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const revocation = {
      deviceId: 'other-device',
      revokedBy: 'current-device',
      revokedAt: 123,
      reason: 'lost',
      signature: 'sig',
    };
    vi.mocked(devicesLib.createSignedRevocation).mockResolvedValue(revocation);

    await act(async () => {
      await result.current.revokeDevice('other-device', 'lost');
    });

    expect(broadcastDeviceRevoke).toHaveBeenCalled();
  });

  it('should broadcast registry updates via cloud relay', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Get the broadcast callback that was set
    expect(mockRegistryStore.setBroadcastCallback).toHaveBeenCalled();
    const broadcastCallback =
      mockRegistryStore.setBroadcastCallback.mock.calls[0][0];

    const data = new Uint8Array([7, 8, 9]);
    await act(async () => {
      await broadcastCallback(data);
    });

    expect(mockSyncClient.sendDeviceRegistryUpdate).toHaveBeenCalledWith(data);
  });

  it('should broadcast registry updates via P2P', async () => {
    const { broadcastDeviceRegistry } = await import('@/lib/sync/local');
    vi.mocked(broadcastDeviceRegistry).mockResolvedValue(3);

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const broadcastCallback =
      mockRegistryStore.setBroadcastCallback.mock.calls[0][0];

    const data = new Uint8Array([7, 8, 9]);
    await act(async () => {
      await broadcastCallback(data);
    });

    expect(broadcastDeviceRegistry).toHaveBeenCalledWith(data);
  });

  it('should skip initialization if store is already initialized', async () => {
    mockRegistryStore.isInitialized.mockReturnValue(true);

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockRegistryStore.isInitialized).toHaveBeenCalled();
    expect(mockRegistryStore.initialize).not.toHaveBeenCalled();
  });

  it('should initialize store when not initialized', async () => {
    mockRegistryStore.isInitialized.mockReturnValue(false);
    mockRegistryStore.initialize.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockRegistryStore.initialize).toHaveBeenCalledWith('current-device');
  });

  it('should handle initialization error', async () => {
    mockRegistryStore.isInitialized.mockReturnValue(false);
    mockRegistryStore.initialize.mockRejectedValue(new Error('Init failed'));

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Init failed');
  });

  it('should handle initialization error with non-Error object', async () => {
    mockRegistryStore.isInitialized.mockReturnValue(false);
    mockRegistryStore.initialize.mockRejectedValue('string error');

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to initialize device registry');
  });

  it('should handle loadDevices error', async () => {
    mockRegistryStore.getAllDevices.mockImplementation(() => {
      throw new Error('Load failed');
    });

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe('Load failed');
    });
  });

  it('should handle loadDevices error with non-Error object', async () => {
    mockRegistryStore.getAllDevices.mockImplementation(() => {
      throw 'string error';
    });

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load devices');
    });
  });

  it('should sort devices with current device first, then by lastSeen', async () => {
    const devices = [
      { deviceId: 'device-a', name: 'A', lastSeen: 300 },
      { deviceId: 'current-device', name: 'Current', lastSeen: 100 },
      { deviceId: 'device-b', name: 'B', lastSeen: 200 },
    ];
    mockRegistryStore.getAllDevices.mockReturnValue(devices);

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Current device should be first, then sorted by lastSeen descending
    expect(result.current.devices[0].deviceId).toBe('current-device');
    expect(result.current.devices[1].deviceId).toBe('device-a');
    expect(result.current.devices[2].deviceId).toBe('device-b');
  });

  it('should mark revoked devices in device list', async () => {
    mockRegistryStore.getRevokedDeviceIds.mockReturnValue(['other-device']);

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const otherDevice = result.current.devices.find(
      (d) => d.deviceId === 'other-device'
    );
    expect(otherDevice?.isRevoked).toBe(true);

    const currentDevice = result.current.devices.find(
      (d) => d.deviceId === 'current-device'
    );
    expect(currentDevice?.isRevoked).toBe(false);
  });

  it('should throw when renaming nonexistent device', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Mock getDevice to return undefined for the device we're trying to rename
    mockRegistryStore.getDevice.mockReturnValueOnce(undefined);

    await expect(
      act(async () => {
        await result.current.renameDevice('nonexistent-device', 'New Name');
      })
    ).rejects.toThrow('Device not found');
  });

  it('should handle revocation error', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(devicesLib.createSignedRevocation).mockRejectedValue(
      new Error('Signing failed')
    );

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.revokeDevice('other-device', 'test');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Signing failed');
  });

  it('should handle revocation error with non-Error object', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(devicesLib.createSignedRevocation).mockRejectedValue(
      'string error'
    );

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.revokeDevice('other-device', 'test');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Failed to revoke device');
  });

  it('should handle current device revocation without reason', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const handler = mockSyncClient.onDeviceRevoked.mock.calls[0][0];

    act(() => {
      handler('current-device', undefined);
    });

    expect(result.current.isRevoked).toBe(true);
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'This device has been revoked from sync',
      duration: 0,
    });
  });

  it('should handle P2P broadcast failure gracefully', async () => {
    const { broadcastDeviceRegistry } = await import('@/lib/sync/local');
    vi.mocked(broadcastDeviceRegistry).mockRejectedValue(
      new Error('P2P disabled')
    );

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const broadcastCallback =
      mockRegistryStore.setBroadcastCallback.mock.calls[0][0];

    const data = new Uint8Array([7, 8, 9]);
    // Should not throw
    await act(async () => {
      await broadcastCallback(data);
    });

    expect(broadcastDeviceRegistry).toHaveBeenCalledWith(data);
  });

  it('should handle P2P revocation broadcast failure gracefully', async () => {
    const { broadcastDeviceRevoke } = await import('@/lib/sync/local');
    vi.mocked(broadcastDeviceRevoke).mockRejectedValue(
      new Error('P2P disabled')
    );

    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const revocation = {
      deviceId: 'other-device',
      revokedBy: 'current-device',
      revokedAt: 123,
      reason: 'lost',
      signature: 'sig',
    };
    vi.mocked(devicesLib.createSignedRevocation).mockResolvedValue(revocation);

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.revokeDevice('other-device', 'lost');
    });

    // Should still succeed despite P2P failure
    expect(success).toBe(true);
  });

  it('should handle verification error during revoke received', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(devicesLib.verifyRevocation).mockRejectedValue(
      new Error('Verification failed')
    );

    const handler = mockSyncClient.onDeviceRevokeReceived.mock.calls[0][0];
    const revokePayload = {
      deviceId: 'other-device',
      revokedAt: Date.now(),
      revokedBy: 'current-device',
      reason: 'compromised',
      signature: 'sig',
    };

    // Should not throw, just log error
    await act(async () => {
      await handler(revokePayload);
    });

    expect(mockRegistryStore.revokeDevice).not.toHaveBeenCalled();
  });

  it('should handle register device error', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(devicesLib.getSigningPublicKey).mockRejectedValue(
      new Error('Key generation failed')
    );

    let caughtError: Error | undefined;
    await act(async () => {
      try {
        await result.current.registerCurrentDevice();
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError?.message).toBe('Key generation failed');
    await waitFor(() => {
      expect(result.current.error).toBe('Key generation failed');
    });
  });

  it('should handle register device error with non-Error object', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(devicesLib.getSigningPublicKey).mockRejectedValue('string error');

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.registerCurrentDevice();
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).toBe('string error');
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to register device');
    });
  });

  it('should get device by ID', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const device = result.current.getDevice('current-device');
    expect(device?.deviceId).toBe('current-device');

    const notFound = result.current.getDevice('nonexistent');
    expect(notFound).toBeUndefined();
  });

  it('should refresh devices', async () => {
    const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Clear the mock to check refresh calls getAllDevices again
    mockRegistryStore.getAllDevices.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockRegistryStore.getAllDevices).toHaveBeenCalled();
  });
});

describe('useDeviceRegistry hook', () => {
  it('should throw when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useDeviceRegistry());
    }).toThrow(
      'useDeviceRegistry must be used within a DeviceRegistryProvider'
    );

    consoleSpy.mockRestore();
  });
});

describe('useDeviceRegistrySafe hook', () => {
  it('should return null when used outside provider', () => {
    const { result } = renderHook(() => useDeviceRegistrySafe());
    expect(result.current).toBeNull();
  });
});
