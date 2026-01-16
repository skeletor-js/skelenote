/**
 * Device Manager Sheet for Mobile
 * Features: View connected devices, rename, and revoke device access
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  Button,
  Group,
  Badge,
  ActionIcon,
  ThemeIcon,
  ScrollArea,
  TextInput,
  Center,
  Loader,
  Alert,
} from '@mantine/core';
import {
  Smartphone,
  Laptop,
  Monitor,
  Edit2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useDeviceRegistrySafe } from '@/contexts/DeviceRegistryContext';
import { useToast } from '@/contexts';
import { useHaptics } from '@/hooks';
import {
  formatLastSeen,
  getPlatformDisplayName,
  type DeviceInfo,
  type DevicePlatform,
} from '@/lib/devices';

interface DeviceManagerSheetProps {
  opened: boolean;
  onClose: () => void;
}

type SheetState = 'list' | 'rename' | 'revoke';

/**
 * Get platform-specific icon component
 */
function getPlatformIcon(platform: DevicePlatform) {
  switch (platform) {
    case 'macos':
    case 'windows':
    case 'linux':
      return Laptop;
    case 'ios':
    case 'android':
      return Smartphone;
    case 'web':
    default:
      return Monitor;
  }
}

export function DeviceManagerSheet({
  opened,
  onClose,
}: DeviceManagerSheetProps) {
  const registry = useDeviceRegistrySafe();
  const { addToast } = useToast();
  const { notification, impact } = useHaptics();

  const [state, setState] = useState<SheetState>('list');
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [newName, setNewName] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setState('list');
    setSelectedDevice(null);
    setNewName('');
    setRevokeReason('');
    setIsProcessing(false);
    onClose();
  }, [onClose]);

  // Start rename flow
  const handleRenameStart = useCallback(
    (device: DeviceInfo) => {
      impact('light');
      setSelectedDevice(device);
      setNewName(device.name);
      setState('rename');
    },
    [impact]
  );

  // Start revoke flow
  const handleRevokeStart = useCallback(
    (device: DeviceInfo) => {
      impact('medium');
      setSelectedDevice(device);
      setRevokeReason('');
      setState('revoke');
    },
    [impact]
  );

  // Confirm rename
  const handleRenameConfirm = useCallback(async () => {
    if (!selectedDevice || !registry || !newName.trim()) return;

    setIsProcessing(true);
    try {
      await registry.renameDevice(selectedDevice.deviceId, newName.trim());
      notification('success');
      addToast({
        type: 'success',
        message: 'Device renamed',
      });
      setState('list');
      setSelectedDevice(null);
    } catch (err) {
      notification('error');
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to rename device',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDevice, registry, newName, notification, addToast]);

  // Confirm revoke
  const handleRevokeConfirm = useCallback(async () => {
    if (!selectedDevice || !registry) return;

    setIsProcessing(true);
    try {
      await registry.revokeDevice(
        selectedDevice.deviceId,
        revokeReason.trim() || undefined
      );
      notification('success');
      addToast({
        type: 'success',
        message: 'Device access revoked',
      });
      setState('list');
      setSelectedDevice(null);
    } catch (err) {
      notification('error');
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to revoke device',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDevice, registry, revokeReason, notification, addToast]);

  // Back to list
  const handleBack = useCallback(() => {
    setState('list');
    setSelectedDevice(null);
    setNewName('');
    setRevokeReason('');
  }, []);

  // Context not available
  if (!registry) {
    return (
      <BottomSheet
        opened={opened}
        onClose={handleClose}
        title="Manage Devices"
        size="lg"
      >
        <Box p="md">
          <Text c="dimmed" ta="center">
            Device management is not available.
          </Text>
        </Box>
      </BottomSheet>
    );
  }

  const { devices, isLoading, error, refresh } = registry;

  // Separate active and revoked devices
  const activeDevices = devices.filter((d) => !d.isRevoked);
  const revokedDevices = devices.filter((d) => d.isRevoked);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title={
        state === 'list'
          ? 'Manage Devices'
          : state === 'rename'
            ? 'Rename Device'
            : 'Revoke Access'
      }
      size="lg"
    >
      {/* Device List State */}
      {state === 'list' && (
        <Stack gap={0} style={{ height: '100%' }}>
          {/* Header with refresh */}
          <Box
            px="md"
            py="sm"
            style={{ borderBottom: '1px solid var(--border-default)' }}
          >
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Devices with vault access
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => {
                  impact('light');
                  refresh();
                }}
              >
                <RefreshCw size={16} />
              </ActionIcon>
            </Group>
          </Box>

          {/* Loading state */}
          {isLoading && (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          )}

          {/* Error state */}
          {error && (
            <Box p="md">
              <Alert icon={<AlertTriangle size={16} />} color="brick">
                {error}
              </Alert>
            </Box>
          )}

          {/* Device list */}
          {!isLoading && (
            <ScrollArea style={{ flex: 1 }} px="md" py="sm">
              {activeDevices.length === 0 ? (
                <Text c="dimmed" ta="center" py="lg">
                  No devices registered yet.
                </Text>
              ) : (
                <Stack gap="xs">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
                    Active Devices
                  </Text>

                  {activeDevices.map((device) => {
                    const PlatformIcon = getPlatformIcon(device.platform);

                    return (
                      <Box
                        key={device.deviceId}
                        py="sm"
                        px="xs"
                        style={{
                          borderRadius: 8,
                          backgroundColor: device.isCurrentDevice
                            ? 'var(--mantine-color-slate-0)'
                            : 'transparent',
                        }}
                      >
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon variant="light" color="slate" size="lg">
                            <PlatformIcon size={18} />
                          </ThemeIcon>

                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Group gap="xs" wrap="nowrap">
                              <Text size="sm" fw={500} truncate>
                                {device.name}
                              </Text>
                              {device.isCurrentDevice && (
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color="slate"
                                  radius="sm"
                                >
                                  This device
                                </Badge>
                              )}
                            </Group>
                            <Group gap="xs" mt={2}>
                              <Text size="xs" c="dimmed">
                                {getPlatformDisplayName(device.platform)}
                              </Text>
                              <Text size="xs" c="dimmed">
                                ·
                              </Text>
                              <Text size="xs" c="dimmed">
                                {formatLastSeen(device.lastSeen)}
                              </Text>
                            </Group>
                          </Box>

                          {!device.isCurrentDevice && (
                            <Group gap="xs">
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                onClick={() => handleRenameStart(device)}
                                aria-label="Rename device"
                              >
                                <Edit2 size={14} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                color="brick"
                                onClick={() => handleRevokeStart(device)}
                                aria-label="Revoke device access"
                              >
                                <XCircle size={14} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Group>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {/* Revoked devices section */}
              {revokedDevices.length > 0 && (
                <Stack gap="xs" mt="lg">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
                    Revoked Devices
                  </Text>

                  {revokedDevices.map((device) => {
                    const PlatformIcon = getPlatformIcon(device.platform);

                    return (
                      <Box
                        key={device.deviceId}
                        py="sm"
                        px="xs"
                        style={{
                          borderRadius: 8,
                          backgroundColor: 'var(--mantine-color-gray-1)',
                          opacity: 0.6,
                        }}
                      >
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon variant="light" color="gray" size="lg">
                            <PlatformIcon size={18} />
                          </ThemeIcon>

                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Group gap="xs" wrap="nowrap">
                              <Text size="sm" fw={500} truncate>
                                {device.name}
                              </Text>
                              <Badge
                                size="xs"
                                variant="light"
                                color="brick"
                                radius="sm"
                              >
                                Revoked
                              </Badge>
                            </Group>
                            <Text size="xs" c="dimmed" mt={2}>
                              {getPlatformDisplayName(device.platform)}
                            </Text>
                          </Box>
                        </Group>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </ScrollArea>
          )}
        </Stack>
      )}

      {/* Rename State */}
      {state === 'rename' && selectedDevice && (
        <Stack gap="md" p="md">
          <Text size="sm" c="dimmed">
            Enter a new name for this device.
          </Text>

          <TextInput
            label="Device Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Work Laptop"
            autoFocus
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              onClick={handleBack}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="ember"
              onClick={handleRenameConfirm}
              loading={isProcessing}
              disabled={
                !newName.trim() || newName.trim() === selectedDevice.name
              }
              leftSection={<Check size={16} />}
            >
              Save
            </Button>
          </Group>
        </Stack>
      )}

      {/* Revoke State */}
      {state === 'revoke' && selectedDevice && (
        <Stack gap="md" p="md">
          <Alert
            icon={<AlertTriangle size={16} />}
            color="brick"
            variant="light"
          >
            <Text size="sm" fw={500}>
              This will permanently revoke access for "{selectedDevice.name}".
            </Text>
            <Text size="xs" mt="xs">
              The device will no longer be able to sync with your vault. This
              action cannot be undone.
            </Text>
          </Alert>

          <TextInput
            label="Reason (optional)"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="e.g., Lost device, Sold computer"
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              onClick={handleBack}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="brick"
              onClick={handleRevokeConfirm}
              loading={isProcessing}
              leftSection={<XCircle size={16} />}
            >
              Revoke Access
            </Button>
          </Group>
        </Stack>
      )}
    </BottomSheet>
  );
}
