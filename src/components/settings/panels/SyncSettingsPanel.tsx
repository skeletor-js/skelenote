/**
 * Sync Settings Panel
 *
 * Configuration for sync methods: Devices, Local Network Sync, and Cloud Relay.
 * Extracted from SyncSettings.tsx (without Account info and Danger Zone).
 */

import { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Text,
  Box,
  TextInput,
  Button,
  Badge,
  Divider,
} from '@mantine/core';
import { useSyncContextSafe } from '@/contexts';
import {
  getUserId,
  getDeviceId,
  getSyncServerUrl,
  setSyncServerUrl,
  isValidWebSocketUrl,
} from '@/lib/sync';
import { LocalSyncSettings } from '../LocalSyncSettings';
import { DeviceManager } from '../DeviceManager';

export function SyncSettingsPanel() {
  const syncContext = useSyncContextSafe();
  const [serverUrl, setServerUrl] = useState(getSyncServerUrl() || '');
  const [urlError, setUrlError] = useState<string | null>(null);

  const userId = getUserId();
  const deviceId = getDeviceId();
  const isConnected = syncContext?.isConnected ?? false;
  const status = syncContext?.status ?? 'disconnected';

  // Validate URL on change
  useEffect(() => {
    if (serverUrl && !isValidWebSocketUrl(serverUrl)) {
      setUrlError('URL must start with ws:// or wss://');
    } else {
      setUrlError(null);
    }
  }, [serverUrl]);

  const handleConnect = () => {
    if (!syncContext || !serverUrl || urlError) return;

    setSyncServerUrl(serverUrl);
    syncContext.connect(serverUrl, userId, deviceId);
  };

  const handleDisconnect = () => {
    if (!syncContext) return;
    syncContext.disconnect();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'sage';
      case 'connecting':
      case 'syncing':
        return 'ochre';
      case 'disconnected':
      default:
        return 'gray';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'syncing':
        return 'Syncing...';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Text size="lg" fw={600} mb="xs">
          Sync
        </Text>
        <Text size="sm" c="dimmed">
          Configure how your data syncs across devices.
        </Text>
      </Box>

      {/* Device Manager */}
      <DeviceManager />

      <Divider />

      {/* Local Sync Settings */}
      <LocalSyncSettings />

      <Divider />

      {/* Cloud Relay */}
      <Box>
        <Text size="md" fw={600} mb="xs">
          Cloud Relay
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Sync through a relay server when devices aren't on the same network.
        </Text>

        <Stack gap="sm">
          <Box>
            <Text size="xs" fw={500} mb={4}>
              Server URL
            </Text>
            <TextInput
              placeholder="wss://your-worker.workers.dev"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              disabled={isConnected}
              error={urlError}
            />
          </Box>

          <Group gap="xs">
            <Badge color={getStatusColor()} variant="dot">
              {getStatusLabel()}
            </Badge>
          </Group>

          {isConnected ? (
            <Button variant="default" onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={!serverUrl || !!urlError || !syncContext}
            >
              Connect
            </Button>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
