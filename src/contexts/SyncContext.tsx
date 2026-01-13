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
  SyncClient,
  type ConnectionStatus,
  getSyncServerUrl,
  getUserId,
  getDeviceId,
} from '@/lib/sync';
import { useObjects } from './ObjectContext';
import { useToast } from './ToastContext';

interface SyncContextValue {
  /** The sync client instance */
  syncClient: SyncClient | null;
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether the browser/app has network connectivity */
  isOnline: boolean;
  /** Whether connected to the sync server */
  isConnected: boolean;
  /** Whether currently syncing data */
  isSyncing: boolean;
  /** Whether there's a sync error */
  hasError: boolean;
  /** Number of pending updates in the offline queue */
  pendingCount: number;
  /** Manually trigger reconnection */
  reconnect: () => void;
  /** Connect to sync server with config */
  connect: (serverUrl: string, userId: string, deviceId: string) => void;
  /** Disconnect from sync server */
  disconnect: () => void;
  /** Clear error state */
  clearError: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const { docStore, store, refreshData } = useObjects();
  const { addToast } = useToast();
  const [syncClient, setSyncClient] = useState<SyncClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const autoConnectAttemptedRef = useRef(false);

  // Track browser online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Connect to sync server
  const connect = useCallback(
    async (serverUrl: string, userId: string, deviceId: string) => {
      // Disconnect existing client if any
      if (syncClient) {
        syncClient.disconnect();
      }

      const client = new SyncClient({
        serverUrl,
        userId,
        deviceId,
      });

      // Subscribe to status changes
      client.on('statusChange', (event) => {
        if (event.status) {
          setStatus(event.status);
          // Clear error on successful connection
          if (event.status === 'connected') {
            setHasError(false);
          }
        }
        setPendingCount(client.getPendingCount());
      });

      // Subscribe to sync events
      client.on('sync', () => {
        setPendingCount(client.getPendingCount());
      });

      // Subscribe to errors
      client.on('error', (event) => {
        console.error('[SyncProvider] Sync error:', event.error);
        setHasError(true);
        addToast({
          type: 'error',
          message: event.error?.message || 'Sync error occurred',
          duration: 8000,
          action: {
            label: 'Retry',
            onClick: () => {
              setHasError(false);
              client.connect();
            },
          },
        });
      });

      // Wire up to docStore
      docStore.setSyncClient(client);
      docStore.setOnRemoteChange(() => {
        // Invalidate ObjectStore cache so getAll() returns fresh data
        store?.clearCache();
        refreshData();
      });

      setSyncClient(client);

      // Enable encryption if Skeleton Key is available
      await client.enableEncryption();

      client.connect();
    },
    [syncClient, docStore, store, refreshData, addToast]
  );

  // Disconnect from sync server
  const disconnect = useCallback(() => {
    if (syncClient) {
      syncClient.disconnect();
      setSyncClient(null);
      setStatus('disconnected');
      setPendingCount(0);
    }
  }, [syncClient]);

  // Reconnect
  const reconnect = useCallback(() => {
    if (syncClient) {
      setHasError(false);
      syncClient.connect();
    }
  }, [syncClient]);

  // Clear error state
  const clearError = useCallback(() => {
    setHasError(false);
  }, []);

  // Auto-connect on mount if server URL is saved
  useEffect(() => {
    // Only attempt auto-connect once and when docStore is ready
    if (autoConnectAttemptedRef.current || !docStore) return;
    autoConnectAttemptedRef.current = true;

    const savedUrl = getSyncServerUrl();
    if (savedUrl) {
      const userId = getUserId();
      const deviceId = getDeviceId();
      connect(savedUrl, userId, deviceId);
    }
  }, [docStore, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncClient) {
        syncClient.disconnect();
      }
    };
  }, [syncClient]);

  const value: SyncContextValue = {
    syncClient,
    status,
    isOnline,
    isConnected: status === 'connected',
    isSyncing: status === 'syncing',
    hasError,
    pendingCount,
    reconnect,
    connect,
    disconnect,
    clearError,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if SyncProvider is not available.
 * Use this when the component may render outside of SyncProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSyncContextSafe(): SyncContextValue | null {
  return useContext(SyncContext);
}
