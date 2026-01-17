/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LocalSyncProvider, useLocalSync } from '../LocalSyncContext';
import * as localSyncLib from '@/lib/sync/local';
import { MessageType } from '@/lib/sync/protocol';

// Mock complex dependencies
const mockDocStore = {
  setLocalSyncBroadcast: vi.fn(),
  handleLocalSyncUpdate: vi.fn(),
  sync: vi.fn(),
};

const mockStore = {
  clearCache: vi.fn(),
};

const mockRefreshData = vi.fn();

vi.mock('../ObjectContext', () => ({
  useObjects: () => ({
    docStore: mockDocStore,
    store: mockStore,
    refreshData: mockRefreshData,
  }),
}));

const mockAddToast = vi.fn();
vi.mock('../ToastContext', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

// Mock library functions
vi.mock('@/lib/sync/local', () => ({
  startServer: vi.fn(),
  stopServer: vi.fn(),
  getServerInfo: vi.fn(),
  getDeviceInfo: vi.fn(),
  startDiscovery: vi.fn(),
  stopDiscovery: vi.fn(),
  getDiscoveredPeers: vi.fn(),
  isDiscoveryRunning: vi.fn(),
  onPeerDiscovered: vi.fn(),
  onPeerLost: vi.fn(),
  onDiscoveryError: vi.fn(),
  onPeerConnected: vi.fn(),
  onPeerDisconnected: vi.fn(),
  onSyncMessage: vi.fn(),
  broadcastSync: vi.fn(),
  broadcastDeviceRegistry: vi.fn(),
  getPeerCount: vi.fn(),
  generatePairingQr: vi.fn(),
  parsePairingQr: vi.fn(),
  connectViaPairing: vi.fn(),
  connectViaManualPairing: vi.fn(),
  getPairedDevices: vi.fn(),
  removePairedDevice: vi.fn(),
  prunePairedDevicesCache: vi.fn(),
  reconnectAllPairedDevices: vi.fn(),
  reconnectPairedDevice: vi.fn(),
}));

vi.mock('@/lib/devices', () => ({
  getDeviceRegistryStore: vi.fn(() => ({
    isInitialized: () => true,
    exportForSync: () => new Uint8Array([]),
    handleSyncUpdate: vi.fn(),
    getDevice: vi.fn(),
    revokeDevice: vi.fn(),
    renameDevice: vi.fn(),
  })),
  verifyRevocation: vi.fn().mockResolvedValue(true),
  blockDevice: vi.fn(),
}));

describe('LocalSyncContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LocalSyncProvider>{children}</LocalSyncProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocStore.setLocalSyncBroadcast.mockClear();
    mockDocStore.handleLocalSyncUpdate.mockClear();
    mockDocStore.sync.mockClear();
    mockStore.clearCache.mockClear();
    mockRefreshData.mockClear();
    mockAddToast.mockClear();

    // Default mock returns
    vi.mocked(localSyncLib.getServerInfo).mockResolvedValue({
      running: false,
      port: 0,
    });
    vi.mocked(localSyncLib.getDeviceInfo).mockResolvedValue({
      deviceId: 'd1',
      deviceName: 'Device 1',
      fingerprint: 'f1',
      server: { running: false, port: 0 },
    });
    vi.mocked(localSyncLib.isDiscoveryRunning).mockResolvedValue(false);
    vi.mocked(localSyncLib.getDiscoveredPeers).mockResolvedValue([]);
    vi.mocked(localSyncLib.getPairedDevices).mockResolvedValue([]);
    vi.mocked(localSyncLib.startServer).mockResolvedValue(1234);
    vi.mocked(localSyncLib.startDiscovery).mockResolvedValue(undefined);
    vi.mocked(localSyncLib.reconnectAllPairedDevices).mockResolvedValue(
      undefined
    );
    vi.mocked(localSyncLib.prunePairedDevicesCache).mockResolvedValue(
      undefined
    );

    // Event listeners return unlisten functions
    const unlisten = vi.fn();
    vi.mocked(localSyncLib.onPeerDiscovered).mockResolvedValue(unlisten);
    vi.mocked(localSyncLib.onPeerLost).mockResolvedValue(unlisten);
    vi.mocked(localSyncLib.onDiscoveryError).mockResolvedValue(unlisten);
    vi.mocked(localSyncLib.onPeerConnected).mockResolvedValue(unlisten);
    vi.mocked(localSyncLib.onPeerDisconnected).mockResolvedValue(unlisten);
    vi.mocked(localSyncLib.onSyncMessage).mockResolvedValue(unlisten);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useLocalSync(), { wrapper });
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.status).toBe('off');
  });

  it('should enable local sync', async () => {
    vi.mocked(localSyncLib.startServer).mockResolvedValue(1234);

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    expect(localSyncLib.startServer).toHaveBeenCalled();
    expect(localSyncLib.startDiscovery).toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.serverPort).toBe(1234);

    // Check integration with docStore
    expect(mockDocStore.setLocalSyncBroadcast).toHaveBeenCalled();
  });

  it('should disable local sync', async () => {
    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable(); // Enable first
    });

    await act(async () => {
      await result.current.disable();
    });

    expect(localSyncLib.stopDiscovery).toHaveBeenCalled();
    expect(localSyncLib.stopServer).toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(false);
    expect(mockDocStore.setLocalSyncBroadcast).toHaveBeenCalledWith(null);
  });

  it('should broadcast update', async () => {
    const { result } = renderHook(() => useLocalSync(), { wrapper });

    // Needs to be enabled to broadcast
    await act(async () => {
      await result.current.enable();
    });

    const data = new Uint8Array([1, 2, 3]);
    vi.mocked(localSyncLib.broadcastSync).mockResolvedValue(2);

    await act(async () => {
      const count = await result.current.broadcastUpdate(data);
      expect(count).toBe(2);
    });

    expect(localSyncLib.broadcastSync).toHaveBeenCalledWith(data);
  });

  it('should handle incoming sync messages', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    expect(messageHandler).toBeDefined();

    // Simulate incoming UPDATE message
    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.UPDATE,
        payload: [10, 20],
      });
    });

    // Verify docStore handler was called
    expect(mockDocStore.handleLocalSyncUpdate).toHaveBeenCalledWith(
      new Uint8Array([10, 20])
    );
  });

  it('should handle DEVICE_REGISTRY message type', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    // Import and set up mock before creating the hook
    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(true),
      handleSyncUpdate: vi.fn(),
    };
    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.DEVICE_REGISTRY,
        payload: [1, 2, 3],
      });
    });

    expect(mockDeviceStore.handleSyncUpdate).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3])
    );
  });

  it('should handle DEVICE_REVOKE message with valid signature', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(true),
      getDevice: vi.fn(),
      revokeDevice: vi.fn(),
    };

    mockDeviceStore.getDevice.mockReturnValue({
      deviceId: 'revoking-device',
      name: 'Revoking Device',
      publicSigningKey: 'pub-key',
    });

    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );
    vi.mocked(devicesModule.verifyRevocation).mockResolvedValue(true);

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    const revokePayload = {
      deviceId: 'revoked-device',
      revokedAt: Date.now(),
      revokedBy: 'revoking-device',
      reason: 'compromised',
      signature: 'valid-signature',
    };

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.DEVICE_REVOKE,
        payload: Array.from(
          new TextEncoder().encode(JSON.stringify(revokePayload))
        ),
      });
    });

    expect(devicesModule.verifyRevocation).toHaveBeenCalled();
    expect(mockDeviceStore.revokeDevice).toHaveBeenCalledWith(revokePayload);
    expect(devicesModule.blockDevice).toHaveBeenCalledWith('revoked-device');
  });

  it('should reject DEVICE_REVOKE with invalid signature', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(true),
      getDevice: vi.fn(),
      revokeDevice: vi.fn(),
    };

    mockDeviceStore.getDevice.mockReturnValue({
      deviceId: 'revoking-device',
      name: 'Revoking Device',
      publicSigningKey: 'pub-key',
    });

    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );
    // Invalid signature
    vi.mocked(devicesModule.verifyRevocation).mockResolvedValue(false);

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    const revokePayload = {
      deviceId: 'revoked-device',
      revokedAt: Date.now(),
      revokedBy: 'revoking-device',
      reason: 'compromised',
      signature: 'invalid-signature',
    };

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.DEVICE_REVOKE,
        payload: Array.from(
          new TextEncoder().encode(JSON.stringify(revokePayload))
        ),
      });
    });

    expect(devicesModule.verifyRevocation).toHaveBeenCalled();
    expect(mockDeviceStore.revokeDevice).not.toHaveBeenCalled();
    expect(devicesModule.blockDevice).not.toHaveBeenCalled();
  });

  it('should handle DEVICE_RENAME message type', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(true),
      renameDevice: vi.fn(),
    };

    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    const renamePayload = {
      deviceId: 'device-1',
      newName: 'New Device Name',
      renamedAt: Date.now(),
    };

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.DEVICE_RENAME,
        payload: Array.from(
          new TextEncoder().encode(JSON.stringify(renamePayload))
        ),
      });
    });

    expect(mockDeviceStore.renameDevice).toHaveBeenCalledWith(
      'device-1',
      'New Device Name'
    );
  });

  it('should handle peer discovery event', async () => {
    let discoveryHandler: any;
    vi.mocked(localSyncLib.onPeerDiscovered).mockImplementation(
      async (cb: any) => {
        discoveryHandler = cb;
        return () => {};
      }
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    expect(discoveryHandler).toBeDefined();

    act(() => {
      discoveryHandler({
        deviceId: 'peer-1',
        deviceName: 'Peer Device',
        fingerprint: 'abc123',
        addresses: ['192.168.1.100:8080'],
      });
    });

    expect(result.current.discoveredPeers).toHaveLength(1);
    expect(result.current.discoveredPeers[0].deviceId).toBe('peer-1');
  });

  it('should handle peer lost event', async () => {
    let discoveryHandler: any;

    let lostHandler: any;
    vi.mocked(localSyncLib.onPeerDiscovered).mockImplementation(
      async (cb: any) => {
        discoveryHandler = cb;
        return () => {};
      }
    );
    vi.mocked(localSyncLib.onPeerLost).mockImplementation(async (cb: any) => {
      lostHandler = cb;
      return () => {};
    });

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    // Add a peer
    act(() => {
      discoveryHandler({
        deviceId: 'peer-1',
        deviceName: 'Peer Device',
        fingerprint: 'abc123',
        addresses: ['192.168.1.100:8080'],
      });
    });

    expect(result.current.discoveredPeers).toHaveLength(1);

    // Remove the peer
    act(() => {
      lostHandler({ deviceId: 'peer-1' });
    });

    expect(result.current.discoveredPeers).toHaveLength(0);
  });

  it('should handle peer connected event', async () => {
    let connectedHandler: any;
    vi.mocked(localSyncLib.onPeerConnected).mockImplementation(
      async (cb: any) => {
        connectedHandler = cb;
        return () => {};
      }
    );

    // Mock broadcastDeviceRegistry to avoid errors
    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(true),
      exportForSync: vi.fn().mockReturnValue(new Uint8Array([])),
    };
    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );
    vi.mocked(localSyncLib.broadcastDeviceRegistry).mockResolvedValue(1);

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    expect(connectedHandler).toBeDefined();
    const initialCount = result.current.connectedPeerCount;

    await act(async () => {
      await connectedHandler({
        deviceId: 'peer-1',
        deviceName: 'Peer Device',
      });
    });

    expect(result.current.connectedPeerCount).toBe(initialCount + 1);
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'Connected to Peer Device',
      duration: 3000,
    });
  });

  it('should handle peer disconnected event', async () => {
    let disconnectedHandler: any;
    vi.mocked(localSyncLib.onPeerDisconnected).mockImplementation(
      async (cb: any) => {
        disconnectedHandler = cb;
        return () => {};
      }
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    // Manually set count to 2
    result.current.refreshConnectedCount();
    vi.mocked(localSyncLib.getPeerCount).mockResolvedValue(2);
    await act(async () => {
      await result.current.refreshConnectedCount();
    });

    expect(result.current.connectedPeerCount).toBe(2);

    act(() => {
      disconnectedHandler({ deviceId: 'peer-1' });
    });

    expect(result.current.connectedPeerCount).toBe(1);
  });

  it('should handle discovery error event', async () => {
    let errorHandler: any;
    vi.mocked(localSyncLib.onDiscoveryError).mockImplementation(
      async (cb: any) => {
        errorHandler = cb;
        return () => {};
      }
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    expect(errorHandler).toBeDefined();

    act(() => {
      errorHandler({ message: 'Discovery failed' });
    });

    expect(result.current.error).toBe('Discovery failed');
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Local sync error: Discovery failed',
      duration: 5000,
    });
  });

  it('should handle enable errors from startServer', async () => {
    vi.mocked(localSyncLib.startServer).mockRejectedValue(
      new Error('Port already in use')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Port already in use');
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Failed to enable local sync: Port already in use',
      duration: 5000,
    });
  });

  it('should handle enable errors from startDiscovery', async () => {
    vi.mocked(localSyncLib.startServer).mockResolvedValue(1234);
    vi.mocked(localSyncLib.startDiscovery).mockRejectedValue(
      new Error('mDNS not available')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('mDNS not available');
  });

  it('should handle disable errors gracefully', async () => {
    vi.mocked(localSyncLib.startServer).mockResolvedValue(1234);
    vi.mocked(localSyncLib.stopDiscovery).mockRejectedValue(
      new Error('Stop error')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    await act(async () => {
      await result.current.disable();
    });

    // Should still complete disable despite error
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.status).toBe('off');
  });

  it('should generate QR code for pairing', async () => {
    const qrResponse = {
      pngBase64: 'base64-qr-image',
      payload: 'qr-payload-data',
      fingerprint: 'f1',
      manualDetails: {
        deviceName: 'Device 1',
        ips: ['192.168.1.1'],
        port: 1234,
        code: 'A1B2-C3D4',
      },
    };
    vi.mocked(localSyncLib.generatePairingQr).mockResolvedValue(qrResponse);

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.generateQrCode();
    });

    expect(response).toEqual(qrResponse);
  });

  it('should parse QR code payload', async () => {
    const pairingInfo = {
      deviceId: 'd2',
      deviceName: 'Device 2',
      ips: ['192.168.1.100'],
      port: 1234,
      fingerprint: 'f2',
      fingerprintMatch: true,
    };
    vi.mocked(localSyncLib.parsePairingQr).mockResolvedValue(pairingInfo);

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    let info;
    await act(async () => {
      info = await result.current.parseQrCode('qr-payload');
    });

    expect(info).toEqual(pairingInfo);
  });

  it('should pair device via QR code', async () => {
    const pairingInfo = {
      deviceId: 'd2',
      deviceName: 'Device 2',
      ips: ['192.168.1.100'],
      port: 1234,
      fingerprint: 'f2',
      fingerprintMatch: true,
    };

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.pairDevice(pairingInfo);
    });

    expect(localSyncLib.connectViaPairing).toHaveBeenCalledWith(pairingInfo);
    expect(localSyncLib.getPairedDevices).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'Paired with Device 2',
      duration: 3000,
    });
  });

  it('should handle pairing errors', async () => {
    const pairingInfo = {
      deviceId: 'd2',
      deviceName: 'Device 2',
      ips: ['192.168.1.100'],
      port: 1234,
      fingerprint: 'f2',
      fingerprintMatch: false,
    };
    vi.mocked(localSyncLib.connectViaPairing).mockRejectedValue(
      new Error('Invalid pairing code')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await expect(
      act(async () => {
        await result.current.pairDevice(pairingInfo);
      })
    ).rejects.toThrow('Invalid pairing code');

    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Invalid pairing code',
      duration: 5000,
    });
  });

  it('should pair device manually', async () => {
    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.pairDeviceManually('192.168.1.100', 1234, 'CODE123');
    });

    expect(localSyncLib.connectViaManualPairing).toHaveBeenCalledWith(
      '192.168.1.100',
      1234,
      'CODE123'
    );
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'Device paired successfully',
      duration: 3000,
    });
  });

  it('should unpair device', async () => {
    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.unpairDevice('device-to-remove');
    });

    expect(localSyncLib.removePairedDevice).toHaveBeenCalledWith(
      'device-to-remove'
    );
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'Device unpaired',
      duration: 3000,
    });
  });

  it('should reconnect to specific device', async () => {
    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.reconnectDevice('device-to-reconnect');
    });

    expect(localSyncLib.reconnectPairedDevice).toHaveBeenCalledWith(
      'device-to-reconnect'
    );
    expect(localSyncLib.prunePairedDevicesCache).toHaveBeenCalled();
  });

  it('should handle reconnect device failure', async () => {
    vi.mocked(localSyncLib.reconnectPairedDevice).mockRejectedValue(
      new Error('Device offline')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await expect(
      act(async () => {
        await result.current.reconnectDevice('offline-device');
      })
    ).rejects.toThrow('Device offline');
  });

  it('should update existing peer in discovered list', async () => {
    let discoveryHandler: any;
    vi.mocked(localSyncLib.onPeerDiscovered).mockImplementation(
      async (cb: any) => {
        discoveryHandler = cb;
        return () => {};
      }
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    // Add initial peer
    act(() => {
      discoveryHandler({
        deviceId: 'peer-1',
        deviceName: 'Peer Device',
        fingerprint: 'abc123',
        addresses: ['192.168.1.100:8080'],
      });
    });

    expect(result.current.discoveredPeers).toHaveLength(1);

    // Update the same peer with new info
    act(() => {
      discoveryHandler({
        deviceId: 'peer-1',
        deviceName: 'Updated Peer Name',
        fingerprint: 'abc123',
        addresses: ['192.168.1.101:8080'],
      });
    });

    expect(result.current.discoveredPeers).toHaveLength(1);
    expect(result.current.discoveredPeers[0].deviceName).toBe(
      'Updated Peer Name'
    );
  });

  it('should handle peer connected when device registry not initialized', async () => {
    let connectedHandler: any;
    vi.mocked(localSyncLib.onPeerConnected).mockImplementation(
      async (cb: any) => {
        connectedHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(false),
      exportForSync: vi.fn(),
    };
    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    await act(async () => {
      await connectedHandler({
        deviceId: 'peer-1',
        deviceName: 'Peer Device',
      });
    });

    // exportForSync should NOT be called since store is not initialized
    expect(mockDeviceStore.exportForSync).not.toHaveBeenCalled();
  });

  it('should handle DEVICE_REGISTRY message when store not initialized', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(false),
      handleSyncUpdate: vi.fn(),
    };
    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.DEVICE_REGISTRY,
        payload: [1, 2, 3],
      });
    });

    // handleSyncUpdate should NOT be called since store is not initialized
    expect(mockDeviceStore.handleSyncUpdate).not.toHaveBeenCalled();
  });

  it('should handle DEVICE_REVOKE when store not initialized', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(false),
      getDevice: vi.fn(),
      revokeDevice: vi.fn(),
    };
    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    const revokePayload = {
      deviceId: 'revoked-device',
      revokedAt: Date.now(),
      revokedBy: 'revoking-device',
      reason: 'compromised',
      signature: 'signature',
    };

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.DEVICE_REVOKE,
        payload: Array.from(
          new TextEncoder().encode(JSON.stringify(revokePayload))
        ),
      });
    });

    // Should break early, not call revokeDevice
    expect(mockDeviceStore.revokeDevice).not.toHaveBeenCalled();
  });

  it('should handle DEVICE_REVOKE from unknown device', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(true),
      getDevice: vi.fn().mockReturnValue(null), // Unknown device
      revokeDevice: vi.fn(),
    };
    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    const revokePayload = {
      deviceId: 'revoked-device',
      revokedAt: Date.now(),
      revokedBy: 'unknown-device',
      reason: 'compromised',
      signature: 'signature',
    };

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.DEVICE_REVOKE,
        payload: Array.from(
          new TextEncoder().encode(JSON.stringify(revokePayload))
        ),
      });
    });

    // Should break early when revoking device not found
    expect(mockDeviceStore.revokeDevice).not.toHaveBeenCalled();
  });

  it('should handle DEVICE_RENAME when store not initialized', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(false),
      renameDevice: vi.fn(),
    };
    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    const renamePayload = {
      deviceId: 'device-1',
      newName: 'New Name',
      renamedAt: Date.now(),
    };

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: MessageType.DEVICE_RENAME,
        payload: Array.from(
          new TextEncoder().encode(JSON.stringify(renamePayload))
        ),
      });
    });

    // renameDevice should NOT be called since store is not initialized
    expect(mockDeviceStore.renameDevice).not.toHaveBeenCalled();
  });

  it('should handle unknown message type', async () => {
    let messageHandler: any;
    vi.mocked(localSyncLib.onSyncMessage).mockImplementation(
      async (cb: any) => {
        messageHandler = cb;
        return () => {};
      }
    );

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalSync(), { wrapper });
    await act(async () => {
      await result.current.enable();
    });

    await act(async () => {
      await messageHandler({
        deviceId: 'peer1',
        msgType: 999, // Unknown type
        payload: [1, 2, 3],
      });
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[LocalSync] Unknown message type:',
      999
    );
    consoleLogSpy.mockRestore();
  });

  it('should return 0 when broadcastUpdate called while disabled', async () => {
    const { result } = renderHook(() => useLocalSync(), { wrapper });

    // Not enabled - should return 0 without calling broadcastSync
    let count;
    await act(async () => {
      count = await result.current.broadcastUpdate(new Uint8Array([1, 2, 3]));
    });

    expect(count).toBe(0);
    expect(localSyncLib.broadcastSync).not.toHaveBeenCalled();
  });

  it('should handle broadcastUpdate errors', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    vi.mocked(localSyncLib.broadcastSync).mockRejectedValue(
      new Error('Broadcast failed')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    let count;
    await act(async () => {
      count = await result.current.broadcastUpdate(new Uint8Array([1, 2, 3]));
    });

    expect(count).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[LocalSync] Failed to broadcast sync:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('should restore state when server is already running on mount', async () => {
    vi.mocked(localSyncLib.getServerInfo).mockResolvedValue({
      running: true,
      port: 5678,
    });
    vi.mocked(localSyncLib.isDiscoveryRunning).mockResolvedValue(true);
    vi.mocked(localSyncLib.getDeviceInfo).mockResolvedValue({
      deviceId: 'd1',
      deviceName: 'Device 1',
      fingerprint: 'f1',
      server: { running: true, port: 5678 },
    });
    vi.mocked(localSyncLib.getDiscoveredPeers).mockResolvedValue([
      {
        deviceId: 'peer-1',
        deviceName: 'Peer 1',
        fingerprint: 'fp1',
        addresses: ['192.168.1.1:1234'],
        port: 1234,
        lastSeen: Date.now(),
      },
    ]);

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    // Wait for initial state check
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.serverPort).toBe(5678);
    expect(result.current.status).toBe('discovering');
    expect(result.current.discoveredPeers).toHaveLength(1);
  });

  it('should handle manual pairing error with non-Error value', async () => {
    vi.mocked(localSyncLib.connectViaManualPairing).mockRejectedValue(
      'Non-error failure'
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await expect(
      act(async () => {
        await result.current.pairDeviceManually(
          '192.168.1.100',
          1234,
          'CODE123'
        );
      })
    ).rejects.toBe('Non-error failure');

    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Failed to pair device',
      duration: 5000,
    });
  });

  it('should handle unpair device error with non-Error value', async () => {
    vi.mocked(localSyncLib.removePairedDevice).mockRejectedValue(
      'Non-error unpair failure'
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await expect(
      act(async () => {
        await result.current.unpairDevice('device-id');
      })
    ).rejects.toBe('Non-error unpair failure');

    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Failed to unpair device',
      duration: 5000,
    });
  });

  it('should handle enable error with non-Error value', async () => {
    vi.mocked(localSyncLib.startServer).mockRejectedValue('Non-error enable');

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    expect(result.current.error).toBe('Unknown error');
    expect(result.current.status).toBe('error');
  });

  it('should handle reconnect all paired devices failure during enable', async () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    vi.mocked(localSyncLib.startServer).mockResolvedValue(1234);
    vi.mocked(localSyncLib.reconnectAllPairedDevices).mockRejectedValue(
      new Error('Reconnect failed')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    // Should still be enabled despite reconnect failure
    expect(result.current.isEnabled).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[LocalSync] Failed to reconnect paired devices:',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });

  it('should handle prune cache failure during enable', async () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    vi.mocked(localSyncLib.startServer).mockResolvedValue(1234);
    vi.mocked(localSyncLib.prunePairedDevicesCache).mockRejectedValue(
      new Error('Prune failed')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    // Should still be enabled despite prune failure
    expect(result.current.isEnabled).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[LocalSync] Failed to prune cache:',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });

  it('should handle stopServer error during disable', async () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    vi.mocked(localSyncLib.startServer).mockResolvedValue(1234);
    vi.mocked(localSyncLib.stopServer).mockRejectedValue(
      new Error('Stop server error')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    await act(async () => {
      await result.current.disable();
    });

    // Should still complete disable
    expect(result.current.isEnabled).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[LocalSync] Error stopping server:',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });

  it('should prevent concurrent enable calls', async () => {
    vi.mocked(localSyncLib.startServer).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(1234), 100))
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    // Start two enable calls concurrently
    await act(async () => {
      const p1 = result.current.enable();
      const p2 = result.current.enable();
      await Promise.all([p1, p2]);
    });

    // startServer should only be called once
    expect(localSyncLib.startServer).toHaveBeenCalledTimes(1);
  });

  it('should update status to connected when peers connect', async () => {
    let connectedHandler: any;
    vi.mocked(localSyncLib.onPeerConnected).mockImplementation(
      async (cb: any) => {
        connectedHandler = cb;
        return () => {};
      }
    );

    const devicesModule = await import('@/lib/devices');
    const mockDeviceStore = {
      isInitialized: vi.fn().mockReturnValue(true),
      exportForSync: vi.fn().mockReturnValue(new Uint8Array([])),
    };
    vi.mocked(devicesModule.getDeviceRegistryStore).mockReturnValue(
      mockDeviceStore as any
    );
    vi.mocked(localSyncLib.broadcastDeviceRegistry).mockResolvedValue(1);

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.enable();
    });

    // Status might already be 'connected' if peer count > 0, or 'discovering'
    // The status update effect sets 'connected' when connectedPeerCount > 0
    const statusBeforePeer = result.current.status;
    expect(['discovering', 'connected']).toContain(statusBeforePeer);

    await act(async () => {
      await connectedHandler({
        deviceId: 'peer-1',
        deviceName: 'Peer Device',
      });
    });

    // After peer connects, status should be 'connected'
    expect(result.current.status).toBe('connected');
  });

  it('should handle prune cache failure during reconnectDevice', async () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    // Reset reconnectPairedDevice to success first
    vi.mocked(localSyncLib.reconnectPairedDevice).mockResolvedValue(undefined);
    vi.mocked(localSyncLib.prunePairedDevicesCache).mockRejectedValue(
      new Error('Prune failed')
    );

    const { result } = renderHook(() => useLocalSync(), { wrapper });

    await act(async () => {
      await result.current.reconnectDevice('device-id');
    });

    expect(localSyncLib.reconnectPairedDevice).toHaveBeenCalledWith(
      'device-id'
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[LocalSync] Failed to prune cache:',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });
});
