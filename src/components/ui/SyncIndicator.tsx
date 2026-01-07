import {
  UnstyledButton,
  Group,
  Text,
  Box,
  Tooltip,
  MantineColor,
  Loader,
} from '@mantine/core';
import { Icon } from './Icon';
import { useSyncContextSafe, useLocalSyncSafe } from '@/contexts';

interface StatusConfig {
  color: MantineColor;
  label: string;
  clickable: boolean;
  showLocalIcon: boolean;
  isLoading: boolean;
}

export function SyncIndicator() {
  const syncContext = useSyncContextSafe();
  const localSyncContext = useLocalSyncSafe();

  // When SyncProvider is not available, show "Local only" state
  const status = syncContext?.status ?? 'disconnected';
  const pendingCount = syncContext?.pendingCount ?? 0;
  const hasError = syncContext?.hasError ?? false;
  const reconnect = syncContext?.reconnect;
  const hasSyncProvider = syncContext !== null;

  // Local network sync status
  const isLocalSyncConnected =
    localSyncContext?.isEnabled && localSyncContext?.connectedPeerCount > 0;
  const localPeerCount = localSyncContext?.connectedPeerCount ?? 0;

  const getStatusConfig = (): StatusConfig => {
    // If local sync is connected but cloud is not
    if (isLocalSyncConnected && status !== 'connected') {
      return {
        color: 'cyan',
        label: `Local (${localPeerCount})`,
        clickable: false,
        showLocalIcon: true,
        isLoading: false,
      };
    }

    // If both cloud and local sync are connected
    if (isLocalSyncConnected && status === 'connected') {
      return {
        color: 'green',
        label: `Synced +${localPeerCount} local`,
        clickable: false,
        showLocalIcon: true,
        isLoading: false,
      };
    }

    if (!hasSyncProvider) {
      return {
        color: 'gray',
        label: 'Local only',
        clickable: false,
        showLocalIcon: false,
        isLoading: false,
      };
    }

    // Show error state if there's an error
    if (hasError) {
      return {
        color: 'red',
        label: 'Sync error',
        clickable: true,
        showLocalIcon: false,
        isLoading: false,
      };
    }

    switch (status) {
      case 'connected':
        return {
          color: 'green',
          label: 'Synced',
          clickable: false,
          showLocalIcon: false,
          isLoading: false,
        };
      case 'syncing':
        return {
          color: 'blue',
          label: 'Syncing...',
          clickable: false,
          showLocalIcon: false,
          isLoading: true,
        };
      case 'connecting':
        return {
          color: 'yellow',
          label: 'Connecting...',
          clickable: false,
          showLocalIcon: false,
          isLoading: true,
        };
      case 'disconnected':
      default:
        return {
          color: 'gray',
          label: 'Offline',
          clickable: true,
          showLocalIcon: false,
          isLoading: false,
        };
    }
  };

  const config = getStatusConfig();

  const handleClick = () => {
    if (config.clickable && reconnect) {
      reconnect();
    }
  };

  const buttonContent = (
    <Group gap={6} wrap="nowrap">
      {config.showLocalIcon && (
        <Tooltip label="Local network sync active" withArrow>
          <Box component="span" style={{ display: 'flex' }}>
            <Icon
              name="wifi"
              size={12}
              color={`var(--mantine-color-${config.color}-6)`}
            />
          </Box>
        </Tooltip>
      )}
      {config.isLoading ? (
        <Loader size={8} color={config.color} />
      ) : (
        <Box
          component="span"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: `var(--mantine-color-${config.color}-6)`,
          }}
        />
      )}
      <Text size="xs" c="dimmed">
        {config.label}
      </Text>
      {pendingCount > 0 && (
        <Text size="xs" c="dimmed">
          ({pendingCount})
        </Text>
      )}
    </Group>
  );

  if (config.clickable) {
    return (
      <Tooltip label="Click to reconnect" withArrow>
        <UnstyledButton onClick={handleClick}>{buttonContent}</UnstyledButton>
      </Tooltip>
    );
  }

  return <Box>{buttonContent}</Box>;
}
