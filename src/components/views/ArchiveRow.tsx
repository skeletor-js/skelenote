/**
 * ArchiveRow component for archive list view display
 * Shows: type icon, title/name, type label, archived date
 * Actions: Unarchive, Split pane, Delete
 */

import { useCallback, useMemo } from 'react';
import {
  UnstyledButton,
  Checkbox,
  Text,
  Box,
  Group,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import { useTypeRegistry, useToast } from '@/contexts';
import {
  ContextMenu,
  ConfirmDialog,
  type ContextMenuItem,
} from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import { useContextMenu, useConfirmDialog } from '@/hooks';
import type { IconName } from '@/lib/icons';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import classes from './InboxRow.module.css';

interface ArchiveRowProps {
  /** The archived item object to display */
  item: SkelenoteObject;
  /** Callback when row is clicked (navigates to detail) */
  onClick: () => void;
  /** Callback to open item in split pane */
  onOpenInSplit: () => void;
  /** Callback when unarchive button is clicked */
  onUnarchive: (itemId: string) => void;
  /** Callback when item is deleted permanently */
  onDelete: (itemId: string) => void;
  /** Whether this item is selected */
  isSelected?: boolean;
  /** Callback when selection checkbox is toggled */
  onSelectionChange?: (id: string, shiftKey: boolean) => void;
  /** Whether any item in the list is selected (enables "selecting mode") */
  isSelectingMode?: boolean;
}

export function ArchiveRow({
  item,
  onClick,
  onOpenInSplit,
  onUnarchive,
  onDelete,
  isSelected = false,
  onSelectionChange,
  isSelectingMode = false,
}: ArchiveRowProps) {
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();
  const { confirm, dialogState, handleConfirm, handleCancel } =
    useConfirmDialog();
  const { isOpen, position, openContextMenu, closeContextMenu } =
    useContextMenu();

  // Get type info
  const typeDef = typeRegistry.get(item.typeId);
  const typeName = typeDef?.name ?? item.typeId;

  // Get icon
  const getTypeIcon = (): IconName => {
    if (!typeDef?.icon) return 'file';
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  };

  // Get title or name
  const title = (item.properties.title ??
    item.properties.name ??
    'Untitled') as string;

  // Compute date label: only show for tasks with due dates
  const dateLabel = useMemo(() => {
    if (item.typeId === BuiltInTypeIds.TASK) {
      const dueDate = item.properties.dueDate as number | null;
      if (dueDate) {
        return {
          text: formatRelativeDate(dueDate),
          isOverdue: isOverdue(dueDate),
        };
      }
    }
    return null;
  }, [item.typeId, item.properties.dueDate]);

  // Handle selection checkbox change
  const handleSelectionChange = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectionChange?.(item.id, e.shiftKey);
    },
    [onSelectionChange, item.id]
  );

  // Handle unarchive button click
  const handleUnarchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUnarchive(item.id);
      addToast({
        type: 'success',
        message: `"${title}" restored`,
      });
    },
    [onUnarchive, item.id, title, addToast]
  );

  // Handle delete with confirmation
  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: `Delete ${typeName} permanently?`,
      message: `Are you sure you want to permanently delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
    });

    if (confirmed) {
      onDelete(item.id);
      addToast({
        type: 'success',
        message: `"${title}" deleted permanently`,
      });
    }
  }, [confirm, typeName, title, item.id, onDelete, addToast]);

  // Handle select from context menu
  const handleSelect = useCallback(() => {
    onSelectionChange?.(item.id, false);
  }, [onSelectionChange, item.id]);

  // Handle open in split (with event stop propagation)
  const handleOpenInSplit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenInSplit();
    },
    [onOpenInSplit]
  );

  // Handle delete quick action (with event stop propagation)
  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDelete();
    },
    [handleDelete]
  );

  // Handle row click - shift+click toggles selection, regular click navigates
  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey && onSelectionChange) {
        e.preventDefault();
        onSelectionChange(item.id, true);
      } else {
        onClick();
      }
    },
    [onClick, onSelectionChange, item.id]
  );

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    ...(onSelectionChange
      ? [
          {
            id: 'select',
            label: isSelected ? 'Deselect' : 'Select',
            icon: 'check-square',
            onClick: handleSelect,
          } as ContextMenuItem,
        ]
      : []),
    {
      id: 'unarchive',
      label: 'Restore',
      icon: 'archive-restore',
      onClick: () => {
        onUnarchive(item.id);
        addToast({ type: 'success', message: `"${title}" restored` });
      },
    },
    {
      id: 'delete',
      label: 'Delete Permanently',
      icon: 'trash-2',
      variant: 'danger',
      onClick: handleDelete,
    },
  ];

  return (
    <>
      <UnstyledButton
        onClick={handleRowClick}
        onContextMenu={openContextMenu}
        px="sm"
        py="xs"
        className={classes.inboxRow}
        data-selected={isSelected || undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mantine-spacing-sm)',
          borderRadius: 'var(--mantine-radius-sm)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Selection checkbox - only show when in selection mode */}
        {onSelectionChange && isSelectingMode && (
          <Box
            onClick={handleSelectionChange}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Checkbox
              checked={isSelected}
              onChange={() => {}}
              size="xs"
              color="slate"
              aria-label={`Select ${title}`}
              styles={{ input: { cursor: 'pointer' } }}
            />
          </Box>
        )}

        {/* Type icon */}
        <Icon
          name={getTypeIcon()}
          size={16}
          style={{ color: 'var(--mantine-color-gray-6)', flexShrink: 0 }}
        />

        {/* Title and inline metadata */}
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
          <Text size="sm" style={{ flexShrink: 1, minWidth: 0 }} truncate>
            {title}
          </Text>

          {/* Date label - only shows for tasks with due dates */}
          {dateLabel && (
            <Text
              size="xs"
              c={dateLabel.isOverdue ? 'brick' : 'dimmed'}
              style={{ flexShrink: 0 }}
            >
              {dateLabel.text}
            </Text>
          )}
        </Group>

        {/* Right section: type + hover-reveal actions */}
        <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
          {/* Type label */}
          <Text size="xs" c="dimmed">
            {typeName}
          </Text>

          {/* Hover-reveal action icons */}
          <Group gap={4} className={classes.actions} wrap="nowrap">
            <Tooltip label="Restore" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="sage"
                onClick={handleUnarchiveClick}
                aria-label="Restore from archive"
              >
                <Icon name="archive-restore" size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Open in split pane" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleOpenInSplit}
                aria-label="Open in split pane"
              >
                <Icon name="columns-2" size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete permanently" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="brick"
                onClick={handleDeleteClick}
                aria-label="Delete permanently"
              >
                <Icon name="trash-2" size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </UnstyledButton>

      {/* Context Menu */}
      <ContextMenu
        items={contextMenuItems}
        position={position}
        isOpen={isOpen}
        onClose={closeContextMenu}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
