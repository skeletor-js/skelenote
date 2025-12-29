import { useState, useEffect, useCallback } from 'react';
import { useSyncContextSafe, useSkeletonKeySafe } from '@/contexts';
import {
  getUserId,
  getDeviceId,
  copyToClipboard,
  getSyncServerUrl,
  setSyncServerUrl,
  isValidWebSocketUrl,
} from '@/lib/sync';
import { LocalSyncSettings } from './LocalSyncSettings';
import './SyncSettings.css';

export function SyncSettings() {
  const syncContext = useSyncContextSafe();
  const skeletonKeyContext = useSkeletonKeySafe();
  const [serverUrl, setServerUrl] = useState(getSyncServerUrl() || '');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const userId = getUserId();
  const deviceId = getDeviceId();
  const isConnected = syncContext?.isConnected ?? false;
  const status = syncContext?.status ?? 'disconnected';
  const hasSkeletonKey = skeletonKeyContext?.hasSkeletonKey ?? false;

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

  const handleResetVault = useCallback(async () => {
    if (!skeletonKeyContext) return;

    setIsResetting(true);
    try {
      // Disconnect sync first
      syncContext?.disconnect();

      // Reset the vault
      await skeletonKeyContext.resetVault();

      // The app will now show the Skeleton Key setup screen
    } catch (err) {
      console.error('[SyncSettings] Failed to reset vault:', err);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  }, [skeletonKeyContext, syncContext]);

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
        <label className="sync-settings__label">Encryption</label>
        <div className="sync-settings__encryption">
          {hasSkeletonKey ? (
            <>
              <span className="sync-settings__encryption-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <span className="sync-settings__encryption-label">
                End-to-end encrypted with Skeleton Key
              </span>
            </>
          ) : (
            <span className="sync-settings__encryption-label sync-settings__encryption-label--warning">
              No Skeleton Key configured
            </span>
          )}
        </div>
        <p className="sync-settings__help">
          All sync methods use end-to-end encryption. Your data is encrypted
          before leaving this device.
        </p>
      </div>

      <div className="sync-settings__divider" />

      <LocalSyncSettings />

      <div className="sync-settings__divider" />

      <div className="sync-settings__section">
        <label className="sync-settings__label">Cloud Relay</label>
        <p className="sync-settings__help">
          Sync through a relay server when devices aren't on the same network.
        </p>

        <div className="sync-settings__subsection">
          <label className="sync-settings__sublabel">Server URL</label>
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

        <div className="sync-settings__subsection">
          <div className="sync-settings__status">
            <span
              className={`sync-settings__status-dot sync-settings__status-dot--${status}`}
            />
            <span>{getStatusLabel()}</span>
          </div>
        </div>

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

      <div className="sync-settings__divider" />

      <div className="sync-settings__section sync-settings__section--danger">
        <label className="sync-settings__label">Danger Zone</label>
        <p className="sync-settings__help">
          Reset your vault to use a different Skeleton Key. This will disconnect
          sync and clear your encryption key from this device.
        </p>
        {showResetConfirm ? (
          <div className="sync-settings__confirm-row">
            <span className="sync-settings__confirm-text">Are you sure?</span>
            <button
              className="sync-settings__button sync-settings__button--danger"
              onClick={handleResetVault}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Yes, Reset'}
            </button>
            <button
              className="sync-settings__button sync-settings__button--secondary"
              onClick={() => setShowResetConfirm(false)}
              disabled={isResetting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="sync-settings__button sync-settings__button--danger-outline"
            onClick={() => setShowResetConfirm(true)}
          >
            Reset Vault
          </button>
        )}
      </div>
    </section>
  );
}
