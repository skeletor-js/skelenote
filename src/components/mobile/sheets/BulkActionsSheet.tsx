/**
 * Bulk Actions Sheet
 * Shows available actions when multiple items are selected
 */

import { Stack, Text, Box, Group, Loader } from '@mantine/core';
import {
  Archive,
  Trash2,
  Tag,
  FolderKanban,
  Flag,
  ArrowUp,
  ArrowDown,
  Minus,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { BottomSheet } from '../primitives';

export type BulkActionType =
  | 'archive'
  | 'unarchive'
  | 'delete'
  | 'tag'
  | 'project'
  | 'priority-high'
  | 'priority-medium'
  | 'priority-low'
  | 'priority-none';

interface BulkAction {
  id: BulkActionType;
  label: string;
  icon: LucideIcon;
  color?: string;
  variant?: 'danger';
}

interface BulkActionsSheetProps {
  opened: boolean;
  onClose: () => void;
  /** Number of selected items */
  count: number;
  /** Whether items are archived (changes available actions) */
  isArchiveContext?: boolean;
  /** Callback when an action is selected */
  onAction: (action: BulkActionType) => void;
  /** Whether an action is currently being performed */
  isLoading?: boolean;
}

// Actions available for normal (non-archived) items
const normalActions: BulkAction[] = [
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    color: 'var(--mantine-color-gray-6)',
  },
  {
    id: 'tag',
    label: 'Add Tag',
    icon: Tag,
    color: 'var(--mantine-color-ember-6)',
  },
  {
    id: 'project',
    label: 'Move to Project',
    icon: FolderKanban,
    color: 'var(--mantine-color-sage-6)',
  },
  {
    id: 'priority-high',
    label: 'Set High Priority',
    icon: ArrowUp,
    color: 'var(--mantine-color-brick-6)',
  },
  {
    id: 'priority-medium',
    label: 'Set Medium Priority',
    icon: Minus,
    color: 'var(--mantine-color-ember-6)',
  },
  {
    id: 'priority-low',
    label: 'Set Low Priority',
    icon: ArrowDown,
    color: 'var(--mantine-color-sage-6)',
  },
  {
    id: 'priority-none',
    label: 'Remove Priority',
    icon: Flag,
    color: 'var(--mantine-color-gray-5)',
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'danger',
  },
];

// Actions available for archived items
const archiveActions: BulkAction[] = [
  {
    id: 'unarchive',
    label: 'Restore',
    icon: RotateCcw,
    color: 'var(--mantine-color-sage-6)',
  },
  {
    id: 'delete',
    label: 'Delete Permanently',
    icon: Trash2,
    variant: 'danger',
  },
];

export function BulkActionsSheet({
  opened,
  onClose,
  count,
  isArchiveContext = false,
  onAction,
  isLoading = false,
}: BulkActionsSheetProps) {
  const actions = isArchiveContext ? archiveActions : normalActions;

  const handleAction = (action: BulkActionType) => {
    onAction(action);
    // Don't close immediately - let parent handle closing after action completes
  };

  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title={`${count} item${count !== 1 ? 's' : ''} selected`}
      size="md"
    >
      <Stack gap={0} p="md">
        {isLoading ? (
          <Box py="xl">
            <Group justify="center">
              <Loader size="sm" color="ember" />
              <Text size="sm" c="dimmed">
                Processing...
              </Text>
            </Group>
          </Box>
        ) : (
          actions.map((action) => (
            <Box
              key={action.id}
              onClick={() => handleAction(action.id)}
              style={{
                padding: '14px 0',
                borderBottom: '1px solid var(--border-default)',
                cursor: 'pointer',
              }}
            >
              <Group gap="md" wrap="nowrap">
                <Box
                  style={{
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor:
                      action.variant === 'danger'
                        ? 'var(--mantine-color-brick-0)'
                        : 'var(--surface-overlay)',
                    flexShrink: 0,
                  }}
                >
                  <action.icon
                    size={18}
                    style={{
                      color:
                        action.variant === 'danger'
                          ? 'var(--mantine-color-brick-6)'
                          : action.color || 'var(--mantine-color-gray-7)',
                    }}
                  />
                </Box>
                <Text
                  size="sm"
                  fw={500}
                  c={action.variant === 'danger' ? 'brick' : undefined}
                >
                  {action.label}
                </Text>
              </Group>
            </Box>
          ))
        )}

        {/* Footer hint */}
        <Text size="xs" c="dimmed" ta="center" pt="md">
          {isArchiveContext
            ? 'Restore items to move them out of archive'
            : 'Actions will be applied to all selected items'}
        </Text>
      </Stack>
    </BottomSheet>
  );
}
