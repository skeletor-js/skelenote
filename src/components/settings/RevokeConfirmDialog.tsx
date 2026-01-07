/**
 * Revoke Confirm Dialog Component
 *
 * Modal dialog to confirm device revocation with optional reason.
 */

import { useState } from 'react';
import {
  Modal,
  TextInput,
  Stack,
  Group,
  Button,
  Text,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import { Icon } from '@/components/ui';
import type { DeviceInfo } from '@/lib/devices';

interface RevokeConfirmDialogProps {
  device: DeviceInfo;
  isProcessing: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function RevokeConfirmDialog({
  device,
  isProcessing,
  onConfirm,
  onCancel,
}: RevokeConfirmDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason || undefined);
  };

  return (
    <Modal
      opened={true}
      onClose={onCancel}
      title={<Text fw={600}>Revoke Device Access</Text>}
      centered
      size="md"
    >
      <Stack gap="md">
        <Alert
          color="brick"
          variant="light"
          icon={
            <ThemeIcon color="brick" variant="light" size="sm">
              <Icon name="alert-triangle" size={14} />
            </ThemeIcon>
          }
        >
          This action cannot be undone.
        </Alert>

        <Text size="sm">
          Revoking{' '}
          <Text component="span" fw={600}>
            {device.name}
          </Text>{' '}
          will immediately prevent it from syncing with your vault. The device
          will need to be re-authorized with a new Skeleton Key to regain
          access.
        </Text>

        <TextInput
          label="Reason (optional)"
          placeholder="e.g., Device lost or sold"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isProcessing}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            color="brick"
            onClick={handleConfirm}
            disabled={isProcessing}
            loading={isProcessing}
          >
            {isProcessing ? 'Revoking...' : 'Revoke Device'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
