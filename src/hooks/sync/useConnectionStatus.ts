import { useSyncContext } from '@/contexts/SyncContext';
import type { ConnectionStatus } from '@/lib/sync';

interface UseConnectionStatusResult {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether connected to the sync server */
  isConnected: boolean;
  /** Whether currently syncing data */
  isSyncing: boolean;
  /** Whether the browser/app has network connectivity */
  isOnline: boolean;
  /** Number of pending updates in the offline queue */
  pendingCount: number;
}

/**
 * Hook to get the current sync connection status
 */
export function useConnectionStatus(): UseConnectionStatusResult {
  const { status, isConnected, isSyncing, isOnline, pendingCount } =
    useSyncContext();

  return {
    status,
    isConnected,
    isSyncing,
    isOnline,
    pendingCount,
  };
}
