import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Group,
  Title,
  Text,
  Box,
  TextInput,
  Button,
  Badge,
  Divider,
  Code,
  CopyButton,
  ActionIcon,
  ThemeIcon,
} from '@mantine/core';
import { Icon } from '@/components/ui';
import { useSyncContextSafe, useSkeletonKeySafe } from '@/contexts';
import {
  getUserId,
  getDeviceId,
  getSyncServerUrl,
  setSyncServerUrl,
  isValidWebSocketUrl,
} from '@/lib/sync';
import { LocalSyncSettings } from './LocalSyncSettings';
import { DeviceManager } from './DeviceManager';

export function SyncSettings() {
  const syncContext = useSyncContextSafe();
  const skeletonKeyContext = useSkeletonKeySafe();
  const [serverUrl, setServerUrl] = useState(getSyncServerUrl() || '');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const userId = getUserId();
  const deviceId = getDeviceId();
  const isConnected = syncContext?.isConnected ?? false;
  const status = syncContext?.status ?? 'disconnected';
  const hasSkeletonKey = skeletonKeyContext?.hasSkeletonKey ?? false;

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

  const handleResetVault = useCallback(async () => {
    if (!skeletonKeyContext) return;

    setIsResetting(true);
    try {
      // Disconnect sync first
      syncContext?.disconnect();

      // Reset the vault
      await skeletonKeyContext.resetVault();

      // The app will now show the Skeleton Key setup screen
    } catch (err) {
      console.error('[SyncSettings] Failed to reset vault:', err);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  }, [skeletonKeyContext, syncContext]);

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
    <Stack gap="lg" component="section">
      <Title order={2}>Sync Settings</Title>

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

      <Divider />

      {/* Device Manager */}
      <DeviceManager />

      <Divider />

      {/* Local Sync Settings */}
      <LocalSyncSettings />

      <Divider />

      {/* Courier */}
      <Box>
        <Title order={4} mb="xs">
          Courier
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Sync devices anywhere — encrypted end-to-end.
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

      <Divider />

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

      <Divider />

      {/* Danger Zone */}
      <Box>
        <Text size="sm" fw={500} c="brick" mb="xs">
          Danger Zone
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Reset your vault to use a different Skeleton Key. This will disconnect
          sync and clear your encryption key from this device.
        </Text>

        {showResetConfirm ? (
          <Group gap="sm">
            <Text size="sm">Are you sure?</Text>
            <Button
              size="xs"
              color="brick"
              onClick={handleResetVault}
              disabled={isResetting}
              loading={isResetting}
            >
              Yes, Reset
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() => setShowResetConfirm(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
          </Group>
        ) : (
          <Button
            variant="outline"
            color="brick"
            onClick={() => setShowResetConfirm(true)}
          >
            Reset Vault
          </Button>
        )}
      </Box>
    </Stack>
  );
}
