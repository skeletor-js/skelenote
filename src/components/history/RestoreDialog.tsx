/**
 * RestoreDialog - Confirmation dialog for restoring historical versions
 *
 * Shows timestamp, scope info, and warnings about the restore operation.
 */

import { useMemo } from 'react';
import { Modal, Stack, Group, Text, Button, ThemeIcon } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';

export type RestoreScope = 'single' | 'full';

export interface RestoreDialogProps {
  isOpen: boolean;
  /** Scope of the restore operation */
  scope: RestoreScope;
  /** Timestamp of the version being restored */
  timestamp: number;
  /** Title of the object (for single restore) */
  objectTitle?: string;
  /** Number of objects (for full restore) */
  objectCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestoreDialog({
  isOpen,
  scope,
  timestamp,
  objectTitle,
  objectCount,
  onConfirm,
  onCancel,
}: RestoreDialogProps) {
  // Format the timestamp
  const formattedTimestamp = useMemo(() => {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [timestamp]);

  const title = scope === 'single' ? 'Restore Object' : 'Restore All Objects';
  const description =
    scope === 'single'
      ? `Restore "${objectTitle}" to its state at:`
      : `Restore all ${objectCount} objects to their state at:`;

  const warnings = [
    'This operation merges historical data with your current state using CRDT.',
    'All changes are preserved in history - nothing is permanently lost.',
    'Changes will sync to all connected devices.',
  ];

  return (
    <Modal opened={isOpen} onClose={onCancel} title={title} centered size="sm">
      <Stack gap="md">
        <Group justify="center">
          <ThemeIcon size="xl" variant="light" color="ember">
            <Icon
              name={scope === 'single' ? 'file-text' : 'history'}
              size={24}
            />
          </ThemeIcon>
        </Group>

        <Text ta="center">{description}</Text>

        <Text ta="center" fw={600} size="lg" c="ember">
          {formattedTimestamp}
        </Text>

        <Stack gap="xs">
          {warnings.map((warning, index) => (
            <Group key={index} gap="xs" wrap="nowrap" align="flex-start">
              <ThemeIcon size="sm" variant="subtle" color="gray">
                <Icon name="info" size={14} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                {warning}
              </Text>
            </Group>
          ))}
        </Stack>

        <Group justify="flex-end" gap="sm" mt="md">
          <Button variant="subtle" color="gray" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="ember" onClick={onConfirm} autoFocus>
            Restore
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
