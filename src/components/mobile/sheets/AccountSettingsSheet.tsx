/**
 * Account Settings Sheet
 * Features: View Skeleton Key, User ID, Device info
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  Button,
  CopyButton,
  Group,
  Badge,
  Alert,
} from '@mantine/core';
import {
  Key,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Fingerprint,
} from 'lucide-react';
import { BottomSheet } from '../primitives';

interface AccountSettingsSheetProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
  deviceId: string;
  deviceFingerprint: string;
  onRevealMnemonic: () => Promise<string[] | null>;
  isEncrypted: boolean;
}

export function AccountSettingsSheet({
  opened,
  onClose,
  userId,
  deviceId,
  deviceFingerprint,
  onRevealMnemonic,
  isEncrypted,
}: AccountSettingsSheetProps) {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonic, setMnemonic] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle reveal mnemonic
  const handleRevealMnemonic = useCallback(async () => {
    if (showMnemonic) {
      setShowMnemonic(false);
      setMnemonic(null);
      return;
    }

    setIsLoading(true);
    try {
      const words = await onRevealMnemonic();
      if (words) {
        setMnemonic(words);
        setShowMnemonic(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showMnemonic, onRevealMnemonic]);

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setShowMnemonic(false);
    setMnemonic(null);
    onClose();
  }, [onClose]);

  // Format ID for display (truncate middle)
  const formatId = (id: string, maxLength: number = 16) => {
    if (id.length <= maxLength) return id;
    const start = id.slice(0, maxLength / 2);
    const end = id.slice(-maxLength / 2);
    return `${start}...${end}`;
  };

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Account"
      size="lg"
    >
      <Stack gap="lg" p="md">
        {/* Encryption Status */}
        <Group gap="sm">
          <Badge
            color={isEncrypted ? 'sage' : 'brick'}
            variant="light"
            leftSection={
              isEncrypted ? <Check size={12} /> : <AlertTriangle size={12} />
            }
          >
            {isEncrypted ? 'Encrypted' : 'Not Encrypted'}
          </Badge>
        </Group>

        {/* Skeleton Key Section */}
        <Box
          style={{
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            backgroundColor: 'var(--surface-paper)',
          }}
        >
          <Stack gap="md">
            <Group gap="sm">
              <Key
                size={18}
                style={{ color: 'var(--mantine-color-ember-6)' }}
              />
              <Text size="sm" fw={600}>
                Skeleton Key
              </Text>
            </Group>

            <Text size="sm" c="dimmed">
              Your 24-word recovery phrase. Keep it safe and never share it with
              anyone.
            </Text>

            <Alert
              icon={<AlertTriangle size={16} />}
              color="ember"
              variant="light"
              title="Backup Required"
            >
              Make sure you have written down your Skeleton Key. It cannot be
              recovered if lost.
            </Alert>

            <Button
              variant="light"
              leftSection={
                showMnemonic ? <EyeOff size={16} /> : <Eye size={16} />
              }
              onClick={handleRevealMnemonic}
              loading={isLoading}
            >
              {showMnemonic ? 'Hide Skeleton Key' : 'Reveal Skeleton Key'}
            </Button>

            {showMnemonic && mnemonic && (
              <Box
                style={{
                  padding: 16,
                  backgroundColor: 'var(--surface-overlay)',
                  borderRadius: 8,
                  border: '1px dashed var(--border-default)',
                }}
              >
                <Stack gap="sm">
                  <Box
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                    }}
                  >
                    {mnemonic.map((word, index) => (
                      <Text key={index} size="xs" ff="monospace">
                        {index + 1}. {word}
                      </Text>
                    ))}
                  </Box>
                  <CopyButton value={mnemonic.join(' ')}>
                    {({ copied, copy }) => (
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={
                          copied ? <Check size={14} /> : <Copy size={14} />
                        }
                        onClick={copy}
                      >
                        {copied ? 'Copied!' : 'Copy to clipboard'}
                      </Button>
                    )}
                  </CopyButton>
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Identifiers Section */}
        <Box
          style={{
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            backgroundColor: 'var(--surface-paper)',
          }}
        >
          <Stack gap="md">
            <Text size="sm" fw={600}>
              Identifiers
            </Text>

            {/* User ID */}
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                User ID
              </Text>
              <Group gap="sm" wrap="nowrap">
                <Text size="sm" ff="monospace" style={{ flex: 1 }}>
                  {formatId(userId)}
                </Text>
                <CopyButton value={userId}>
                  {({ copied, copy }) => (
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={
                        copied ? <Check size={12} /> : <Copy size={12} />
                      }
                      onClick={copy}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>

            {/* Device ID */}
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                Device ID
              </Text>
              <Group gap="sm" wrap="nowrap">
                <Text size="sm" ff="monospace" style={{ flex: 1 }}>
                  {formatId(deviceId)}
                </Text>
                <CopyButton value={deviceId}>
                  {({ copied, copy }) => (
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={
                        copied ? <Check size={12} /> : <Copy size={12} />
                      }
                      onClick={copy}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>

            {/* Device Fingerprint */}
            <Stack gap="xs">
              <Group gap="xs">
                <Fingerprint
                  size={14}
                  style={{ color: 'var(--mantine-color-gray-5)' }}
                />
                <Text size="xs" c="dimmed">
                  Device Fingerprint
                </Text>
              </Group>
              <Text size="sm" ff="monospace" c="dimmed">
                {deviceFingerprint}
              </Text>
              <Text size="xs" c="dimmed">
                Used for device verification during pairing
              </Text>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </BottomSheet>
  );
}
