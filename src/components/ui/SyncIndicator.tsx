import { useSyncContextSafe } from '@/contexts';
import './SyncIndicator.css';

export function SyncIndicator() {
  const syncContext = useSyncContextSafe();

  // When SyncProvider is not available, show "Local only" state
  const status = syncContext?.status ?? 'disconnected';
  const pendingCount = syncContext?.pendingCount ?? 0;
  const hasError = syncContext?.hasError ?? false;
  const reconnect = syncContext?.reconnect;
  const hasSyncProvider = syncContext !== null;

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
      <span className={`sync-indicator__dot ${config.dotClass}`} />
      <span className="sync-indicator__label">{config.label}</span>
      {pendingCount > 0 && (
        <span className="sync-indicator__pending">({pendingCount})</span>
      )}
    </button>
  );
}
