import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { SyncClient, type ConnectionStatus } from '@/lib/sync';
import { useObjects } from './ObjectContext';

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
  /** Number of pending updates in the offline queue */
  pendingCount: number;
  /** Manually trigger reconnection */
  reconnect: () => void;
  /** Connect to sync server with config */
  connect: (serverUrl: string, userId: string, deviceId: string) => void;
  /** Disconnect from sync server */
  disconnect: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const { docStore, refreshData } = useObjects();
  const [syncClient, setSyncClient] = useState<SyncClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

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
    (serverUrl: string, userId: string, deviceId: string) => {
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
      });

      // Wire up to docStore
      docStore.setSyncClient(client);
      docStore.setOnRemoteChange(() => {
        refreshData();
      });

      setSyncClient(client);
      client.connect();
    },
    [syncClient, docStore, refreshData]
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
      syncClient.connect();
    }
  }, [syncClient]);

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
    pendingCount,
    reconnect,
    connect,
    disconnect,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
}
