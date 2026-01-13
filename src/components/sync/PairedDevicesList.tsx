import { useState } from 'react';
import { Stack, Group, Text, Box, Menu, ActionIcon } from '@mantine/core';
import { Icon } from '@/components/ui';
import { DeviceStatusIndicator } from './DeviceStatusIndicator';
import type { PairedDeviceWithStatus } from '@/lib/sync/local';
import classes from './PairedDevicesList.module.css';

interface PairedDevicesListProps {
  devices: PairedDeviceWithStatus[];
  onReconnect: (deviceId: string) => Promise<void>;
  onUnpair: (deviceId: string) => Promise<void>;
  onViewDetails?: (deviceId: string) => void;
}

export function PairedDevicesList({
  devices,
  onReconnect,
  onUnpair,
  onViewDetails,
}: PairedDevicesListProps) {
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  const handleReconnect = async (deviceId: string) => {
    setReconnectingId(deviceId);
    try {
      await onReconnect(deviceId);
    } finally {
      setReconnectingId(null);
    }
  };

  const formatLastSeen = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getStatusText = (device: PairedDeviceWithStatus): string => {
    if (device.connected) {
      return 'Connected';
    }

    if (!device.lastSeen) {
      return 'Offline · Never connected';
    }

    const daysSinceLastSeen = Math.floor(
      (Date.now() - device.lastSeen) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastSeen < 1) {
      return 'Offline · Device may be asleep or on different network';
    }

    return `Offline · Last seen ${formatLastSeen(device.lastSeen)}`;
  };

  const getDeviceStatus = (device: PairedDeviceWithStatus) => {
    if (reconnectingId === device.id) return 'connecting';
    if (device.connected) return 'connected';
    return 'offline';
  };

  if (devices.length === 0) {
    return (
      <Box
        p="md"
        style={(theme) => ({
          borderRadius: theme.radius.sm,
          backgroundColor: 'var(--mantine-color-gray-0)',
          border: '1px solid var(--mantine-color-gray-2)',
          textAlign: 'center',
        })}
      >
        <Icon
          name="smartphone"
          size={24}
          style={{
            marginBottom: 8,
            color: 'var(--mantine-color-stone-4)',
          }}
        />
        <Text size="sm" c="dimmed">
          No paired devices yet
        </Text>
        <Text size="xs" c="dimmed" mt={4}>
          Pair a device to sync your vault
        </Text>
      </Box>
    );
  }

  return (
    <Stack
      gap={0}
      style={{
        border: '1px solid var(--mantine-color-gray-2)',
        borderRadius: 'var(--mantine-radius-sm)',
        overflow: 'hidden',
      }}
    >
      {devices.map((device) => (
        <Box key={device.id} className={classes.deviceRow}>
          <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
            <DeviceStatusIndicator status={getDeviceStatus(device)} />

            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} truncate="end" c="carbon">
                {device.name}
              </Text>
              <Text size="xs" c="dimmed" truncate="end">
                {getStatusText(device)}
              </Text>
            </Box>
          </Group>

          {/* Context menu - hover-reveal */}
          <Box className={classes.deviceActions}>
            <Menu position="bottom-end" withArrow shadow="sm">
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label="Device options"
                >
                  <Icon name="more-horizontal" size={14} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                {device.connected ? (
                  <>
                    {onViewDetails && (
                      <Menu.Item
                        leftSection={<Icon name="activity" size={14} />}
                        onClick={() => onViewDetails(device.id)}
                      >
                        View Sync Activity
                      </Menu.Item>
                    )}
                    <Menu.Item
                      leftSection={<Icon name="info" size={14} />}
                      onClick={() => onViewDetails?.(device.id)}
                    >
                      View Details
                    </Menu.Item>
                  </>
                ) : (
                  <>
                    <Menu.Item
                      leftSection={<Icon name="refresh-cw" size={14} />}
                      onClick={() => handleReconnect(device.id)}
                      disabled={reconnectingId === device.id}
                    >
                      {reconnectingId === device.id
                        ? 'Reconnecting...'
                        : 'Try Reconnect'}
                    </Menu.Item>
                    {device.knownAddresses &&
                      device.knownAddresses.length > 1 && (
                        <Menu.Item
                          leftSection={<Icon name="network" size={14} />}
                          onClick={() => onViewDetails?.(device.id)}
                        >
                          View Cached Addresses ({device.knownAddresses.length})
                        </Menu.Item>
                      )}
                  </>
                )}

                <Menu.Divider />

                <Menu.Item
                  leftSection={<Icon name="link-2-off" size={14} />}
                  onClick={() => onUnpair(device.id)}
                >
                  Unpair Device
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                  leftSection={<Icon name="ban" size={14} />}
                  color="brick"
                  disabled
                >
                  Revoke & Block Device
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
