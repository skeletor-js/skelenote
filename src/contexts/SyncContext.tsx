import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import posthog from 'posthog-js';
import {
  SyncClient,
  type ConnectionStatus,
  getSyncServerUrl,
  getUserId,
  getDeviceId,
} from '@/lib/sync';
import { useObjects } from './ObjectContext';
import { useToast } from './ToastContext';
import { usePlatform } from '@/hooks/usePlatform';
import { AnalyticsEvents } from '@/lib/analytics';

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
  const { isMobile, isIOS } = usePlatform();
  const [syncClient, setSyncClient] = useState<SyncClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const autoConnectAttemptedRef = useRef(false);
  const backgroundTaskIdRef = useRef<number | null>(null);

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

      // Track sync started
      try {
        if (posthog.__loaded && !posthog.has_opted_out_capturing()) {
          posthog.capture(AnalyticsEvents.SYNC_STARTED, { sync_type: 'cloud' });
        }
      } catch {
        // Silently fail if analytics is not available
      }
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

  // Background task helpers for iOS
  const beginBackgroundTask = useCallback(async () => {
    if (!isMobile || !isIOS) return;
    if (backgroundTaskIdRef.current !== null) return;

    try {
      const taskId = await invoke<number>('begin_background_task');
      if (taskId !== 0) {
        backgroundTaskIdRef.current = taskId;
        console.log('[SyncContext] Started background task:', taskId);
      }
    } catch (error) {
      console.error('[SyncContext] Failed to begin background task:', error);
    }
  }, [isMobile, isIOS]);

  const endBackgroundTask = useCallback(async () => {
    if (!isMobile || !isIOS) return;
    if (backgroundTaskIdRef.current === null) return;

    try {
      await invoke('end_background_task', {
        taskId: backgroundTaskIdRef.current,
      });
      console.log(
        '[SyncContext] Ended background task:',
        backgroundTaskIdRef.current
      );
      backgroundTaskIdRef.current = null;
    } catch (error) {
      console.error('[SyncContext] Failed to end background task:', error);
      backgroundTaskIdRef.current = null;
    }
  }, [isMobile, isIOS]);

  // Handle app visibility changes for background sync (iOS only)
  useEffect(() => {
    if (!isMobile || !isIOS) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // App going to background
        // Start background task if we're syncing or have pending updates
        const isSyncing = status === 'syncing';
        const hasPending = pendingCount > 0;

        if (isSyncing || hasPending) {
          console.log(
            '[SyncContext] Starting background task for sync completion'
          );
          await beginBackgroundTask();
        }
      } else if (document.visibilityState === 'visible') {
        // App returning to foreground - end any active background task
        await endBackgroundTask();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    isMobile,
    isIOS,
    status,
    pendingCount,
    beginBackgroundTask,
    endBackgroundTask,
  ]);

  // End background task when sync completes
  useEffect(() => {
    if (!isMobile || !isIOS) return;

    // If we have a background task running and sync is no longer active
    if (
      backgroundTaskIdRef.current !== null &&
      status !== 'syncing' &&
      pendingCount === 0
    ) {
      console.log('[SyncContext] Sync complete, ending background task');
      endBackgroundTask();
    }
  }, [isMobile, isIOS, status, pendingCount, endBackgroundTask]);

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
