/**
 * RestoreConfirmSheet - Confirmation dialog for Time Machine restore
 *
 * Shows warning about CRDT merge behavior and provides options for:
 * - Restore This Object Only
 * - Restore All Objects (when viewing full history)
 */

import { useState, useCallback } from 'react';
import { Stack, Text, Box, Button, Alert, Group, Radio } from '@mantine/core';
import { AlertCircle, RotateCcw, History } from 'lucide-react';
import { BottomSheet } from '../primitives';

export type RestoreScope = 'single' | 'all';

interface RestoreConfirmSheetProps {
  opened: boolean;
  onClose: () => void;
  /** Name of the version being restored (e.g., "Today, 2:30 PM") */
  versionName: string;
  /** Name of the object being restored (if single restore) */
  objectName?: string;
  /** Whether to show the "Restore All" option */
  showRestoreAllOption?: boolean;
  /** Callback when user confirms restore */
  onConfirm: (scope: RestoreScope) => void;
  /** Whether the restore is in progress */
  isRestoring?: boolean;
}

export function RestoreConfirmSheet({
  opened,
  onClose,
  versionName,
  objectName,
  showRestoreAllOption = false,
  onConfirm,
  isRestoring = false,
}: RestoreConfirmSheetProps) {
  const [restoreScope, setRestoreScope] = useState<RestoreScope>('single');

  // Handle confirm
  const handleConfirm = useCallback(() => {
    onConfirm(restoreScope);
  }, [restoreScope, onConfirm]);

  // Reset state on close
  const handleClose = useCallback(() => {
    if (!isRestoring) {
      setRestoreScope('single');
      onClose();
    }
  }, [isRestoring, onClose]);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Restore Version"
      size="md"
    >
      <Stack gap="md" p="md">
        {/* Version info */}
        <Box
          p="md"
          style={{
            backgroundColor: 'var(--surface-overlay)',
            borderRadius: 8,
            border: '1px solid var(--border-default)',
          }}
        >
          <Group gap="sm">
            <History
              size={18}
              style={{ color: 'var(--mantine-color-ember-5)' }}
            />
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {versionName}
              </Text>
              {objectName && (
                <Text size="xs" c="dimmed">
                  {objectName}
                </Text>
              )}
            </Box>
          </Group>
        </Box>

        {/* Warning about CRDT merge behavior */}
        <Alert
          variant="light"
          color="ember"
          icon={<AlertCircle size={16} />}
          styles={{
            root: { padding: '12px' },
            icon: { marginRight: 8 },
          }}
        >
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              About restoring versions
            </Text>
            <Text size="xs">
              Skelenote uses CRDT (Conflict-free Replicated Data Types) for
              sync. Restoring a version adds the old state back into your data -
              it doesn't erase changes made since then.
            </Text>
            <Text size="xs">
              If conflicting changes exist, they'll be merged automatically. You
              may see a combination of old and new content.
            </Text>
          </Stack>
        </Alert>

        {/* Restore scope selection (if applicable) */}
        {showRestoreAllOption && (
          <Box>
            <Text size="sm" fw={500} mb="sm">
              What to restore
            </Text>
            <Radio.Group
              value={restoreScope}
              onChange={(value) => setRestoreScope(value as RestoreScope)}
            >
              <Stack gap="sm">
                <Radio
                  value="single"
                  label={
                    <Box>
                      <Text size="sm">Restore this object only</Text>
                      <Text size="xs" c="dimmed">
                        Only restore "{objectName || 'this item'}"
                      </Text>
                    </Box>
                  }
                  styles={{
                    label: { paddingLeft: 8 },
                  }}
                />
                <Radio
                  value="all"
                  label={
                    <Box>
                      <Text size="sm">Restore all objects</Text>
                      <Text size="xs" c="dimmed">
                        Restore the entire vault to this point in time
                      </Text>
                    </Box>
                  }
                  styles={{
                    label: { paddingLeft: 8 },
                  }}
                  color="brick"
                />
              </Stack>
            </Radio.Group>

            {restoreScope === 'all' && (
              <Alert
                variant="light"
                color="brick"
                icon={<AlertCircle size={16} />}
                mt="sm"
                styles={{
                  root: { padding: '12px' },
                  icon: { marginRight: 8 },
                }}
              >
                <Text size="xs">
                  Restoring all objects will affect your entire vault. This
                  cannot be undone.
                </Text>
              </Alert>
            )}
          </Box>
        )}

        {/* Action buttons */}
        <Group gap="sm" mt="sm">
          <Button
            variant="light"
            color="gray"
            onClick={handleClose}
            disabled={isRestoring}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            color={restoreScope === 'all' ? 'brick' : 'ember'}
            leftSection={<RotateCcw size={14} />}
            onClick={handleConfirm}
            loading={isRestoring}
            style={{ flex: 1 }}
          >
            {restoreScope === 'all' ? 'Restore All' : 'Restore'}
          </Button>
        </Group>
      </Stack>
    </BottomSheet>
  );
}
