/**
 * Rename Dialog Component
 *
 * Modal dialog to rename a device.
 */

import { useState } from 'react';
import { Modal, TextInput, Stack, Group, Button, Text } from '@mantine/core';
import type { DeviceInfo } from '@/lib/devices';

interface RenameDialogProps {
  device: DeviceInfo;
  isProcessing: boolean;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({
  device,
  isProcessing,
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const [name, setName] = useState(device.name);

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== device.name) {
      onConfirm(trimmedName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing && name.trim()) {
      handleConfirm();
    }
  };

  const isValid = name.trim().length > 0 && name.trim() !== device.name;

  return (
    <Modal
      opened={true}
      onClose={onCancel}
      title={<Text fw={600}>Rename Device</Text>}
      centered
      size="sm"
    >
      <Stack gap="md">
        <TextInput
          label="Device Name"
          placeholder="Enter device name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          autoFocus
        />

        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !isValid}
            loading={isProcessing}
          >
            {isProcessing ? 'Saving...' : 'Save'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
