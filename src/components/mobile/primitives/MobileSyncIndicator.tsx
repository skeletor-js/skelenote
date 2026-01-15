/**
 * Mobile Sync Indicator
 * Compact sync status badge for mobile header
 * Taps to show sync details sheet
 */

import { useState, useCallback } from 'react';
import { Box, Group, Text, Loader } from '@mantine/core';
import { Cloud, CloudOff, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSyncContextSafe, useLocalSyncSafe } from '@/contexts';
import { BottomSheet } from './BottomSheet';

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'local-only';

interface StatusConfig {
  icon: React.ReactNode;
  color: string;
  label: string;
  description: string;
}

export function MobileSyncIndicator() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const syncContext = useSyncContextSafe();
  const localSyncContext = useLocalSyncSafe();

  // Sync state
  const status = syncContext?.status ?? 'disconnected';
  const hasError = syncContext?.hasError ?? false;
  const reconnect = syncContext?.reconnect;
  const hasSyncProvider = syncContext !== null;

  // Local network sync status
  const isLocalSyncEnabled = localSyncContext?.isEnabled ?? false;
  const localPeerCount = localSyncContext?.connectedPeerCount ?? 0;
  const isLocalSyncConnected = isLocalSyncEnabled && localPeerCount > 0;

  // Determine overall sync status
  const getSyncStatus = (): SyncStatus => {
    if (hasError) return 'error';
    if (!hasSyncProvider) {
      return isLocalSyncConnected ? 'local-only' : 'offline';
    }
    if (status === 'connected') return 'synced';
    if (status === 'syncing' || status === 'connecting') return 'syncing';
    if (isLocalSyncConnected) return 'local-only';
    return 'offline';
  };

  const syncStatus = getSyncStatus();

  // Get configuration for current status
  const getStatusConfig = (): StatusConfig => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: <Cloud size={14} />,
          color: 'var(--mantine-color-sage-6)',
          label: 'Synced',
          description: isLocalSyncConnected
            ? `Cloud synced + ${localPeerCount} local device${localPeerCount !== 1 ? 's' : ''}`
            : 'All changes synced to cloud',
        };
      case 'syncing':
        return {
          icon: <Loader size={12} color="var(--mantine-color-ember-6)" />,
          color: 'var(--mantine-color-ember-6)',
          label: 'Syncing',
          description: 'Syncing changes...',
        };
      case 'local-only':
        return {
          icon: <Wifi size={14} />,
          color: 'var(--mantine-color-cyan-6)',
          label: `Local (${localPeerCount})`,
          description: `Syncing with ${localPeerCount} device${localPeerCount !== 1 ? 's' : ''} on local network`,
        };
      case 'error':
        return {
          icon: <CloudOff size={14} />,
          color: 'var(--mantine-color-brick-6)',
          label: 'Error',
          description: 'Sync error. Tap to retry.',
        };
      case 'offline':
      default:
        return {
          icon: <WifiOff size={14} />,
          color: 'var(--mantine-color-gray-5)',
          label: 'Offline',
          description: 'Not connected to sync server',
        };
    }
  };

  const config = getStatusConfig();

  // Handle tap on indicator
  const handleTap = useCallback(() => {
    setSheetOpen(true);
  }, []);

  // Handle reconnect
  const handleReconnect = useCallback(() => {
    if (reconnect) {
      reconnect();
    }
    setSheetOpen(false);
  }, [reconnect]);

  return (
    <>
      {/* Compact indicator badge */}
      <Box
        onClick={handleTap}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 12,
          backgroundColor: 'var(--surface-overlay)',
          cursor: 'pointer',
        }}
      >
        <Box style={{ display: 'flex', color: config.color }}>
          {config.icon}
        </Box>
        <Text size="xs" fw={500} style={{ color: config.color }}>
          {config.label}
        </Text>
      </Box>

      {/* Sync details sheet */}
      <BottomSheet
        opened={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sync Status"
        size="sm"
      >
        <Box p="md">
          {/* Current status */}
          <Group gap="sm" mb="md">
            <Box
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: `${config.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: config.color,
              }}
            >
              {config.icon}
            </Box>
            <Box>
              <Text size="sm" fw={600}>
                {config.label}
              </Text>
              <Text size="xs" c="dimmed">
                {config.description}
              </Text>
            </Box>
          </Group>

          {/* Cloud sync info */}
          <Box py="sm" style={{ borderTop: '1px solid var(--border-default)' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                Cloud Sync
              </Text>
              <Text
                size="sm"
                fw={500}
                c={
                  status === 'connected'
                    ? 'sage'
                    : status === 'connecting' || status === 'syncing'
                      ? 'ember'
                      : 'dimmed'
                }
              >
                {status === 'connected'
                  ? 'Connected'
                  : status === 'connecting'
                    ? 'Connecting...'
                    : status === 'syncing'
                      ? 'Syncing...'
                      : 'Disconnected'}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Local Network
              </Text>
              <Text
                size="sm"
                fw={500}
                c={isLocalSyncConnected ? 'cyan' : 'dimmed'}
              >
                {isLocalSyncEnabled
                  ? isLocalSyncConnected
                    ? `${localPeerCount} device${localPeerCount !== 1 ? 's' : ''}`
                    : 'Searching...'
                  : 'Disabled'}
              </Text>
            </Group>
          </Box>

          {/* Reconnect button if offline or error */}
          {(syncStatus === 'offline' || syncStatus === 'error') &&
            reconnect && (
              <Box
                onClick={handleReconnect}
                mt="md"
                py="sm"
                style={{
                  borderTop: '1px solid var(--border-default)',
                  cursor: 'pointer',
                }}
              >
                <Group gap="sm" justify="center">
                  <RefreshCw
                    size={16}
                    style={{ color: 'var(--mantine-color-ember-6)' }}
                  />
                  <Text size="sm" fw={500} c="ember">
                    Reconnect
                  </Text>
                </Group>
              </Box>
            )}
        </Box>
      </BottomSheet>
    </>
  );
}
