import { useSyncContextSafe, useSkeletonKeySafe, useLocalSyncSafe } from '@/contexts';
import './SyncIndicator.css';

export function SyncIndicator() {
  const syncContext = useSyncContextSafe();
  const skeletonKeyContext = useSkeletonKeySafe();
  const localSyncContext = useLocalSyncSafe();

  // When SyncProvider is not available, show "Local only" state
  const status = syncContext?.status ?? 'disconnected';
  const pendingCount = syncContext?.pendingCount ?? 0;
  const hasError = syncContext?.hasError ?? false;
  const reconnect = syncContext?.reconnect;
  const hasSyncProvider = syncContext !== null;
  const isEncrypted = skeletonKeyContext?.hasSkeletonKey ?? false;

  // Local network sync status
  const isLocalSyncConnected = localSyncContext?.isEnabled && localSyncContext?.connectedPeerCount > 0;
  const localPeerCount = localSyncContext?.connectedPeerCount ?? 0;

  const getStatusConfig = () => {
    // If local sync is connected but cloud is not
    if (isLocalSyncConnected && status !== 'connected') {
      return {
        dotClass: 'sync-indicator__dot--local-sync',
        label: `Local (${localPeerCount})`,
        clickable: false,
        showLocalIcon: true,
      };
    }

    // If both cloud and local sync are connected
    if (isLocalSyncConnected && status === 'connected') {
      return {
        dotClass: 'sync-indicator__dot--connected',
        label: `Synced +${localPeerCount} local`,
        clickable: false,
        showLocalIcon: true,
      };
    }

    if (!hasSyncProvider) {
      return {
        dotClass: 'sync-indicator__dot--local',
        label: 'Local only',
        clickable: false,
        showLocalIcon: false,
      };
    }

    // Show error state if there's an error
    if (hasError) {
      return {
        dotClass: 'sync-indicator__dot--error',
        label: 'Sync error',
        clickable: true,
        showLocalIcon: false,
      };
    }

    switch (status) {
      case 'connected':
        return {
          dotClass: 'sync-indicator__dot--connected',
          label: 'Synced',
          clickable: false,
          showLocalIcon: false,
        };
      case 'syncing':
        return {
          dotClass: 'sync-indicator__dot--syncing',
          label: 'Syncing...',
          clickable: false,
          showLocalIcon: false,
        };
      case 'connecting':
        return {
          dotClass: 'sync-indicator__dot--connecting',
          label: 'Connecting...',
          clickable: false,
          showLocalIcon: false,
        };
      case 'disconnected':
      default:
        return {
          dotClass: 'sync-indicator__dot--disconnected',
          label: 'Offline',
          clickable: true,
          showLocalIcon: false,
        };
    }
  };

  const config = getStatusConfig();

  const handleClick = () => {
    if (config.clickable && reconnect) {
      reconnect();
    }
  };

  return (
    <button
      className={`sync-indicator ${config.clickable ? 'sync-indicator--clickable' : ''}`}
      onClick={handleClick}
      disabled={!config.clickable}
      title={config.clickable ? 'Click to reconnect' : undefined}
    >
      {isEncrypted && (
        <span className="sync-indicator__lock" title="End-to-end encrypted">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      )}
      {config.showLocalIcon && (
        <span className="sync-indicator__local" title="Local network sync active">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="currentColor" />
          </svg>
        </span>
      )}
      <span className={`sync-indicator__dot ${config.dotClass}`} />
      <span className="sync-indicator__label">{config.label}</span>
      {pendingCount > 0 && (
        <span className="sync-indicator__pending">({pendingCount})</span>
      )}
    </button>
  );
}
