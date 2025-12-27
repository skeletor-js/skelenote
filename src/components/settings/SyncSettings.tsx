import { useState, useEffect } from 'react';
import { useSyncContextSafe } from '@/contexts';
import {
  getUserId,
  getDeviceId,
  copyToClipboard,
  getSyncServerUrl,
  setSyncServerUrl,
  isValidWebSocketUrl,
} from '@/lib/sync';
import './SyncSettings.css';

export function SyncSettings() {
  const syncContext = useSyncContextSafe();
  const [serverUrl, setServerUrl] = useState(getSyncServerUrl() || '');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const userId = getUserId();
  const deviceId = getDeviceId();
  const isConnected = syncContext?.isConnected ?? false;
  const status = syncContext?.status ?? 'disconnected';

  // Validate URL on change
  useEffect(() => {
    if (serverUrl && !isValidWebSocketUrl(serverUrl)) {
      setUrlError('URL must start with ws:// or wss://');
    } else {
      setUrlError(null);
    }
  }, [serverUrl]);

  const handleConnect = () => {
    if (!syncContext || !serverUrl || urlError) return;

    setSyncServerUrl(serverUrl);
    syncContext.connect(serverUrl, userId, deviceId);
  };

  const handleDisconnect = () => {
    if (!syncContext) return;
    syncContext.disconnect();
  };

  const handleCopyUserId = async () => {
    const success = await copyToClipboard(userId);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'syncing':
        return 'Syncing...';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  return (
    <section className="sync-settings">
      <h2 className="sync-settings__title">Sync Settings</h2>

      <div className="sync-settings__section">
        <label className="sync-settings__label">Sync Server URL</label>
        <div className="sync-settings__input-row">
          <input
            type="text"
            className="sync-settings__input"
            placeholder="wss://your-worker.workers.dev"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            disabled={isConnected}
          />
        </div>
        {urlError && <p className="sync-settings__error">{urlError}</p>}
      </div>

      <div className="sync-settings__section">
        <label className="sync-settings__label">Status</label>
        <div className="sync-settings__status">
          <span
            className={`sync-settings__status-dot sync-settings__status-dot--${status}`}
          />
          <span>{getStatusLabel()}</span>
        </div>
      </div>

      <div className="sync-settings__section">
        <div className="sync-settings__button-row">
          {isConnected ? (
            <button
              className="sync-settings__button sync-settings__button--secondary"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          ) : (
            <button
              className="sync-settings__button sync-settings__button--primary"
              onClick={handleConnect}
              disabled={!serverUrl || !!urlError || !syncContext}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="sync-settings__divider" />

      <div className="sync-settings__section">
        <label className="sync-settings__label">User ID</label>
        <p className="sync-settings__help">
          Share this ID across devices to sync data between them.
        </p>
        <div className="sync-settings__id-row">
          <code className="sync-settings__id">{userId}</code>
          <button
            className="sync-settings__copy-btn"
            onClick={handleCopyUserId}
          >
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="sync-settings__section">
        <label className="sync-settings__label">Device ID</label>
        <p className="sync-settings__help">
          Unique identifier for this device (read-only).
        </p>
        <code className="sync-settings__id">{deviceId}</code>
      </div>
    </section>
  );
}
