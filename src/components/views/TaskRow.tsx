/**
 * TaskRow component for list view display
 * Shows: checkbox, title, due date, project, tags
 */

import { useCallback, useState } from 'react';
import {
  UnstyledButton,
  Checkbox,
  Group,
  Text,
  Badge,
  Box,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import type { SkelenoteObject } from '@/lib/types';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import { useObjects, useToast } from '@/contexts';
import {
  Tag,
  ContextMenu,
  Icon,
  type TagColor,
  type ContextMenuItem,
} from '@/components/ui';
import { ObjectSearchModal } from '@/components/object/editors';
import { useContextMenu, usePinnedObjects, useDuplicate } from '@/hooks';
import styles from './TaskRow.module.css';

interface TaskRowProps {
  /** The task object to display */
  task: SkelenoteObject;
  /** Callback when checkbox is clicked */
  onToggleComplete: (taskId: string) => void;
  /** Callback when row is clicked (navigates to detail) */
  onClick: () => void;
  /** Callback to open task in split pane */
  onOpenInSplit: () => void;
  /** Callback when task is archived */
  onArchive?: (taskId: string) => void;
  /** Whether this item is selected for bulk operations */
  isSelected?: boolean;
  /** Callback when selection checkbox is toggled */
  onSelectionChange?: (id: string, shiftKey: boolean) => void;
  /** Whether any item in the list is selected (enables "selecting mode") */
  isSelectingMode?: boolean;
}

export function TaskRow({
  task,
  onToggleComplete,
  onClick,
  onOpenInSplit,
  onArchive,
  isSelected = false,
  onSelectionChange,
  isSelectingMode = false,
}: TaskRowProps) {
  const { store, refreshData } = useObjects();
  const { addToast } = useToast();
  const { isOpen, position, openContextMenu, closeContextMenu } =
    useContextMenu();
  const { isPinned, pin, unpin } = usePinnedObjects();
  const { duplicate } = useDuplicate();
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);

  const isComplete = task.properties.status === 'done';
  const dueDate = task.properties.dueDate as number | null;
  const title = task.properties.title as string;

  // Get project name
  const projectId = task.properties.project as string | null;
  const project = projectId ? store?.get(projectId) : null;
  const projectName = project?.properties.name as string | undefined;

  // Get tags
  const tagIds = task.properties.tags as string[] | null;
  const tags = tagIds
    ?.map((id) => store?.get(id))
    .filter((t): t is SkelenoteObject => t !== undefined)
    .map((t) => ({
      id: t.id,
      name: t.properties.name as string,
      color: t.properties.color as TagColor | undefined,
    }));

  // Check if overdue
  const isTaskOverdue = dueDate !== null && !isComplete && isOverdue(dueDate);

  // Handle selection checkbox change
  const handleSelectionChange = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectionChange?.(task.id, e.shiftKey);
    },
    [onSelectionChange, task.id]
  );

  // Handle completion checkbox click without triggering row click
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleComplete(task.id);
    },
    [onToggleComplete, task.id]
  );

  // Handle pin/unpin
  const taskIsPinned = isPinned(task.id);
  const handleTogglePin = useCallback(() => {
    if (taskIsPinned) {
      unpin(task.id);
      addToast({ type: 'success', message: 'Removed from pins' });
    } else {
      pin(task.id);
      addToast({ type: 'success', message: 'Pinned to sidebar' });
    }
  }, [taskIsPinned, pin, unpin, task.id, addToast]);

  // Handle select from context menu
  const handleSelect = useCallback(() => {
    onSelectionChange?.(task.id, false);
  }, [onSelectionChange, task.id]);

  // Handle open in split (with event stop propagation)
  const handleOpenInSplit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenInSplit();
    },
    [onOpenInSplit]
  );

  // Handle add tag click (with event stop propagation)
  const handleAddTagClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTagPickerOpen(true);
  }, []);

  // Handle add tag
  const handleAddTag = useCallback(
    (tagId: string) => {
      const currentTags = (task.properties.tags as string[]) ?? [];
      if (!currentTags.includes(tagId)) {
        store?.update(task.id, {
          properties: { ...task.properties, tags: [...currentTags, tagId] },
        });
        refreshData();
        addToast({ type: 'success', message: 'Tag added' });
      }
      setTagPickerOpen(false);
    },
    [task.id, task.properties, store, refreshData, addToast]
  );

  // Handle project click (with event stop propagation)
  const handleProjectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectPickerOpen(true);
  }, []);

  // Handle assign project
  const handleAssignProject = useCallback(
    (projectId: string) => {
      store?.update(task.id, {
        properties: { ...task.properties, project: projectId },
      });
      refreshData();
      addToast({ type: 'success', message: 'Project assigned' });
      setProjectPickerOpen(false);
    },
    [task.id, task.properties, store, refreshData, addToast]
  );

  // Handle area click (with event stop propagation)
  const handleAreaClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAreaPickerOpen(true);
  }, []);

  // Handle assign area
  const handleAssignArea = useCallback(
    (areaId: string) => {
      store?.update(task.id, {
        properties: { ...task.properties, area: areaId },
      });
      refreshData();
      addToast({ type: 'success', message: 'Area assigned' });
      setAreaPickerOpen(false);
    },
    [task.id, task.properties, store, refreshData, addToast]
  );

  // Handle archive
  const handleArchive = useCallback(() => {
    if (!onArchive) return;
    onArchive(task.id);
    addToast({
      type: 'success',
      message: `"${title}" archived`,
    });
  }, [onArchive, task.id, title, addToast]);

  // Handle archive click (with event stop propagation)
  const handleArchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleArchive();
    },
    [handleArchive]
  );

  // Handle duplicate
  const handleDuplicate = useCallback(() => {
    duplicate(task.id);
  }, [duplicate, task.id]);

  // Handle duplicate click (with event stop propagation)
  const handleDuplicateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDuplicate();
    },
    [handleDuplicate]
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
      label: taskIsPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar',
      icon: 'pin',
      onClick: handleTogglePin,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: 'copy',
      onClick: handleDuplicate,
    },
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

  // Handle row click - cmd+click opens split, shift+click toggles selection, regular click navigates
  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey) {
        // Cmd+click (Mac) or Ctrl+click (Windows) opens in split pane
        e.preventDefault();
        onOpenInSplit();
      } else if (e.shiftKey && onSelectionChange) {
        e.preventDefault();
        onSelectionChange(task.id, true);
      } else {
        onClick();
      }
    },
    [onClick, onOpenInSplit, onSelectionChange, task.id]
  );

  return (
    <>
      <UnstyledButton
        onClick={handleRowClick}
        onContextMenu={openContextMenu}
        px="sm"
        py="xs"
        className={styles.row}
        data-selected={isSelected || undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mantine-spacing-sm)',
          borderRadius: 'var(--mantine-radius-sm)',
          opacity: isComplete ? 0.6 : 1,
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

        {/* Title and inline metadata */}
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
          <Text
            size="sm"
            style={{
              textDecoration: isComplete ? 'line-through' : 'none',
              flexShrink: 1,
              minWidth: 0,
            }}
            truncate
          >
            {title}
          </Text>

          {/* Due date - inline after title */}
          {dueDate && (
            <>
              <Text size="xs" c="dimmed">
                ·
              </Text>
              <Text
                size="xs"
                c={isTaskOverdue ? 'brick' : 'dimmed'}
                fw={isTaskOverdue ? 500 : 400}
                style={{ flexShrink: 0 }}
              >
                {formatRelativeDate(dueDate)}
              </Text>
            </>
          )}

          {/* Project chip - inline */}
          {projectName && (
            <Badge
              size="xs"
              variant="light"
              color="gray"
              radius="sm"
              style={{ flexShrink: 0 }}
            >
              {projectName}
            </Badge>
          )}
        </Group>

        {/* Right section: tags + hover-reveal actions */}
        <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
          {/* Tags - right side */}
          {tags && tags.length > 0 && (
            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              {tags.slice(0, 2).map((tag) => (
                <Tag key={tag.id} name={tag.name} color={tag.color} size="sm" />
              ))}
              {tags.length > 2 && (
                <Text size="xs" c="dimmed">
                  +{tags.length - 2}
                </Text>
              )}
            </Group>
          )}

          {/* Hover-reveal action icons - appear to the right of tags */}
          <Group gap={4} className={styles.actions} wrap="nowrap">
            <Tooltip
              label={isComplete ? 'Mark as incomplete' : 'Mark as complete'}
              position="top"
              withArrow
            >
              <ActionIcon
                variant="subtle"
                size="sm"
                color="sage"
                onClick={handleCheckboxClick}
                aria-label={
                  isComplete ? 'Mark as incomplete' : 'Mark as complete'
                }
              >
                <Icon name="check" size={14} />
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
            <Tooltip
              label={taskIsPinned ? 'Unpin' : 'Pin to sidebar'}
              position="top"
              withArrow
            >
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePin();
                }}
                aria-label={
                  taskIsPinned ? 'Unpin from sidebar' : 'Pin to sidebar'
                }
              >
                <Icon name="pin" size={14} />
              </ActionIcon>
            </Tooltip>
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
