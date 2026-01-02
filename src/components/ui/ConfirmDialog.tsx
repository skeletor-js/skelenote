import { Modal, Button, Group, Text, Stack } from '@mantine/core';

export type ConfirmDialogVariant = 'default' | 'danger' | 'warning';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Map variant to Mantine button color
 */
const VARIANT_COLORS: Record<ConfirmDialogVariant, string> = {
  default: 'blue',
  danger: 'red',
  warning: 'orange',
};

/**
 * Confirmation dialog using Mantine Modal
 * Includes focus trap, keyboard handling, and backdrop click to close
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const buttonColor = VARIANT_COLORS[variant];

  return (
    <Modal
      opened={isOpen}
      onClose={onCancel}
      title={title}
      centered
      size="sm"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed" id="confirm-dialog-message">
          {message}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button color={buttonColor} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
