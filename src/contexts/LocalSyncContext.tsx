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
  startServer,
  stopServer,
  getServerInfo,
  getDeviceInfo,
  startDiscovery,
  stopDiscovery,
  getDiscoveredPeers,
  isDiscoveryRunning,
  onPeerDiscovered,
  onPeerLost,
  onDiscoveryError,
  onPeerConnected,
  onPeerDisconnected,
  onSyncMessage,
  broadcastSync,
  broadcastDeviceRegistry,
  getPeerCount,
  type DiscoveredPeer,
  type DeviceInfo,
} from '@/lib/sync/local';
import { MessageType } from '@/lib/sync/protocol';
import {
  getDeviceRegistryStore,
  type DeviceRevokePayload,
  type DeviceRenamePayload,
  verifyRevocation,
  blockDevice,
} from '@/lib/devices';
import { useToast } from './ToastContext';
import { useObjects } from './ObjectContext';

type LocalSyncStatus = 'off' | 'starting' | 'discovering' | 'connected' | 'error';

interface LocalSyncContextValue {
  /** Whether local sync feature is enabled */
  isEnabled: boolean;
  /** Current local sync status */
  status: LocalSyncStatus;
  /** Whether discovery is actively running */
  isDiscovering: boolean;
  /** List of discovered peers on the network */
  discoveredPeers: DiscoveredPeer[];
  /** Number of connected peers for sync */
  connectedPeerCount: number;
  /** This device's info (id, name, fingerprint) */
  deviceInfo: DeviceInfo | null;
  /** The port the server is listening on */
  serverPort: number | null;
  /** Error message if any */
  error: string | null;
  /** Enable local sync (starts server and discovery) */
  enable: () => Promise<void>;
  /** Disable local sync (stops server and discovery) */
  disable: () => Promise<void>;
  /** Refresh discovered peers list */
  refreshPeers: () => Promise<void>;
  /** Refresh connected peer count (call after connecting to a peer) */
  refreshConnectedCount: () => Promise<void>;
  /** Broadcast sync data to all connected local peers */
  broadcastUpdate: (data: Uint8Array) => Promise<number>;
  /** Set callback for when sync data is received from a peer */
  setOnSyncReceived: (callback: ((data: Uint8Array) => void) | null) => void;
}

const LocalSyncContext = createContext<LocalSyncContextValue | null>(null);

interface LocalSyncProviderProps {
  children: ReactNode;
}

export function LocalSyncProvider({ children }: LocalSyncProviderProps) {
  const { addToast } = useToast();
  const { docStore, refreshData } = useObjects();
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<LocalSyncStatus>('off');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredPeers, setDiscoveredPeers] = useState<DiscoveredPeer[]>([]);
  const [connectedPeerCount, setConnectedPeerCount] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlistenersRef = useRef<Array<() => void>>([]);
  const isStartingRef = useRef(false);
  const onSyncReceivedRef = useRef<((data: Uint8Array) => void) | null>(null);

  // Set up event listeners
  const setupEventListeners = useCallback(async () => {
    // Clean up existing listeners
    unlistenersRef.current.forEach((unlisten) => unlisten());
    unlistenersRef.current = [];

    try {
      const unlistenDiscovered = await onPeerDiscovered((event) => {
        setDiscoveredPeers((prev) => {
          // Update or add peer
          const existing = prev.findIndex((p) => p.deviceId === event.deviceId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = {
              ...event,
              lastSeen: Date.now(),
            };
            return updated;
          }
          return [...prev, { ...event, lastSeen: Date.now() }];
        });
      });

      const unlistenLost = await onPeerLost((event) => {
        setDiscoveredPeers((prev) =>
          prev.filter((p) => p.deviceId !== event.deviceId)
        );
      });

      const unlistenError = await onDiscoveryError((event) => {
        console.error('[LocalSync] Discovery error:', event.message);
        setError(event.message);
        addToast({
          type: 'error',
          message: `Local sync error: ${event.message}`,
          duration: 5000,
        });
      });

      // Listen for peer connections
      const unlistenPeerConnected = await onPeerConnected(async (event) => {
        console.log('[LocalSync] Peer connected:', event.deviceName);
        setConnectedPeerCount((prev) => prev + 1);
        addToast({
          type: 'success',
          message: `Connected to ${event.deviceName}`,
          duration: 3000,
        });

        // Exchange device registry with new peer
        try {
          const store = getDeviceRegistryStore();
          if (store.isInitialized()) {
            const registryData = store.exportForSync();
            const count = await broadcastDeviceRegistry(registryData);
            console.log('[LocalSync] Broadcast device registry to', count, 'peers');
          }
        } catch (err) {
          console.error('[LocalSync] Failed to broadcast device registry:', err);
        }
      });

      const unlistenPeerDisconnected = await onPeerDisconnected((event) => {
        console.log('[LocalSync] Peer disconnected:', event.deviceId);
        setConnectedPeerCount((prev) => Math.max(0, prev - 1));
      });

      // Listen for sync messages from peers
      const unlistenSyncMessage = await onSyncMessage(async (event) => {
        console.log('[LocalSync] Received sync from:', event.deviceId, 'type:', event.msgType);
        // Convert number[] to Uint8Array
        const data = new Uint8Array(event.payload);

        // Route based on message type
        switch (event.msgType) {
          case MessageType.UPDATE:
            // Regular data sync - forward to the callback
            if (onSyncReceivedRef.current) {
              onSyncReceivedRef.current(data);
            }
            break;

          case MessageType.DEVICE_REGISTRY:
          case MessageType.DEVICE_UPDATE:
            // Device registry sync - forward to device registry store
            console.log('[LocalSync] Received device registry from peer');
            try {
              const store = getDeviceRegistryStore();
              if (store.isInitialized()) {
                store.handleSyncUpdate(data);
              }
            } catch (err) {
              console.error('[LocalSync] Failed to handle device registry:', err);
            }
            break;

          case MessageType.DEVICE_REVOKE:
            // Device revocation from peer - verify and apply
            console.log('[LocalSync] Received device revocation from peer');
            try {
              const payload: DeviceRevokePayload = JSON.parse(new TextDecoder().decode(data));
              const store = getDeviceRegistryStore();
              if (!store.isInitialized()) break;

              // Get the revoking device to verify signature
              const revokingDevice = store.getDevice(payload.revokedBy);
              if (!revokingDevice) {
                console.warn('[LocalSync] Revocation from unknown device:', payload.revokedBy);
                break;
              }

              // Verify signature
              const isValid = await verifyRevocation(
                payload.deviceId,
                payload.revokedAt,
                payload.revokedBy,
                payload.signature,
                revokingDevice.publicSigningKey
              );

              if (!isValid) {
                console.error('[LocalSync] Invalid revocation signature');
                break;
              }

              // Apply revocation
              store.revokeDevice({
                deviceId: payload.deviceId,
                revokedAt: payload.revokedAt,
                revokedBy: payload.revokedBy,
                reason: payload.reason,
                signature: payload.signature,
              });

              // Block locally for P2P
              await blockDevice(payload.deviceId);
              console.log('[LocalSync] Applied P2P revocation for:', payload.deviceId);
            } catch (err) {
              console.error('[LocalSync] Failed to handle revocation:', err);
            }
            break;

          case MessageType.DEVICE_RENAME:
            // Device rename from peer
            console.log('[LocalSync] Received device rename from peer');
            try {
              const payload: DeviceRenamePayload = JSON.parse(new TextDecoder().decode(data));
              const store = getDeviceRegistryStore();
              if (store.isInitialized()) {
                store.renameDevice(payload.deviceId, payload.newName);
              }
            } catch (err) {
              console.error('[LocalSync] Failed to handle rename:', err);
            }
            break;

          default:
            // Unknown message type - ignore
            console.log('[LocalSync] Unknown message type:', event.msgType);
        }
      });

      unlistenersRef.current = [
        unlistenDiscovered,
        unlistenLost,
        unlistenError,
        unlistenPeerConnected,
        unlistenPeerDisconnected,
        unlistenSyncMessage,
      ];
    } catch (err) {
      console.error('[LocalSync] Failed to set up event listeners:', err);
    }
  }, [addToast]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      unlistenersRef.current.forEach((unlisten) => unlisten());
    };
  }, []);

  // Refresh discovered peers list
  const refreshPeers = useCallback(async () => {
    try {
      const peers = await getDiscoveredPeers();
      setDiscoveredPeers(peers);
    } catch (err) {
      console.error('[LocalSync] Failed to refresh peers:', err);
    }
  }, []);

  // Refresh connected peer count (fallback for when events don't fire)
  const refreshConnectedCount = useCallback(async () => {
    try {
      const count = await getPeerCount();
      console.log('[LocalSync] Refreshed peer count:', count);
      setConnectedPeerCount(count);
    } catch (err) {
      console.error('[LocalSync] Failed to refresh peer count:', err);
    }
  }, []);

  // Enable local sync
  const enable = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      setStatus('starting');
      setError(null);

      // Start the TCP server
      const port = await startServer();
      setServerPort(port);

      // Get device info
      const info = await getDeviceInfo();
      setDeviceInfo(info);

      // Set up event listeners before starting discovery
      await setupEventListeners();

      // Start mDNS discovery
      await startDiscovery();
      setIsDiscovering(true);
      setStatus('discovering');
      setIsEnabled(true);

      addToast({
        type: 'success',
        message: 'Local network sync enabled',
        duration: 3000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[LocalSync] Failed to enable:', message);
      setError(message);
      setStatus('error');
      addToast({
        type: 'error',
        message: `Failed to enable local sync: ${message}`,
        duration: 5000,
      });
    } finally {
      isStartingRef.current = false;
    }
  }, [setupEventListeners, addToast]);

  // Disable local sync
  const disable = useCallback(async () => {
    try {
      // Stop discovery first
      try {
        await stopDiscovery();
      } catch (err) {
        console.warn('[LocalSync] Error stopping discovery:', err);
      }

      // Stop the server
      try {
        await stopServer();
      } catch (err) {
        console.warn('[LocalSync] Error stopping server:', err);
      }

      // Clean up event listeners
      unlistenersRef.current.forEach((unlisten) => unlisten());
      unlistenersRef.current = [];

      // Reset state
      setIsEnabled(false);
      setIsDiscovering(false);
      setDiscoveredPeers([]);
      setConnectedPeerCount(0);
      setServerPort(null);
      setStatus('off');
      setError(null);
    } catch (err) {
      console.error('[LocalSync] Error during disable:', err);
    }
  }, []);

  // Broadcast sync data to all connected peers
  const broadcastUpdate = useCallback(async (data: Uint8Array): Promise<number> => {
    if (!isEnabled) {
      return 0;
    }
    try {
      const count = await broadcastSync(data);
      return count;
    } catch (err) {
      console.error('[LocalSync] Failed to broadcast sync:', err);
      return 0;
    }
  }, [isEnabled]);

  // Set callback for receiving sync data
  const setOnSyncReceived = useCallback((callback: ((data: Uint8Array) => void) | null) => {
    onSyncReceivedRef.current = callback;
  }, []);

  // Check initial state on mount
  useEffect(() => {
    const checkInitialState = async () => {
      try {
        const serverInfo = await getServerInfo();
        if (serverInfo.running && serverInfo.port) {
          const discovering = await isDiscoveryRunning();
          const info = await getDeviceInfo();
          const peers = await getDiscoveredPeers();

          setServerPort(serverInfo.port);
          setDeviceInfo(info);
          setIsDiscovering(discovering);
          setDiscoveredPeers(peers);
          setIsEnabled(true);
          setStatus(discovering ? 'discovering' : 'off');

          if (discovering) {
            await setupEventListeners();
          }
        }
      } catch (err) {
        // Not an error if Tauri commands aren't available yet
        console.debug('[LocalSync] Initial state check:', err);
      }
    };

    checkInitialState();
  }, [setupEventListeners]);

  // Update status when peers change
  useEffect(() => {
    if (isEnabled && connectedPeerCount > 0) {
      setStatus('connected');
    } else if (isEnabled && discoveredPeers.length > 0) {
      setStatus('discovering'); // Found peers, waiting for connection
    } else if (isEnabled && isDiscovering) {
      setStatus('discovering');
    }
  }, [isEnabled, isDiscovering, discoveredPeers.length, connectedPeerCount]);

  // Wire up LoroDocStore with local sync when enabled
  useEffect(() => {
    if (isEnabled && connectedPeerCount > 0) {
      // Wire up the broadcast function for outgoing updates
      docStore.setLocalSyncBroadcast(broadcastUpdate);
      console.log('[LocalSync] Wired docStore broadcast to local peers');

      // Set up callback for incoming sync data
      onSyncReceivedRef.current = (data: Uint8Array) => {
        console.log('[LocalSync] Received sync data, forwarding to docStore');
        docStore.handleLocalSyncUpdate(data);
        // Trigger UI refresh after import
        refreshData();
      };

      return () => {
        // Clean up when disabled or disconnected
        docStore.setLocalSyncBroadcast(null);
        onSyncReceivedRef.current = null;
      };
    } else {
      // Not connected, clear the broadcast function
      docStore.setLocalSyncBroadcast(null);
      onSyncReceivedRef.current = null;
    }
  }, [isEnabled, connectedPeerCount, docStore, broadcastUpdate, refreshData]);

  const value: LocalSyncContextValue = {
    isEnabled,
    status,
    isDiscovering,
    discoveredPeers,
    connectedPeerCount,
    deviceInfo,
    serverPort,
    error,
    enable,
    disable,
    refreshPeers,
    refreshConnectedCount,
    broadcastUpdate,
    setOnSyncReceived,
  };

  return (
    <LocalSyncContext.Provider value={value}>
      {children}
    </LocalSyncContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocalSync(): LocalSyncContextValue {
  const context = useContext(LocalSyncContext);
  if (!context) {
    throw new Error('useLocalSync must be used within a LocalSyncProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if LocalSyncProvider is not available.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLocalSyncSafe(): LocalSyncContextValue | null {
  return useContext(LocalSyncContext);
}
