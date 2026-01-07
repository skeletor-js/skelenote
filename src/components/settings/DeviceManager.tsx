/**
 * Device Manager Component
 *
 * Displays all registered devices and allows renaming/revoking them.
 */

import { useState } from 'react';
import {
  Stack,
  Group,
  Title,
  Text,
  Box,
  ActionIcon,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import { Icon } from '@/components/ui';
import { useDeviceRegistrySafe } from '@/contexts/DeviceRegistryContext';
import { DeviceListItem } from './DeviceListItem';
import { RevokeConfirmDialog } from './RevokeConfirmDialog';
import { RenameDialog } from './RenameDialog';
import type { DeviceInfo } from '@/lib/devices';

export function DeviceManager() {
  const registry = useDeviceRegistrySafe();
  const [revokeTarget, setRevokeTarget] = useState<DeviceInfo | null>(null);
  const [renameTarget, setRenameTarget] = useState<DeviceInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Show nothing if context not available
  if (!registry) {
    return null;
  }

  const { devices, isLoading, error, revokeDevice, renameDevice, refresh } =
    registry;

  // Separate active and revoked devices
  const activeDevices = devices.filter((d) => !d.isRevoked);
  const revokedDevices = devices.filter((d) => d.isRevoked);

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
      <Box component="section">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Devices</Title>
        </Group>
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      </Box>
    );
  }

  return (
    <Box component="section">
      <Group justify="space-between" mb="sm">
        <Title order={4}>Devices</Title>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={refresh}
          title="Refresh device list"
        >
          <Icon name="refresh-cw" size={16} />
        </ActionIcon>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Manage devices that have access to your encrypted vault.
      </Text>

      {error && (
        <Alert color="brick" mb="md">
          {error}
        </Alert>
      )}

      {activeDevices.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="lg">
          No devices registered yet.
        </Text>
      ) : (
        <Stack gap={0} mb="md">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Active Devices
          </Text>
          <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
            {activeDevices.map((device) => (
              <DeviceListItem
                key={device.deviceId}
                device={device}
                onRename={() => setRenameTarget(device)}
                onRevoke={() => setRevokeTarget(device)}
              />
            ))}
          </Box>
        </Stack>
      )}

      {revokedDevices.length > 0 && (
        <Stack gap={0}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Revoked Devices
          </Text>
          <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
            {revokedDevices.map((device) => (
              <DeviceListItem key={device.deviceId} device={device} disabled />
            ))}
          </Box>
        </Stack>
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
    </Box>
  );
}
