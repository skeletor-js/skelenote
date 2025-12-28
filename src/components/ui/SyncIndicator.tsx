import { useSyncContextSafe, useSkeletonKeySafe } from '@/contexts';
import './SyncIndicator.css';

export function SyncIndicator() {
  const syncContext = useSyncContextSafe();
  const skeletonKeyContext = useSkeletonKeySafe();

  // When SyncProvider is not available, show "Local only" state
  const status = syncContext?.status ?? 'disconnected';
  const pendingCount = syncContext?.pendingCount ?? 0;
  const hasError = syncContext?.hasError ?? false;
  const reconnect = syncContext?.reconnect;
  const hasSyncProvider = syncContext !== null;
  const isEncrypted = skeletonKeyContext?.hasSkeletonKey ?? false;

  const getStatusConfig = () => {
    if (!hasSyncProvider) {
      return {
        dotClass: 'sync-indicator__dot--local',
        label: 'Local only',
        clickable: false,
      };
    }

    // Show error state if there's an error
    if (hasError) {
      return {
        dotClass: 'sync-indicator__dot--error',
        label: 'Sync error',
        clickable: true,
      };
    }

    switch (status) {
      case 'connected':
        return {
          dotClass: 'sync-indicator__dot--connected',
          label: 'Synced',
          clickable: false,
        };
      case 'syncing':
        return {
          dotClass: 'sync-indicator__dot--syncing',
          label: 'Syncing...',
          clickable: false,
        };
      case 'connecting':
        return {
          dotClass: 'sync-indicator__dot--connecting',
          label: 'Connecting...',
          clickable: false,
        };
      case 'disconnected':
      default:
        return {
          dotClass: 'sync-indicator__dot--disconnected',
          label: 'Offline',
          clickable: true,
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
      <span className={`sync-indicator__dot ${config.dotClass}`} />
      <span className="sync-indicator__label">{config.label}</span>
      {pendingCount > 0 && (
        <span className="sync-indicator__pending">({pendingCount})</span>
      )}
    </button>
  );
}
