/**
 * Device Registry Context
 *
 * Provides device registry state and actions to React components.
 * Manages device records, revocations, and sync integration.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  DeviceRegistryStore,
  getDeviceRegistryStore,
  type DeviceRecord,
  type DeviceInfo,
  type DeviceConnectionStatus,
  type DeviceRevokePayload,
  type DeviceRenamePayload,
  getSigningPublicKey,
  createSignedRevocation,
  verifyRevocation,
  blockDevice,
} from '@/lib/devices';
import { getDeviceId } from '@/lib/sync';
import { broadcastDeviceRegistry, broadcastDeviceRevoke } from '@/lib/sync/local';
import { useSyncContextSafe } from './SyncContext';
import { useToast } from './ToastContext';

interface DeviceRegistryContextValue {
  /** All known devices */
  devices: DeviceInfo[];
  /** Current device ID */
  currentDeviceId: string;
  /** Whether the registry is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether this device has been revoked */
  isRevoked: boolean;

  /** Register the current device */
  registerCurrentDevice: () => Promise<void>;
  /** Update a device's name */
  renameDevice: (deviceId: string, newName: string) => Promise<void>;
  /** Revoke a device (requires confirmation) */
  revokeDevice: (deviceId: string, reason?: string) => Promise<boolean>;
  /** Get device info by ID */
  getDevice: (deviceId: string) => DeviceInfo | undefined;
  /** Refresh device list from store */
  refresh: () => Promise<void>;
}

const DeviceRegistryContext = createContext<DeviceRegistryContextValue | null>(null);

interface DeviceRegistryProviderProps {
  children: ReactNode;
}

export function DeviceRegistryProvider({ children }: DeviceRegistryProviderProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<DeviceRegistryStore | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const syncContext = useSyncContextSafe();
  const syncClient = syncContext?.syncClient ?? null;
  const { addToast } = useToast();

  const currentDeviceId = getDeviceId();

  // Ref to track if sync callbacks are wired up
  const syncCallbacksWiredRef = useRef(false);

  // Initialize store
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const registryStore = getDeviceRegistryStore();
        // Initialize if not already initialized
        if (!registryStore.isInitialized()) {
          await registryStore.initialize(currentDeviceId);
        }
        if (mounted) {
          setStore(registryStore);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize device registry');
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [currentDeviceId]);

  // Load devices when store is ready
  const loadDevices = useCallback(async () => {
    if (!store) return;

    try {
      const records = store.getAllDevices();
      const revocations = store.getRevokedDeviceIds();
      const revokedSet = new Set(revocations);

      // Convert records to DeviceInfo with connection status
      const deviceInfos: DeviceInfo[] = records.map((record) => ({
        ...record,
        isCurrentDevice: record.deviceId === currentDeviceId,
        status: 'offline' as DeviceConnectionStatus,
        isRevoked: revokedSet.has(record.deviceId),
      }));

      // Sort: current device first, then by last seen
      deviceInfos.sort((a, b) => {
        if (a.isCurrentDevice) return -1;
        if (b.isCurrentDevice) return 1;
        return b.lastSeen - a.lastSeen;
      });

      setDevices(deviceInfos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    }
  }, [store, currentDeviceId]);

  // Load devices when store changes
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Subscribe to store updates
  useEffect(() => {
    if (!store) return;

    // Use onRegistryChange callback
    store.onRegistryChange(() => {
      loadDevices();
    });

    // No explicit unsubscribe - callback is replaced on each subscription
  }, [store, loadDevices]);

  // Wire up sync client callbacks for device messages
  useEffect(() => {
    if (!syncClient || !store || syncCallbacksWiredRef.current) return;

    console.log('[DeviceRegistry] Wiring up sync client callbacks');
    syncCallbacksWiredRef.current = true;

    // Handle full registry sync from relay
    syncClient.onDeviceRegistry((data: Uint8Array) => {
      console.log('[DeviceRegistry] Received full registry sync');
      store.handleSyncUpdate(data);
    });

    // Handle incremental registry updates
    syncClient.onDeviceRegistryUpdate((data: Uint8Array) => {
      console.log('[DeviceRegistry] Received incremental registry update');
      store.handleSyncUpdate(data);
    });

    // Handle revocation from another device
    syncClient.onDeviceRevokeReceived(async (payload: DeviceRevokePayload) => {
      console.log('[DeviceRegistry] Received revocation for:', payload.deviceId);

      // Get the revoking device to verify signature
      const revokingDevice = store.getDevice(payload.revokedBy);
      if (!revokingDevice) {
        console.warn('[DeviceRegistry] Revocation from unknown device:', payload.revokedBy);
        return;
      }

      // Verify signature
      try {
        const isValid = await verifyRevocation(
          payload.deviceId,
          payload.revokedAt,
          payload.revokedBy,
          payload.signature,
          revokingDevice.publicSigningKey
        );

        if (!isValid) {
          console.error('[DeviceRegistry] Invalid revocation signature');
          return;
        }

        // Apply revocation to store and blocklist
        store.revokeDevice({
          deviceId: payload.deviceId,
          revokedAt: payload.revokedAt,
          revokedBy: payload.revokedBy,
          reason: payload.reason,
          signature: payload.signature,
        });

        // Block locally for P2P
        await blockDevice(payload.deviceId);
        console.log('[DeviceRegistry] Applied revocation for:', payload.deviceId);
      } catch (err) {
        console.error('[DeviceRegistry] Failed to verify/apply revocation:', err);
      }
    });

    // Handle device rename
    syncClient.onDeviceRenameReceived((payload: DeviceRenamePayload) => {
      console.log('[DeviceRegistry] Received rename for:', payload.deviceId, '->', payload.newName);
      store.renameDevice(payload.deviceId, payload.newName);
    });

    // Handle this device being revoked
    syncClient.onDeviceRevoked((deviceId: string, reason?: string) => {
      console.log('[DeviceRegistry] This device has been revoked!', deviceId, reason);

      // Verify it's actually this device
      if (deviceId !== currentDeviceId) {
        console.warn('[DeviceRegistry] Revocation callback for different device:', deviceId);
        return;
      }

      setIsRevoked(true);

      // Show persistent error toast
      addToast({
        type: 'error',
        message: reason
          ? `This device has been revoked: ${reason}`
          : 'This device has been revoked from sync',
        duration: 0, // Persistent - user must acknowledge
      });

      // Disconnect from sync
      syncContext?.disconnect();
    });

    // Reset ref when dependencies change
    return () => {
      syncCallbacksWiredRef.current = false;
    };
  }, [syncClient, store, currentDeviceId, addToast, syncContext]);

  // Wire up store's broadcast callback for automatic sync
  useEffect(() => {
    if (!store) return;

    // Set up broadcast callback to sync registry changes to both relay and P2P
    store.setBroadcastCallback(async (data: Uint8Array) => {
      console.log('[DeviceRegistry] Broadcasting registry update');

      // Broadcast to cloud relay
      if (syncClient) {
        syncClient.sendDeviceRegistryUpdate(data);
      }

      // Broadcast to P2P peers
      try {
        const peerCount = await broadcastDeviceRegistry(data);
        if (peerCount > 0) {
          console.log('[DeviceRegistry] Broadcast to', peerCount, 'P2P peers');
        }
      } catch (err) {
        // P2P might not be enabled, that's ok
        console.debug('[DeviceRegistry] P2P broadcast failed:', err);
      }
    });

    return () => {
      // Clear callback on cleanup
      store.setBroadcastCallback(async () => {});
    };
  }, [store, syncClient]);

  // Register current device
  const registerCurrentDevice = useCallback(async () => {
    if (!store) {
      throw new Error('Device registry not initialized');
    }

    try {
      // Get signing public key
      const signingPublicKey = await getSigningPublicKey();

      // Get platform
      const platform = getPlatform();

      // Get device name from platform
      const deviceName = getDefaultDeviceName();

      // Register the device
      store.registerCurrentDevice({
        name: deviceName,
        platform,
        appVersion: '0.1.0', // TODO: Get from app config
        publicSigningKey: signingPublicKey,
      });

      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register device');
      throw err;
    }
  }, [store, loadDevices]);

  // Rename device
  const renameDevice = useCallback(async (deviceId: string, newName: string) => {
    if (!store) {
      throw new Error('Device registry not initialized');
    }

    const device = store.getDevice(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    store.renameDevice(deviceId, newName);

    // Broadcast rename to cloud relay
    if (syncClient) {
      syncClient.sendDeviceRename({
        deviceId,
        newName,
        renamedAt: Date.now(),
      });
      console.log('[DeviceRegistry] Broadcast rename via relay for:', deviceId);
    }

    await loadDevices();
  }, [store, loadDevices, syncClient]);

  // Revoke device
  const revokeDevice = useCallback(async (deviceId: string, reason?: string): Promise<boolean> => {
    if (!store) {
      throw new Error('Device registry not initialized');
    }

    if (deviceId === currentDeviceId) {
      throw new Error('Cannot revoke current device');
    }

    try {
      // Create signed revocation via Tauri
      const revocation = await createSignedRevocation(deviceId, currentDeviceId, reason);

      // Add to store
      store.revokeDevice(revocation);

      // Block locally for P2P
      await blockDevice(deviceId);

      // Broadcast revocation to cloud relay
      if (syncClient) {
        syncClient.sendDeviceRevoke({
          deviceId: revocation.deviceId,
          revokedAt: revocation.revokedAt,
          revokedBy: revocation.revokedBy,
          reason: revocation.reason,
          signature: revocation.signature,
        });
        console.log('[DeviceRegistry] Broadcast revocation via relay for:', deviceId);
      }

      // Broadcast revocation to P2P peers
      try {
        const payload: DeviceRevokePayload = {
          deviceId: revocation.deviceId,
          revokedAt: revocation.revokedAt,
          revokedBy: revocation.revokedBy,
          reason: revocation.reason,
          signature: revocation.signature,
        };
        const peerCount = await broadcastDeviceRevoke(JSON.stringify(payload));
        if (peerCount > 0) {
          console.log('[DeviceRegistry] Broadcast revocation to', peerCount, 'P2P peers');
        }
      } catch (err) {
        // P2P might not be enabled, that's ok
        console.debug('[DeviceRegistry] P2P revocation broadcast failed:', err);
      }

      await loadDevices();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke device');
      return false;
    }
  }, [store, currentDeviceId, loadDevices, syncClient]);

  // Get device by ID
  const getDevice = useCallback((deviceId: string): DeviceInfo | undefined => {
    return devices.find(d => d.deviceId === deviceId);
  }, [devices]);

  // Refresh devices
  const refresh = useCallback(async () => {
    await loadDevices();
  }, [loadDevices]);

  const value: DeviceRegistryContextValue = {
    devices,
    currentDeviceId,
    isLoading,
    error,
    isRevoked,
    registerCurrentDevice,
    renameDevice,
    revokeDevice,
    getDevice,
    refresh,
  };

  return (
    <DeviceRegistryContext.Provider value={value}>
      {children}
    </DeviceRegistryContext.Provider>
  );
}

/**
 * Hook to access device registry context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDeviceRegistry(): DeviceRegistryContextValue {
  const context = useContext(DeviceRegistryContext);
  if (!context) {
    throw new Error('useDeviceRegistry must be used within a DeviceRegistryProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if not in provider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDeviceRegistrySafe(): DeviceRegistryContextValue | null {
  return useContext(DeviceRegistryContext);
}

/**
 * Get current platform
 */
function getPlatform(): DeviceRecord['platform'] {
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('win')) return 'windows';
    if (ua.includes('linux')) return 'linux';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    if (ua.includes('android')) return 'android';
  }
  return 'web';
}

/**
 * Get a default device name based on platform
 */
function getDefaultDeviceName(): string {
  const platform = getPlatform();
  const platformNames: Record<string, string> = {
    macos: 'Mac',
    windows: 'Windows PC',
    linux: 'Linux PC',
    ios: 'iPhone/iPad',
    android: 'Android Device',
    web: 'Web Browser',
  };
  return platformNames[platform] || 'Unknown Device';
}
