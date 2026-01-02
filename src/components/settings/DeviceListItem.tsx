/**
 * Device List Item Component
 *
 * Displays a single device with actions for rename/revoke.
 */

import { Group, Box, Text, Badge, ActionIcon, ThemeIcon } from '@mantine/core';
import { Icon } from '@/components/ui';
import { formatLastSeen, getPlatformDisplayName, type DeviceInfo } from '@/lib/devices';
import type { IconName } from '@/lib/icons';

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
  const platformIcon = getPlatformIconName(device.platform);

  return (
    <Box
      component="li"
      py="sm"
      px="xs"
      style={(theme) => ({
        borderRadius: theme.radius.sm,
        backgroundColor: device.isRevoked
          ? 'var(--mantine-color-gray-1)'
          : device.isCurrentDevice
          ? 'var(--mantine-color-slate-0)'
          : 'transparent',
        opacity: device.isRevoked ? 0.6 : 1,
        listStyle: 'none',
      })}
    >
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon
          variant="light"
          color={device.isRevoked ? 'gray' : 'slate'}
          size="lg"
        >
          <Icon name={platformIcon} size={18} />
        </ThemeIcon>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={500} truncate>
              {device.name}
            </Text>
            {device.isCurrentDevice && (
              <Badge size="xs" variant="light" color="slate" radius="sm">
                This device
              </Badge>
            )}
            {device.isRevoked && (
              <Badge size="xs" variant="light" color="brick" radius="sm">
                Revoked
              </Badge>
            )}
          </Group>
          <Group gap="xs" mt={2}>
            <Text size="xs" c="dimmed">
              {getPlatformDisplayName(device.platform)}
            </Text>
            <Text size="xs" c="dimmed">·</Text>
            <Text size="xs" c="dimmed">
              {formatLastSeen(device.lastSeen)}
            </Text>
          </Group>
        </Box>

        {!disabled && !device.isCurrentDevice && !device.isRevoked && (
          <Group gap="xs">
            {onRename && (
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={onRename}
                title="Rename device"
              >
                <Icon name="edit-2" size={14} />
              </ActionIcon>
            )}
            {onRevoke && (
              <ActionIcon
                variant="subtle"
                color="brick"
                onClick={onRevoke}
                title="Revoke device access"
              >
                <Icon name="x-circle" size={14} />
              </ActionIcon>
            )}
          </Group>
        )}
      </Group>
    </Box>
  );
}

/**
 * Get platform-specific icon name
 */
function getPlatformIconName(platform: DeviceInfo['platform']): IconName {
  switch (platform) {
    case 'macos':
    case 'windows':
    case 'linux':
      return 'laptop';
    case 'ios':
    case 'android':
      return 'smartphone';
    case 'web':
    default:
      return 'monitor';
  }
}
