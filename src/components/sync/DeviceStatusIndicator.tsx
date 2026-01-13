import { Box } from '@mantine/core';
import './DeviceStatusIndicator.css';

export interface DeviceStatusIndicatorProps {
  status: 'connected' | 'connecting' | 'offline' | 'syncing' | 'error';
  size?: number;
  animate?: boolean;
}

export function DeviceStatusIndicator({
  status,
  size = 8,
  animate = false,
}: DeviceStatusIndicatorProps) {
  const getColor = () => {
    switch (status) {
      case 'connected':
      case 'syncing':
        return 'var(--mantine-color-sage-6)';
      case 'connecting':
        return 'var(--mantine-color-ember-5)';
      case 'error':
        return 'var(--mantine-color-brick-5)';
      case 'offline':
      default:
        return 'var(--mantine-color-stone-4)';
    }
  };

  const shouldAnimate =
    animate || status === 'connecting' || status === 'syncing';

  return (
    <Box
      w={size}
      h={size}
      className={shouldAnimate ? 'device-status-pulse' : undefined}
      style={{
        borderRadius: '50%',
        backgroundColor: getColor(),
        flexShrink: 0,
      }}
      aria-label={`Device status: ${status}`}
    />
  );
}
