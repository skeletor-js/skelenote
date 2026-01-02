import { useState } from 'react';
import { Stack, Group, Title, Text, Box, Switch, Badge, Alert, Button, ThemeIcon, Loader, Code } from '@mantine/core';
import { Icon } from '@/components/ui';
import { useLocalSyncSafe } from '@/contexts/LocalSyncContext';
import { connectToPeer, getConnectedPeers } from '@/lib/sync/local';

export function LocalSyncSettings() {
  const localSync = useLocalSyncSafe();
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectedPeerIds, setConnectedPeerIds] = useState<Set<string>>(new Set());

  // Show nothing if context not available (not in Tauri environment)
  if (!localSync) {
    return null;
  }

  const {
    isEnabled,
    status,
    discoveredPeers,
    connectedPeerCount,
    deviceInfo,
    serverPort,
    error,
    enable,
    disable,
    refreshConnectedCount,
  } = localSync;

  const handleConnect = async (deviceId: string) => {
    setConnectingTo(deviceId);
    try {
      await connectToPeer(deviceId);
      console.log('[LocalSyncSettings] Connection successful, refreshing peer count...');
      // Refresh connected peers (local UI state)
      const peers = await getConnectedPeers();
      setConnectedPeerIds(new Set(peers.map(p => p.deviceId)));
      // Refresh context's connected peer count (triggers docStore wiring)
      await refreshConnectedCount();
    } catch (err) {
      console.error('Failed to connect:', err);
    } finally {
      setConnectingTo(null);
    }
  };

  const isConnected = (deviceId: string) => {
    return connectedPeerIds.has(deviceId) || connectedPeerCount > 0;
  };

  const handleToggle = async () => {
    if (isEnabled) {
      await disable();
    } else {
      await enable();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'starting':
      case 'discovering':
        return 'ochre';
      case 'connected':
        return 'sage';
      case 'error':
        return 'brick';
      case 'off':
      default:
        return 'gray';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'starting':
        return 'Starting...';
      case 'discovering':
        return 'Searching for devices...';
      case 'connected':
        return `${discoveredPeers.length} device${discoveredPeers.length === 1 ? '' : 's'} found`;
      case 'error':
        return 'Error';
      case 'off':
      default:
        return 'Off';
    }
  };

  return (
    <Box component="section">
      <Group justify="space-between" mb="xs">
        <Title order={4}>Local Network Sync</Title>
        <Switch
          checked={isEnabled}
          onChange={handleToggle}
          disabled={status === 'starting'}
        />
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Sync directly with devices on your WiFi network. No internet required.
      </Text>

      {isEnabled && (
        <Stack gap="md">
          <Group gap="xs">
            <Badge color={getStatusColor()} variant="dot">
              {getStatusLabel()}
            </Badge>
          </Group>

          {error && (
            <Alert color="brick" variant="light">
              {error}
            </Alert>
          )}

          {discoveredPeers.length > 0 && (
            <Box>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
                Nearby Devices
              </Text>
              <Stack gap="xs">
                {discoveredPeers.map((peer) => (
                  <Group
                    key={peer.deviceId}
                    justify="space-between"
                    p="xs"
                    style={(theme) => ({
                      borderRadius: theme.radius.sm,
                      backgroundColor: 'var(--mantine-color-gray-0)',
                    })}
                  >
                    <Group gap="sm">
                      <ThemeIcon variant="light" color="slate" size="sm">
                        <Icon name="monitor" size={14} />
                      </ThemeIcon>
                      <Text size="sm">{peer.deviceName}</Text>
                    </Group>
                    {isConnected(peer.deviceId) ? (
                      <Badge color="sage" variant="light" size="sm" radius="sm">
                        <Group gap={4}>
                          <Box
                            w={6}
                            h={6}
                            style={{
                              borderRadius: '50%',
                              backgroundColor: 'var(--mantine-color-sage-6)',
                            }}
                          />
                          Connected
                        </Group>
                      </Badge>
                    ) : (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleConnect(peer.deviceId)}
                        disabled={connectingTo === peer.deviceId}
                        loading={connectingTo === peer.deviceId}
                      >
                        Connect
                      </Button>
                    )}
                  </Group>
                ))}
              </Stack>
            </Box>
          )}

          {status === 'discovering' && discoveredPeers.length === 0 && (
            <Group gap="sm" c="dimmed">
              <Loader size="xs" />
              <Text size="sm">Looking for devices with the same Skeleton Key...</Text>
            </Group>
          )}

          {deviceInfo && (
            <Box
              p="sm"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                backgroundColor: 'var(--mantine-color-gray-0)',
              })}
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">This device:</Text>
                  <Text size="sm" fw={500}>{deviceInfo.deviceName}</Text>
                </Group>
                {serverPort && (
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Port:</Text>
                    <Text size="sm">{serverPort}</Text>
                  </Group>
                )}
                {deviceInfo.fingerprint && (
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Fingerprint:</Text>
                    <Code fz="xs">{deviceInfo.fingerprint}</Code>
                  </Group>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}
