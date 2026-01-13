import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Button,
  Group,
  Box,
} from '@mantine/core';
import { Icon } from '@/components/ui';

interface PairNewDeviceModalProps {
  opened: boolean;
  onClose: () => void;
  onPairManually: (ip: string, port: number, code: string) => Promise<void>;
}

export function PairNewDeviceModal({
  opened,
  onClose,
  onPairManually,
}: PairNewDeviceModalProps) {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [code, setCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!connecting) {
      setIp('');
      setPort('');
      setCode('');
      setError(null);
      onClose();
    }
  };

  const handleConnect = async () => {
    // Validate inputs
    if (!ip || !port || !code) {
      setError('All fields are required');
      return;
    }

    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Invalid port number');
      return;
    }

    // Remove dashes and spaces from code
    const cleanCode = code.replace(/[-\s]/g, '');
    if (cleanCode.length !== 8) {
      setError('Code must be 8 characters');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      await onPairManually(ip, portNum, cleanCode);
      // Success - close modal
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to pair device';
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  const formatCodeInput = (value: string): string => {
    // Remove all non-alphanumeric characters
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Limit to 8 characters
    const limited = clean.slice(0, 8);
    // Add dash after 4th character
    if (limited.length > 4) {
      return `${limited.slice(0, 4)}-${limited.slice(4)}`;
    }
    return limited;
  };

  const handleCodeChange = (value: string) => {
    setCode(formatCodeInput(value));
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Pair New Device"
      size="md"
      centered
    >
      <Stack gap="lg">
        {/* Instructions */}
        <Box
          p="sm"
          style={(theme) => ({
            borderRadius: theme.radius.sm,
            backgroundColor: 'var(--mantine-color-gray-0)',
            borderLeft: '3px solid var(--mantine-color-slate-5)',
          })}
        >
          <Group gap="xs" align="flex-start">
            <Icon
              name="info"
              size={14}
              style={{
                marginTop: 2,
                color: 'var(--mantine-color-slate-6)',
                flexShrink: 0,
              }}
            />
            <Text size="xs" c="dimmed">
              Enter the connection details shown on your other device. Both
              devices must be on the same network.
            </Text>
          </Group>
        </Box>

        {/* Manual Entry Form */}
        <Stack gap="md">
          <TextInput
            label="IP Address"
            placeholder="192.168.1.50"
            leftSection={<Icon name="wifi" size={14} />}
            value={ip}
            onChange={(e) => setIp(e.currentTarget.value)}
            disabled={connecting}
            required
            size="sm"
          />

          <TextInput
            label="Port"
            placeholder="54321"
            leftSection={<Icon name="circle" size={14} />}
            value={port}
            onChange={(e) => setPort(e.currentTarget.value)}
            disabled={connecting}
            required
            size="sm"
            type="number"
            min={1}
            max={65535}
          />

          <TextInput
            label="Device Code"
            placeholder="A1B2-C3D4"
            leftSection={<Icon name="key" size={14} />}
            value={code}
            onChange={(e) => handleCodeChange(e.currentTarget.value)}
            disabled={connecting}
            maxLength={9} // 8 chars + 1 dash
            required
            size="sm"
          />
        </Stack>

        {/* Error */}
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

        {/* Actions */}
        <Group justify="flex-end" gap="sm" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={connecting}>
            Cancel
          </Button>
          <Button
            variant="filled"
            color="ember"
            onClick={handleConnect}
            loading={connecting}
            leftSection={<Icon name="smartphone" size={14} />}
          >
            Pair Device
          </Button>
        </Group>

        {/* Future: Camera scanning option */}
        {/*
        <Divider label="Or scan QR code" labelPosition="center" />
        <Button
          variant="light"
          leftSection={<Icon name="camera" size={16} />}
          fullWidth
        >
          Open Camera
        </Button>
        */}
      </Stack>
    </Modal>
  );
}
