import { useState } from 'react';
import { useLocalSyncSafe } from '@/contexts/LocalSyncContext';
import { connectToPeer, getConnectedPeers } from '@/lib/sync/local';
import './LocalSyncSettings.css';

export function LocalSyncSettings() {
  const localSync = useLocalSyncSafe();
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectedPeerIds, setConnectedPeerIds] = useState<Set<string>>(new Set());

  // Show nothing if context not available (not in Tauri environment)
  if (!localSync) {
    return null;
  }

  const {
    isEnabled,
    status,
    discoveredPeers,
    connectedPeerCount,
    deviceInfo,
    serverPort,
    error,
    enable,
    disable,
    refreshConnectedCount,
  } = localSync;

  const handleConnect = async (deviceId: string) => {
    setConnectingTo(deviceId);
    try {
      await connectToPeer(deviceId);
      console.log('[LocalSyncSettings] Connection successful, refreshing peer count...');
      // Refresh connected peers (local UI state)
      const peers = await getConnectedPeers();
      setConnectedPeerIds(new Set(peers.map(p => p.deviceId)));
      // Refresh context's connected peer count (triggers docStore wiring)
      await refreshConnectedCount();
    } catch (err) {
      console.error('Failed to connect:', err);
    } finally {
      setConnectingTo(null);
    }
  };

  const isConnected = (deviceId: string) => {
    return connectedPeerIds.has(deviceId) || connectedPeerCount > 0;
  };

  const handleToggle = async () => {
    if (isEnabled) {
      await disable();
    } else {
      await enable();
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'starting':
        return 'Starting...';
      case 'discovering':
        return 'Searching for devices...';
      case 'connected':
        return `${discoveredPeers.length} device${discoveredPeers.length === 1 ? '' : 's'} found`;
      case 'error':
        return 'Error';
      case 'off':
      default:
        return 'Off';
    }
  };

  const getStatusDotClass = () => {
    switch (status) {
      case 'starting':
      case 'discovering':
        return 'local-sync__status-dot--searching';
      case 'connected':
        return 'local-sync__status-dot--connected';
      case 'error':
        return 'local-sync__status-dot--error';
      case 'off':
      default:
        return 'local-sync__status-dot--off';
    }
  };

  return (
    <section className="local-sync">
      <div className="local-sync__header">
        <div className="local-sync__title-row">
          <h3 className="local-sync__title">Local Network Sync</h3>
          <label className="local-sync__toggle">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggle}
              disabled={status === 'starting'}
            />
            <span className="local-sync__toggle-slider" />
          </label>
        </div>
        <p className="local-sync__description">
          Sync directly with devices on your WiFi network. No internet required.
        </p>
      </div>

      {isEnabled && (
        <div className="local-sync__content">
          <div className="local-sync__status-row">
            <span className={`local-sync__status-dot ${getStatusDotClass()}`} />
            <span className="local-sync__status-label">{getStatusLabel()}</span>
          </div>

          {error && (
            <div className="local-sync__error">
              {error}
            </div>
          )}

          {discoveredPeers.length > 0 && (
            <div className="local-sync__peers">
              <h4 className="local-sync__peers-title">Nearby Devices</h4>
              <ul className="local-sync__peers-list">
                {discoveredPeers.map((peer) => (
                  <li key={peer.deviceId} className="local-sync__peer">
                    <span className="local-sync__peer-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </span>
                    <span className="local-sync__peer-name">{peer.deviceName}</span>
                    {isConnected(peer.deviceId) ? (
                      <span className="local-sync__peer-connected">
                        <span className="local-sync__peer-dot local-sync__peer-dot--connected" />
                        Connected
                      </span>
                    ) : (
                      <button
                        className="local-sync__connect-btn"
                        onClick={() => handleConnect(peer.deviceId)}
                        disabled={connectingTo === peer.deviceId}
                      >
                        {connectingTo === peer.deviceId ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'discovering' && discoveredPeers.length === 0 && (
            <div className="local-sync__searching">
              <span className="local-sync__searching-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </span>
              <span>Looking for devices with the same Skeleton Key...</span>
            </div>
          )}

          {deviceInfo && (
            <div className="local-sync__device-info">
              <div className="local-sync__device-row">
                <span className="local-sync__device-label">This device:</span>
                <span className="local-sync__device-value">{deviceInfo.deviceName}</span>
              </div>
              {serverPort && (
                <div className="local-sync__device-row">
                  <span className="local-sync__device-label">Port:</span>
                  <span className="local-sync__device-value">{serverPort}</span>
                </div>
              )}
              {deviceInfo.fingerprint && (
                <div className="local-sync__device-row">
                  <span className="local-sync__device-label">Fingerprint:</span>
                  <code className="local-sync__device-value local-sync__device-value--code">
                    {deviceInfo.fingerprint}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
