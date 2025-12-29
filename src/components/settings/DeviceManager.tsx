/**
 * Device Manager Component
 *
 * Displays all registered devices and allows renaming/revoking them.
 */

import { useState } from 'react';
import { useDeviceRegistrySafe } from '@/contexts/DeviceRegistryContext';
import { DeviceListItem } from './DeviceListItem';
import { RevokeConfirmDialog } from './RevokeConfirmDialog';
import { RenameDialog } from './RenameDialog';
import type { DeviceInfo } from '@/lib/devices';
import './DeviceManager.css';

export function DeviceManager() {
  const registry = useDeviceRegistrySafe();
  const [revokeTarget, setRevokeTarget] = useState<DeviceInfo | null>(null);
  const [renameTarget, setRenameTarget] = useState<DeviceInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Show nothing if context not available
  if (!registry) {
    return null;
  }

  const { devices, isLoading, error, revokeDevice, renameDevice, refresh } = registry;

  // Separate active and revoked devices
  const activeDevices = devices.filter(d => !d.isRevoked);
  const revokedDevices = devices.filter(d => d.isRevoked);

  const handleRevoke = async (reason?: string) => {
    if (!revokeTarget) return;

    setIsProcessing(true);
    try {
      await revokeDevice(revokeTarget.deviceId, reason);
      setRevokeTarget(null);
    } catch (err) {
      console.error('[DeviceManager] Revoke failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameTarget) return;

    setIsProcessing(true);
    try {
      await renameDevice(renameTarget.deviceId, newName);
      setRenameTarget(null);
    } catch (err) {
      console.error('[DeviceManager] Rename failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <section className="device-manager">
        <div className="device-manager__header">
          <h3 className="device-manager__title">Devices</h3>
        </div>
        <div className="device-manager__loading">
          Loading devices...
        </div>
      </section>
    );
  }

  return (
    <section className="device-manager">
      <div className="device-manager__header">
        <h3 className="device-manager__title">Devices</h3>
        <button
          className="device-manager__refresh"
          onClick={refresh}
          title="Refresh device list"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>

      <p className="device-manager__description">
        Manage devices that have access to your encrypted vault.
      </p>

      {error && (
        <div className="device-manager__error">
          {error}
        </div>
      )}

      {activeDevices.length === 0 ? (
        <div className="device-manager__empty">
          No devices registered yet.
        </div>
      ) : (
        <div className="device-manager__list">
          <h4 className="device-manager__list-title">Active Devices</h4>
          <ul className="device-manager__devices">
            {activeDevices.map((device) => (
              <DeviceListItem
                key={device.deviceId}
                device={device}
                onRename={() => setRenameTarget(device)}
                onRevoke={() => setRevokeTarget(device)}
              />
            ))}
          </ul>
        </div>
      )}

      {revokedDevices.length > 0 && (
        <div className="device-manager__list device-manager__list--revoked">
          <h4 className="device-manager__list-title">Revoked Devices</h4>
          <ul className="device-manager__devices">
            {revokedDevices.map((device) => (
              <DeviceListItem
                key={device.deviceId}
                device={device}
                disabled
              />
            ))}
          </ul>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      {revokeTarget && (
        <RevokeConfirmDialog
          device={revokeTarget}
          isProcessing={isProcessing}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}

      {/* Rename Dialog */}
      {renameTarget && (
        <RenameDialog
          device={renameTarget}
          isProcessing={isProcessing}
          onConfirm={handleRename}
          onCancel={() => setRenameTarget(null)}
        />
      )}
    </section>
  );
}
