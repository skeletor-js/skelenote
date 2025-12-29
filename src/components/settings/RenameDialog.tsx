/**
 * Rename Dialog Component
 *
 * Modal dialog to rename a device.
 */

import { useState } from 'react';
import type { DeviceInfo } from '@/lib/devices';
import './DeviceManager.css';

interface RenameDialogProps {
  device: DeviceInfo;
  isProcessing: boolean;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({
  device,
  isProcessing,
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const [name, setName] = useState(device.name);

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== device.name) {
      onConfirm(trimmedName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing && name.trim()) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const isValid = name.trim().length > 0 && name.trim() !== device.name;

  return (
    <div className="device-dialog__overlay" onClick={onCancel}>
      <div className="device-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="device-dialog__header">
          <h3 className="device-dialog__title">Rename Device</h3>
        </div>

        <div className="device-dialog__content">
          <div className="device-dialog__field">
            <label className="device-dialog__label" htmlFor="device-name">
              Device Name
            </label>
            <input
              id="device-name"
              type="text"
              className="device-dialog__input"
              placeholder="Enter device name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              autoFocus
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
            className="device-dialog__button device-dialog__button--primary"
            onClick={handleConfirm}
            disabled={isProcessing || !isValid}
          >
            {isProcessing ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
