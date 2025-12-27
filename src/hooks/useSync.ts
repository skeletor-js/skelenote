import { useSyncContext } from '@/contexts/SyncContext';
import type { SyncClient, ConnectionStatus } from '@/lib/sync';

interface UseSyncResult {
  /** The sync client instance (null if not connected) */
  syncClient: SyncClient | null;
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether connected to the sync server */
  isConnected: boolean;
  /** Connect to sync server with configuration */
  connect: (serverUrl: string, userId: string, deviceId: string) => void;
  /** Disconnect from sync server */
  disconnect: () => void;
  /** Manually trigger reconnection */
  reconnect: () => void;
}

/**
 * Hook to access sync client and connection controls
 */
export function useSync(): UseSyncResult {
  const { syncClient, status, isConnected, connect, disconnect, reconnect } =
    useSyncContext();

  return {
    syncClient,
    status,
    isConnected,
    connect,
    disconnect,
    reconnect,
  };
}
