/**
 * ObjectRow - Simplified row display for non-task objects in related sections
 * Shows: type icon, title, first tag, hover-reveal actions (split, pin, delete)
 */

import { useCallback, useMemo } from 'react';
import { UnstyledButton, Text, Group, ActionIcon, Tooltip } from '@mantine/core';
import { type SkelenoteObject, BuiltInTypeIds } from '@/lib/types';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import { Tag, ConfirmDialog, type TagColor } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import { useConfirmDialog, usePinnedObjects } from '@/hooks';
import type { IconName } from '@/lib/icons';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import classes from './ObjectRow.module.css';

interface ObjectRowProps {
  /** The object to display */
  object: SkelenoteObject;
  /** Callback when row is clicked (navigates to detail) */
  onClick: () => void;
  /** Callback to open object in split pane */
  onOpenInSplit: () => void;
  /** Optional callback when object is deleted */
  onDelete?: (objectId: string) => void;
}

export function ObjectRow({
  object,
  onClick,
  onOpenInSplit,
  onDelete,
}: ObjectRowProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmDialog();
  const { isPinned, pin, unpin } = usePinnedObjects();

  // Get type info
  const typeDef = typeRegistry.get(object.typeId);
  const typeName = typeDef?.name ?? object.typeId;

  // Get icon
  const getTypeIcon = (): IconName => {
    if (!typeDef?.icon) return 'file';
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  };

  // Get title or name
  const title = (object.properties.title ?? object.properties.name ?? 'Untitled') as string;

  // Get first tag for preview
  const tagIds = object.properties.tags as string[] | null;
  const firstTag = tagIds?.[0] ? store?.get(tagIds[0]) : null;
  const tagInfo = firstTag
    ? {
        name: firstTag.properties.name as string,
        color: firstTag.properties.color as TagColor | undefined,
      }
    : null;

  // Compute date label for tasks/meetings
  const dateLabel = useMemo(() => {
    if (object.typeId === BuiltInTypeIds.TASK) {
      const dueDate = object.properties.dueDate as number | null;
      if (dueDate) {
        return {
          text: formatRelativeDate(dueDate),
          isOverdue: isOverdue(dueDate),
        };
      }
    } else if (object.typeId === BuiltInTypeIds.MEETING) {
      const meetingDate = object.properties.startTime as number | null;
      if (meetingDate) {
        return {
          text: formatRelativeDate(meetingDate),
          isOverdue: false,
        };
      }
    }
    return null;
  }, [object.typeId, object.properties.dueDate, object.properties.startTime]);

  // Handle delete with confirmation
  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: `Delete ${typeName}?`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      if (onDelete) {
        onDelete(object.id);
      } else if (store) {
        store.delete(object.id);
      }
      addToast({
        type: 'success',
        message: `"${title}" deleted`,
      });
    }
  }, [confirm, typeName, title, object.id, onDelete, store, addToast]);

  // Handle pin/unpin
  const itemIsPinned = isPinned(object.id);
  const handleTogglePin = useCallback(() => {
    if (itemIsPinned) {
      unpin(object.id);
      addToast({ type: 'success', message: 'Removed from pins' });
    } else {
      pin(object.id);
      addToast({ type: 'success', message: 'Pinned to sidebar' });
    }
  }, [itemIsPinned, pin, unpin, object.id, addToast]);

  // Handle open in split (with event stop propagation)
  const handleOpenInSplit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenInSplit();
    },
    [onOpenInSplit]
  );

  // Handle delete click (with event stop propagation)
  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDelete();
    },
    [handleDelete]
  );

  // Handle pin click (with event stop propagation)
  const handlePinClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleTogglePin();
    },
    [handleTogglePin]
  );

  return (
    <>
      <UnstyledButton
        onClick={onClick}
        px="sm"
        py="xs"
        className={classes.objectRow}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mantine-spacing-sm)',
          borderRadius: 'var(--mantine-radius-sm)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        }}
      >
        {/* Type icon */}
        <Icon name={getTypeIcon()} size={16} style={{ color: 'var(--mantine-color-gray-6)', flexShrink: 0 }} />

        {/* Title and inline metadata */}
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
          <Text size="sm" style={{ flexShrink: 1, minWidth: 0 }} truncate>
            {title}
          </Text>

          {/* Date label */}
          {dateLabel && (
            <Text size="xs" c={dateLabel.isOverdue ? 'brick' : 'dimmed'} style={{ flexShrink: 0 }}>
              {dateLabel.text}
            </Text>
          )}
        </Group>

        {/* Right section: tags + hover-reveal actions */}
        <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
          {/* Preview - first tag */}
          {tagInfo && (
            <Tag name={tagInfo.name} color={tagInfo.color} size="sm" />
          )}

          {/* Hover-reveal action icons - appear to the right of tags */}
          <Group gap={4} className={classes.actions} wrap="nowrap">
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
          <Tooltip label={itemIsPinned ? 'Unpin' : 'Pin to sidebar'} position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handlePinClick}
              aria-label={itemIsPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
            >
              <Icon name="pin" size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="brick"
              onClick={handleDeleteClick}
              aria-label="Delete"
            >
              <Icon name="trash-2" size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
        </Group>
      </UnstyledButton>

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
