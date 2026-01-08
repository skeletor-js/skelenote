/**
 * Account Settings Panel
 *
 * Displays user identity and encryption status.
 * Extracted from SyncSettings.tsx
 */

import {
  Stack,
  Group,
  Text,
  Box,
  Code,
  CopyButton,
  ActionIcon,
  ThemeIcon,
  Divider,
} from '@mantine/core';
import { Icon } from '@/components/ui';
import { useSkeletonKeySafe } from '@/contexts';
import { getUserId, getDeviceId } from '@/lib/sync';

export function AccountSettings() {
  const skeletonKeyContext = useSkeletonKeySafe();
  const userId = getUserId();
  const deviceId = getDeviceId();
  const hasSkeletonKey = skeletonKeyContext?.hasSkeletonKey ?? false;

  return (
    <Stack gap="lg">
      <Box>
        <Text size="xl" fw={600} mb="xs">
          Account
        </Text>
        <Text size="sm" c="dimmed">
          Your identity and encryption settings.
        </Text>
      </Box>

      <Divider />

      {/* Encryption Status */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          Encryption
        </Text>
        <Group gap="sm">
          {hasSkeletonKey ? (
            <>
              <ThemeIcon variant="light" color="sage" size="sm">
                <Icon name="lock" size={14} />
              </ThemeIcon>
              <Text size="sm">End-to-end encrypted with Skeleton Key</Text>
            </>
          ) : (
            <Text size="sm" c="ochre">
              No Skeleton Key configured
            </Text>
          )}
        </Group>
        <Text size="xs" c="dimmed" mt="xs">
          All sync methods use end-to-end encryption. Your data is encrypted
          before leaving this device.
        </Text>
      </Box>

      {/* User ID */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          User ID
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Share this ID across devices to sync data between them.
        </Text>
        <Group gap="xs">
          <Code style={{ flex: 1 }}>{userId}</Code>
          <CopyButton value={userId}>
            {({ copied, copy }) => (
              <ActionIcon
                variant="light"
                color={copied ? 'sage' : 'gray'}
                onClick={copy}
                title={copied ? 'Copied!' : 'Copy User ID'}
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} />
              </ActionIcon>
            )}
          </CopyButton>
        </Group>
      </Box>

      {/* Device ID */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          Device ID
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Unique identifier for this device (read-only).
        </Text>
        <Code>{deviceId}</Code>
      </Box>
    </Stack>
  );
}
