/**
 * Device List Item Component
 *
 * Displays a single device with actions for rename/revoke.
 */

import { formatLastSeen, getPlatformDisplayName, type DeviceInfo } from '@/lib/devices';
import './DeviceManager.css';

interface DeviceListItemProps {
  device: DeviceInfo;
  disabled?: boolean;
  onRename?: () => void;
  onRevoke?: () => void;
}

export function DeviceListItem({
  device,
  disabled = false,
  onRename,
  onRevoke,
}: DeviceListItemProps) {
  const platformIcon = getPlatformIcon(device.platform);

  return (
    <li className={`device-item ${device.isCurrentDevice ? 'device-item--current' : ''} ${device.isRevoked ? 'device-item--revoked' : ''}`}>
      <div className="device-item__icon">
        {platformIcon}
      </div>

      <div className="device-item__info">
        <div className="device-item__name-row">
          <span className="device-item__name">{device.name}</span>
          {device.isCurrentDevice && (
            <span className="device-item__badge">This device</span>
          )}
          {device.isRevoked && (
            <span className="device-item__badge device-item__badge--revoked">Revoked</span>
          )}
        </div>
        <div className="device-item__meta">
          <span className="device-item__platform">
            {getPlatformDisplayName(device.platform)}
          </span>
          <span className="device-item__separator">·</span>
          <span className="device-item__last-seen">
            {formatLastSeen(device.lastSeen)}
          </span>
        </div>
      </div>

      {!disabled && !device.isCurrentDevice && !device.isRevoked && (
        <div className="device-item__actions">
          {onRename && (
            <button
              className="device-item__action"
              onClick={onRename}
              title="Rename device"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onRevoke && (
            <button
              className="device-item__action device-item__action--danger"
              onClick={onRevoke}
              title="Revoke device access"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Get platform-specific icon
 */
function getPlatformIcon(platform: DeviceInfo['platform']): JSX.Element {
  switch (platform) {
    case 'macos':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
          <path d="M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      );
    case 'windows':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 5.5l7-1v6.5H3z" />
          <path d="M11 4.3l10-1.5v8.2H11z" />
          <path d="M3 13h7v6.5l-7-1z" />
          <path d="M11 13h10v8.2l-10-1.5z" />
        </svg>
      );
    case 'linux':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <ellipse cx="12" cy="5" rx="4" ry="3" />
          <path d="M12 8v2" />
          <path d="M8 13c-2 1-3 3-3 5 0 3 3 3 4 3h6c1 0 4 0 4-3 0-2-1-4-3-5" />
          <circle cx="9.5" cy="4.5" r="0.5" fill="currentColor" />
          <circle cx="14.5" cy="4.5" r="0.5" fill="currentColor" />
        </svg>
      );
    case 'ios':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" />
        </svg>
      );
    case 'android':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" />
        </svg>
      );
    case 'web':
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      );
  }
}
