/**
 * Revoke Confirm Dialog Component
 *
 * Modal dialog to confirm device revocation with optional reason.
 */

import { useState } from 'react';
import type { DeviceInfo } from '@/lib/devices';
import './DeviceManager.css';

interface RevokeConfirmDialogProps {
  device: DeviceInfo;
  isProcessing: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function RevokeConfirmDialog({
  device,
  isProcessing,
  onConfirm,
  onCancel,
}: RevokeConfirmDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason || undefined);
  };

  return (
    <div className="device-dialog__overlay" onClick={onCancel}>
      <div className="device-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="device-dialog__header">
          <h3 className="device-dialog__title">Revoke Device Access</h3>
        </div>

        <div className="device-dialog__content">
          <p className="device-dialog__warning">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>This action cannot be undone.</span>
          </p>

          <p className="device-dialog__description">
            Revoking <strong>{device.name}</strong> will immediately prevent it from
            syncing with your vault. The device will need to be re-authorized with
            a new Skeleton Key to regain access.
          </p>

          <div className="device-dialog__field">
            <label className="device-dialog__label" htmlFor="revoke-reason">
              Reason (optional)
            </label>
            <input
              id="revoke-reason"
              type="text"
              className="device-dialog__input"
              placeholder="e.g., Device lost or sold"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="device-dialog__actions">
          <button
            className="device-dialog__button device-dialog__button--secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="device-dialog__button device-dialog__button--danger"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Revoking...' : 'Revoke Device'}
          </button>
        </div>
      </div>
    </div>
  );
}
