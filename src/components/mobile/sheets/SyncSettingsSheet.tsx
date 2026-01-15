/**
 * Sync Settings Sheet
 * Features: Cloud relay configuration, connection status, device management link
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  Button,
  TextInput,
  Badge,
  Group,
  Switch,
  Loader,
} from '@mantine/core';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  Wifi,
  WifiOff,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { BottomSheet } from '../primitives';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface SyncSettingsSheetProps {
  opened: boolean;
  onClose: () => void;
  // Cloud sync
  cloudEnabled: boolean;
  cloudRelayUrl: string;
  cloudStatus: ConnectionStatus;
  onCloudEnabledChange: (enabled: boolean) => void;
  onCloudRelayUrlChange: (url: string) => void;
  onReconnect: () => void;
  // Local sync
  localSyncEnabled: boolean;
  localSyncStatus: ConnectionStatus;
  localPeersCount: number;
  onLocalSyncEnabledChange: (enabled: boolean) => void;
  // Navigation
  onOpenDeviceManager: () => void;
}

export function SyncSettingsSheet({
  opened,
  onClose,
  cloudEnabled,
  cloudRelayUrl,
  cloudStatus,
  onCloudEnabledChange,
  onCloudRelayUrlChange,
  onReconnect,
  localSyncEnabled,
  localSyncStatus,
  localPeersCount,
  onLocalSyncEnabledChange,
  onOpenDeviceManager,
}: SyncSettingsSheetProps) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlValue, setUrlValue] = useState(cloudRelayUrl);

  // Get status badge color and icon
  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return { color: 'sage', icon: <Check size={12} />, label: 'Connected' };
      case 'connecting':
        return {
          color: 'ember',
          icon: <Loader size={12} />,
          label: 'Connecting',
        };
      case 'disconnected':
        return {
          color: 'gray',
          icon: <CloudOff size={12} />,
          label: 'Disconnected',
        };
      case 'error':
        return { color: 'brick', icon: <WifiOff size={12} />, label: 'Error' };
    }
  };

  // Handle URL save
  const handleSaveUrl = useCallback(() => {
    onCloudRelayUrlChange(urlValue);
    setEditingUrl(false);
  }, [urlValue, onCloudRelayUrlChange]);

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setEditingUrl(false);
    setUrlValue(cloudRelayUrl);
    onClose();
  }, [cloudRelayUrl, onClose]);

  const cloudBadge = getStatusBadge(cloudStatus);
  const localBadge = getStatusBadge(localSyncStatus);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Sync Settings"
      size="lg"
    >
      <Stack gap="lg" p="md">
        {/* Cloud Sync Section */}
        <Box
          style={{
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            backgroundColor: 'var(--surface-paper)',
          }}
        >
          <Stack gap="md">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm">
                <Cloud
                  size={18}
                  style={{ color: 'var(--mantine-color-ember-6)' }}
                />
                <Text size="sm" fw={600}>
                  Cloud Sync
                </Text>
              </Group>
              <Switch
                checked={cloudEnabled}
                onChange={(e) => onCloudEnabledChange(e.currentTarget.checked)}
                size="md"
              />
            </Group>

            {cloudEnabled && (
              <>
                <Group gap="sm">
                  <Badge
                    color={cloudBadge.color}
                    variant="light"
                    leftSection={cloudBadge.icon}
                  >
                    {cloudBadge.label}
                  </Badge>
                </Group>

                {/* Relay URL */}
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Relay Server
                  </Text>
                  {editingUrl ? (
                    <Stack gap="xs">
                      <TextInput
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder="wss://relay.example.com"
                        size="sm"
                        autoFocus
                      />
                      <Group gap="xs">
                        <Button size="xs" onClick={handleSaveUrl}>
                          Save
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => {
                            setUrlValue(cloudRelayUrl);
                            setEditingUrl(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </Group>
                    </Stack>
                  ) : (
                    <Group gap="xs" wrap="nowrap">
                      <Text
                        size="sm"
                        ff="monospace"
                        style={{ flex: 1 }}
                        truncate
                      >
                        {cloudRelayUrl || 'Not configured'}
                      </Text>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => setEditingUrl(true)}
                      >
                        Edit
                      </Button>
                    </Group>
                  )}
                </Stack>

                {/* Reconnect button */}
                {cloudStatus !== 'connected' && (
                  <Button
                    variant="light"
                    leftSection={<RefreshCw size={16} />}
                    onClick={onReconnect}
                    loading={cloudStatus === 'connecting'}
                  >
                    Reconnect
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Box>

        {/* Local Sync Section */}
        <Box
          style={{
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            backgroundColor: 'var(--surface-paper)',
          }}
        >
          <Stack gap="md">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm">
                <Wifi
                  size={18}
                  style={{ color: 'var(--mantine-color-sage-6)' }}
                />
                <Text size="sm" fw={600}>
                  Local Network Sync
                </Text>
              </Group>
              <Switch
                checked={localSyncEnabled}
                onChange={(e) =>
                  onLocalSyncEnabledChange(e.currentTarget.checked)
                }
                size="md"
              />
            </Group>

            {localSyncEnabled && (
              <>
                <Group gap="sm">
                  <Badge
                    color={localBadge.color}
                    variant="light"
                    leftSection={localBadge.icon}
                  >
                    {localBadge.label}
                  </Badge>
                  {localPeersCount > 0 && (
                    <Text size="xs" c="dimmed">
                      {localPeersCount} device{localPeersCount !== 1 ? 's' : ''}{' '}
                      found
                    </Text>
                  )}
                </Group>

                <Text size="xs" c="dimmed">
                  Sync directly with devices on the same network using
                  peer-to-peer connection.
                </Text>
              </>
            )}
          </Stack>
        </Box>

        {/* Device Manager Link */}
        <Box
          onClick={onOpenDeviceManager}
          style={{
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            backgroundColor: 'var(--surface-paper)',
            cursor: 'pointer',
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm">
              <Smartphone
                size={18}
                style={{ color: 'var(--mantine-color-gray-6)' }}
              />
              <Stack gap={0}>
                <Text size="sm" fw={600}>
                  Device Manager
                </Text>
                <Text size="xs" c="dimmed">
                  View and manage paired devices
                </Text>
              </Stack>
            </Group>
            <ChevronRight
              size={16}
              style={{ color: 'var(--mantine-color-gray-4)' }}
            />
          </Group>
        </Box>
      </Stack>
    </BottomSheet>
  );
}
