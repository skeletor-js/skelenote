/**
 * InboxRow component for inbox list view display
 * Shows: type icon, title/name, type label, created date, preview (first tag), process button
 */

import { useCallback, useState, useMemo } from 'react';
import { UnstyledButton, Checkbox, Text, Box, Group, ActionIcon, Tooltip } from '@mantine/core';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import { Tag, ContextMenu, type TagColor, type ContextMenuItem } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import { useContextMenu, usePinnedObjects, useDuplicate } from '@/hooks';
import type { IconName } from '@/lib/icons';
import { ObjectSearchModal } from '@/components/object/editors';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import classes from './InboxRow.module.css';

interface InboxRowProps {
  /** The inbox item object to display */
  item: SkelenoteObject;
  /** Callback when row is clicked (navigates to detail) */
  onClick: () => void;
  /** Callback to open item in split pane */
  onOpenInSplit: () => void;
  /** Callback when process button is clicked (optional for non-inbox views) */
  onProcess?: (itemId: string) => void;
  /** Callback when item is archived */
  onArchive?: (itemId: string) => void;
  /** Whether this item is selected */
  isSelected?: boolean;
  /** Callback when selection checkbox is toggled */
  onSelectionChange?: (id: string, shiftKey: boolean) => void;
  /** Whether any item in the list is selected (enables "selecting mode") */
  isSelectingMode?: boolean;
}

export function InboxRow({
  item,
  onClick,
  onOpenInSplit,
  onProcess,
  onArchive,
  isSelected = false,
  onSelectionChange,
  isSelectingMode = false,
}: InboxRowProps) {
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();
  const { isPinned, pin, unpin } = usePinnedObjects();
  const { duplicate, canDuplicate } = useDuplicate();
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);

  // Get type info
  const typeDef = typeRegistry.get(item.typeId);

  // Get icon
  const getTypeIcon = (): IconName => {
    if (!typeDef?.icon) return 'file';
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  };

  // Get title or name
  const title = (item.properties.title ?? item.properties.name ?? 'Untitled') as string;

  // Get first tag for preview
  const tagIds = item.properties.tags as string[] | null;
  const firstTag = tagIds?.[0] ? store?.get(tagIds[0]) : null;
  const tagInfo = firstTag
    ? {
        name: firstTag.properties.name as string,
        color: firstTag.properties.color as TagColor | undefined,
      }
    : null;

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

  // Handle process button click without triggering row click
  const handleProcessClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onProcess?.(item.id);
    },
    [onProcess, item.id]
  );

  // Handle pin/unpin
  const itemIsPinned = isPinned(item.id);
  const handleTogglePin = useCallback(() => {
    if (itemIsPinned) {
      unpin(item.id);
      addToast({ type: 'success', message: 'Removed from pins' });
    } else {
      pin(item.id);
      addToast({ type: 'success', message: 'Pinned to sidebar' });
    }
  }, [itemIsPinned, pin, unpin, item.id, addToast]);

  // Handle select from context menu
  const handleSelect = useCallback(() => {
    onSelectionChange?.(item.id, false);
  }, [onSelectionChange, item.id]);

  // Handle add tag
  const handleAddTag = useCallback(
    (tagId: string) => {
      const currentTags = (item.properties.tags as string[]) ?? [];
      if (!currentTags.includes(tagId)) {
        store?.update(item.id, {
          properties: { ...item.properties, tags: [...currentTags, tagId] },
        });
        refreshData();
        addToast({ type: 'success', message: 'Tag added' });
      }
      setTagPickerOpen(false);
    },
    [item.id, item.properties, store, refreshData, addToast]
  );

  // Handle open in split (with event stop propagation)
  const handleOpenInSplit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenInSplit();
    },
    [onOpenInSplit]
  );

  // Handle archive
  const handleArchive = useCallback(() => {
    if (!onArchive) return;
    onArchive(item.id);
    addToast({
      type: 'success',
      message: `"${title}" archived`,
    });
  }, [onArchive, item.id, title, addToast]);

  // Handle archive click (with event stop propagation)
  const handleArchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleArchive();
    },
    [handleArchive]
  );

  // Handle add tag click (with event stop propagation)
  const handleAddTagClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTagPickerOpen(true);
  }, []);

  // Handle assign project
  const handleAssignProject = useCallback(
    (projectId: string) => {
      store?.update(item.id, {
        properties: { ...item.properties, project: projectId },
      });
      refreshData();
      addToast({ type: 'success', message: 'Project assigned' });
      setProjectPickerOpen(false);
    },
    [item.id, item.properties, store, refreshData, addToast]
  );

  // Handle project click (with event stop propagation)
  const handleProjectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectPickerOpen(true);
  }, []);

  // Handle assign area
  const handleAssignArea = useCallback(
    (areaId: string) => {
      store?.update(item.id, {
        properties: { ...item.properties, area: areaId },
      });
      refreshData();
      addToast({ type: 'success', message: 'Area assigned' });
      setAreaPickerOpen(false);
    },
    [item.id, item.properties, store, refreshData, addToast]
  );

  // Handle area click (with event stop propagation)
  const handleAreaClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAreaPickerOpen(true);
  }, []);

  // Handle duplicate (only if item can be duplicated)
  const itemCanDuplicate = canDuplicate(item.id);
  const handleDuplicate = useCallback(() => {
    if (itemCanDuplicate) {
      duplicate(item.id);
    }
  }, [duplicate, item.id, itemCanDuplicate]);

  // Handle duplicate click (with event stop propagation)
  const handleDuplicateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDuplicate();
    },
    [handleDuplicate]
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
      id: 'pin',
      label: itemIsPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar',
      icon: 'pin',
      onClick: handleTogglePin,
    },
    ...(itemCanDuplicate
      ? [
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: 'copy',
            onClick: handleDuplicate,
          } as ContextMenuItem,
        ]
      : []),
    ...(onArchive
      ? [
          {
            id: 'archive',
            label: 'Archive',
            icon: 'archive',
            onClick: handleArchive,
          } as ContextMenuItem,
        ]
      : []),
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
        <Icon name={getTypeIcon()} size={16} style={{ color: 'var(--mantine-color-gray-6)', flexShrink: 0 }} />

        {/* Title and inline metadata */}
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
          <Text size="sm" style={{ flexShrink: 1, minWidth: 0 }} truncate>
            {title}
          </Text>

          {/* Date label - only shows for tasks with due dates */}
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
          {onProcess && (
            <Tooltip label="Mark as processed" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="sage"
                onClick={handleProcessClick}
                aria-label="Mark as processed"
              >
                <Icon name="check" size={14} />
              </ActionIcon>
            </Tooltip>
          )}
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
          <Tooltip label="Add tag" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleAddTagClick}
              aria-label="Add tag"
            >
              <Icon name="tag" size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Assign project" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleProjectClick}
              aria-label="Assign project"
            >
              <Icon name="folder" size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Assign area" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleAreaClick}
              aria-label="Assign area"
            >
              <Icon name="layers" size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={itemIsPinned ? 'Unpin' : 'Pin to sidebar'} position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleTogglePin(); }}
              aria-label={itemIsPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
            >
              <Icon name="pin" size={14} />
            </ActionIcon>
          </Tooltip>
          {itemCanDuplicate && (
            <Tooltip label="Duplicate" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleDuplicateClick}
                aria-label="Duplicate"
              >
                <Icon name="copy" size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {onArchive && (
            <Tooltip label="Archive" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleArchiveClick}
                aria-label="Archive"
              >
                <Icon name="archive" size={14} />
              </ActionIcon>
            </Tooltip>
          )}
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

      {/* Tag Picker Modal */}
      <ObjectSearchModal
        isOpen={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        onSelect={handleAddTag}
        targetTypeIds={['tag']}
        title="Add Tag"
      />

      {/* Project Picker Modal */}
      <ObjectSearchModal
        isOpen={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
        onSelect={handleAssignProject}
        targetTypeIds={['project']}
        title="Assign to Project"
      />

      {/* Area Picker Modal */}
      <ObjectSearchModal
        isOpen={areaPickerOpen}
        onClose={() => setAreaPickerOpen(false)}
        onSelect={handleAssignArea}
        targetTypeIds={['area']}
        title="Assign to Area"
      />
    </>
  );
}
