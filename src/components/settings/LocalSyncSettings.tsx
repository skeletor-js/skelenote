import { useState } from 'react';
import {
  Stack,
  Group,
  Title,
  Text,
  Box,
  Switch,
  Button,
  Code,
  Divider,
} from '@mantine/core';
import { Icon } from '@/components/ui';
import { useLocalSyncSafe } from '@/contexts/LocalSyncContext';
import { PairedDevicesList } from '@/components/sync/PairedDevicesList';
import { ShowPairingCodeModal } from '@/components/sync/ShowPairingCodeModal';
import { PairNewDeviceModal } from '@/components/sync/PairNewDeviceModal';
import { DeviceStatusIndicator } from '@/components/sync/DeviceStatusIndicator';

export function LocalSyncSettings() {
  const localSync = useLocalSyncSafe();
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);

  // Show nothing if context not available (not in Tauri environment)
  if (!localSync) {
    return null;
  }

  const {
    isEnabled,
    status,
    pairedDevices,
    connectedPeerCount,
    deviceInfo,
    serverPort,
    error,
    enable,
    disable,
    generateQrCode,
    pairDeviceManually,
    unpairDevice,
    reconnectDevice,
  } = localSync;

  const handleToggle = async () => {
    if (isEnabled) {
      await disable();
    } else {
      await enable();
    }
  };

  const getStatusLabel = () => {
    if (connectedPeerCount > 0) {
      return `${connectedPeerCount} device${connectedPeerCount === 1 ? '' : 's'} connected`;
    }
    switch (status) {
      case 'starting':
        return 'Starting...';
      case 'discovering':
        return 'Ready';
      case 'error':
        return 'Error';
      case 'off':
      default:
        return 'Off';
    }
  };

  const getDeviceStatus = ():
    | 'connected'
    | 'connecting'
    | 'offline'
    | 'error' => {
    if (connectedPeerCount > 0) return 'connected';
    if (status === 'starting') return 'connecting';
    if (status === 'error') return 'error';
    return 'offline';
  };

  const formatFingerprint = (fp: string): string => {
    if (fp.length === 8) {
      return `${fp.slice(0, 4).toUpperCase()}-${fp.slice(4).toUpperCase()}`;
    }
    return fp.toUpperCase();
  };

  return (
    <>
      <Box component="section">
        <Group justify="space-between" mb="xs">
          <Title order={4}>Local Sync</Title>
          <Switch
            checked={isEnabled}
            onChange={handleToggle}
            disabled={status === 'starting'}
          />
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          Sync devices on the same network — no internet required.
        </Text>

        {isEnabled && (
          <Stack gap="lg">
            {/* Status badge */}
            <Group gap="sm">
              <DeviceStatusIndicator status={getDeviceStatus()} />
              <Text size="sm" c="dimmed">
                {getStatusLabel()}
              </Text>
            </Group>

            {/* Error display */}
            {error && (
              <Box
                p="sm"
                style={(theme) => ({
                  borderRadius: theme.radius.sm,
                  backgroundColor: 'var(--mantine-color-brick-0)',
                  border: '1px solid var(--mantine-color-brick-3)',
                })}
              >
                <Text size="sm" c="brick">
                  {error}
                </Text>
              </Box>
            )}

            {/* Paired Devices Section */}
            <Box>
              <Group justify="space-between" align="center" mb="sm">
                <Text size="md" fw={600} c="carbon">
                  Paired Devices
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<Icon name="plus" size={14} />}
                  onClick={() => setShowPairModal(true)}
                >
                  Pair New Device
                </Button>
              </Group>

              <PairedDevicesList
                devices={pairedDevices}
                onReconnect={reconnectDevice}
                onUnpair={unpairDevice}
              />
            </Box>

            <Divider />

            {/* This Device Section */}
            <Box>
              <Text size="md" fw={600} c="carbon" mb="sm">
                This Device
              </Text>

              <Stack gap="xs">
                {deviceInfo && (
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={500}>
                      Name
                    </Text>
                    <Text size="sm" fw={500}>
                      {deviceInfo.deviceName}
                    </Text>
                  </Group>
                )}

                {deviceInfo?.fingerprint && (
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={500}>
                      Device Code
                    </Text>
                    <Code fz="xs">
                      {formatFingerprint(deviceInfo.fingerprint)}
                    </Code>
                  </Group>
                )}

                {serverPort && (
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={500}>
                      Port
                    </Text>
                    <Code fz="xs">{serverPort}</Code>
                  </Group>
                )}
              </Stack>

              <Button
                variant="filled"
                color="ember"
                fullWidth
                mt="md"
                leftSection={<Icon name="qr-code" size={16} />}
                onClick={() => setShowQrModal(true)}
              >
                Show Pairing Code
              </Button>
            </Box>
          </Stack>
        )}
      </Box>

      {/* Modals */}
      <ShowPairingCodeModal
        opened={showQrModal}
        onClose={() => setShowQrModal(false)}
        onGenerateQr={generateQrCode}
      />

      <PairNewDeviceModal
        opened={showPairModal}
        onClose={() => setShowPairModal(false)}
        onPairManually={pairDeviceManually}
      />
    </>
  );
}
