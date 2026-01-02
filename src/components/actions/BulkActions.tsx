/**
 * BulkActions - Floating action bar for batch operations on selected items
 * Appears at bottom center when items are selected
 */

import { useState, useCallback, useMemo } from 'react';
import { Portal, Group, ActionIcon, Text, Divider, Box, Tooltip, Menu } from '@mantine/core';
import { useObjects, useTypeRegistry, useToast, useUndo } from '@/contexts';
import { useConfirmDialog } from '@/hooks';
import { ConfirmDialog } from '@/components/ui';
import { ObjectSearchModal } from '@/components/object/editors';
import { Icon } from '@/components/ui/Icon';
import { TaskPriorityOptions } from '@/lib/types';

export interface BulkActionsProps {
  /** Array of selected item IDs */
  selectedIds: string[];
  /** Callback to clear selection after action */
  onClearSelection: () => void;
  /** Callback after successful action (triggers data refresh) */
  onActionComplete?: () => void;
  /** View type for context-specific actions */
  viewType?: 'inbox' | 'tasks' | 'archive' | 'all';
}

export function BulkActions({
  selectedIds,
  onClearSelection,
  onActionComplete,
  viewType = 'all',
}: BulkActionsProps) {
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();
  const { groupStart, groupEnd } = useUndo();
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

  // Modal states
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const count = selectedIds.length;

  // Analyze selected items
  const selectedInfo = useMemo(() => {
    if (!store || count === 0) {
      return { hasTasks: false, allPinned: false, nonePinned: true, taskCount: 0 };
    }

    let taskCount = 0;
    let pinnedCount = 0;

    for (const id of selectedIds) {
      const obj = store.get(id);
      if (obj) {
        if (obj.typeId === 'task') taskCount++;
        if (obj.pinned) pinnedCount++;
      }
    }

    return {
      hasTasks: taskCount > 0,
      taskCount,
      allPinned: pinnedCount === count,
      nonePinned: pinnedCount === 0,
    };
  }, [store, selectedIds, count]);

  // Handle delete action
  const handleDelete = useCallback(async () => {
    if (!store) return;

    const confirmed = await confirm({
      title: `Delete ${count} item${count === 1 ? '' : 's'}?`,
      message: `Are you sure you want to delete ${count} selected item${count === 1 ? '' : 's'}? This can be undone with Cmd+Z.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      // Group all deletions into a single undo step
      groupStart();
      try {
        const result = store.deleteMany(selectedIds);
        refreshData();
        onClearSelection();
        onActionComplete?.();

        if (result.errors.length > 0) {
          addToast({
            type: 'warning',
            message: `Deleted ${result.deleted} of ${count} items`,
          });
        } else {
          addToast({
            type: 'success',
            message: `Deleted ${result.deleted} item${result.deleted === 1 ? '' : 's'}`,
          });
        }
      } finally {
        groupEnd();
      }
    }
  }, [store, selectedIds, count, confirm, refreshData, onClearSelection, onActionComplete, addToast, groupStart, groupEnd]);

  // Handle process action (mark as processed - inbox only)
  const handleProcess = useCallback(() => {
    if (!store) return;

    const result = store.markProcessedMany(selectedIds);
    refreshData();
    onClearSelection();
    onActionComplete?.();

    if (result.errors.length > 0) {
      addToast({
        type: 'warning',
        message: `Processed ${result.processed} of ${count} items`,
      });
    } else {
      addToast({
        type: 'success',
        message: `Processed ${result.processed} item${result.processed === 1 ? '' : 's'}`,
      });
    }
  }, [store, selectedIds, count, refreshData, onClearSelection, onActionComplete, addToast]);

  // Handle type change action
  const handleChangeType = useCallback(
    (newTypeId: string | null) => {
      if (!store || !newTypeId) return;

      const typeDef = typeRegistry.get(newTypeId);
      const typeName = typeDef?.name ?? newTypeId;

      const result = store.changeTypeMany(selectedIds, newTypeId);
      refreshData();
      onClearSelection();
      onActionComplete?.();

      if (result.errors.length > 0) {
        addToast({
          type: 'warning',
          message: `Changed ${result.updated} of ${count} items to ${typeName}`,
        });
      } else {
        addToast({
          type: 'success',
          message: `Changed ${result.updated} item${result.updated === 1 ? '' : 's'} to ${typeName}`,
        });
      }
    },
    [store, typeRegistry, selectedIds, count, refreshData, onClearSelection, onActionComplete, addToast]
  );

  // Handle add tag
  const handleAddTag = useCallback(
    (tagId: string) => {
      if (!store) return;

      const tag = store.get(tagId);
      const tagName = (tag?.properties.name as string) ?? 'tag';

      const result = store.addTagToMany(selectedIds, tagId);
      refreshData();
      onActionComplete?.();

      if (result.errors.length > 0) {
        addToast({
          type: 'warning',
          message: `Added "${tagName}" to ${result.updated} of ${count} items`,
        });
      } else {
        addToast({
          type: 'success',
          message: `Added "${tagName}" to ${result.updated} item${result.updated === 1 ? '' : 's'}`,
        });
      }
    },
    [store, selectedIds, count, refreshData, onActionComplete, addToast]
  );

  // Handle set priority
  const handleSetPriority = useCallback(
    (priority: string | null) => {
      if (!store) return;

      const result = store.setPriorityMany(selectedIds, priority === 'none' ? null : priority);
      refreshData();
      onActionComplete?.();

      const label = priority === 'none' ? 'none' : priority ?? 'none';
      if (result.errors.length > 0) {
        addToast({
          type: 'warning',
          message: `Set priority to ${label} for ${result.updated} of ${selectedInfo.taskCount} tasks`,
        });
      } else {
        addToast({
          type: 'success',
          message: `Set priority to ${label} for ${result.updated} task${result.updated === 1 ? '' : 's'}`,
        });
      }
    },
    [store, selectedIds, selectedInfo.taskCount, refreshData, onActionComplete, addToast]
  );

  // Handle mark complete
  const handleMarkComplete = useCallback(() => {
    if (!store) return;

    const result = store.setStatusMany(selectedIds, 'done');
    refreshData();
    onActionComplete?.();

    if (result.errors.length > 0) {
      addToast({
        type: 'warning',
        message: `Completed ${result.updated} of ${selectedInfo.taskCount} tasks`,
      });
    } else {
      addToast({
        type: 'success',
        message: `Completed ${result.updated} task${result.updated === 1 ? '' : 's'}`,
      });
    }
  }, [store, selectedIds, selectedInfo.taskCount, refreshData, onActionComplete, addToast]);

  // Handle pin
  const handlePin = useCallback(() => {
    if (!store) return;

    const result = store.pinMany(selectedIds);
    refreshData();
    onActionComplete?.();

    addToast({
      type: 'success',
      message: `Pinned ${result.pinned} item${result.pinned === 1 ? '' : 's'}`,
    });
  }, [store, selectedIds, refreshData, onActionComplete, addToast]);

  // Handle unpin
  const handleUnpin = useCallback(() => {
    if (!store) return;

    const result = store.unpinMany(selectedIds);
    refreshData();
    onActionComplete?.();

    addToast({
      type: 'success',
      message: `Unpinned ${result.unpinned} item${result.unpinned === 1 ? '' : 's'}`,
    });
  }, [store, selectedIds, refreshData, onActionComplete, addToast]);

  // Handle archive
  const handleArchive = useCallback(() => {
    if (!store) return;

    // Group all archive operations into a single undo step
    groupStart();
    try {
      const result = store.archiveMany(selectedIds);
      refreshData();
      onClearSelection();
      onActionComplete?.();

      addToast({
        type: 'success',
        message: `Archived ${result.archived} item${result.archived === 1 ? '' : 's'}`,
      });
    } finally {
      groupEnd();
    }
  }, [store, selectedIds, refreshData, onClearSelection, onActionComplete, addToast, groupStart, groupEnd]);

  // Handle unarchive (restore)
  const handleUnarchive = useCallback(() => {
    if (!store) return;

    // Group all unarchive operations into a single undo step
    groupStart();
    try {
      const result = store.unarchiveMany(selectedIds);
      refreshData();
      onClearSelection();
      onActionComplete?.();

      addToast({
        type: 'success',
        message: `Restored ${result.unarchived} item${result.unarchived === 1 ? '' : 's'}`,
      });
    } finally {
      groupEnd();
    }
  }, [store, selectedIds, refreshData, onClearSelection, onActionComplete, addToast, groupStart, groupEnd]);

  // Handle assign to project
  const handleAssignProject = useCallback(
    (projectId: string) => {
      if (!store) return;

      const project = store.get(projectId);
      const projectName = (project?.properties.name as string) ?? 'project';

      const result = store.assignToProjectMany(selectedIds, projectId);
      refreshData();
      onActionComplete?.();

      if (result.errors.length > 0) {
        addToast({
          type: 'warning',
          message: `Assigned ${result.updated} of ${count} items to "${projectName}"`,
        });
      } else {
        addToast({
          type: 'success',
          message: `Assigned ${result.updated} item${result.updated === 1 ? '' : 's'} to "${projectName}"`,
        });
      }
    },
    [store, selectedIds, count, refreshData, onActionComplete, addToast]
  );

  // Don't render if no selection
  if (count === 0) return null;

  // Get available types for type change dropdown (excluding internal types)
  const types = typeRegistry.getAll().filter(
    (typeDef) => !['tag', 'project', 'type'].includes(typeDef.id)
  );

  const typeOptions = types.map((typeDef) => ({
    value: typeDef.id,
    label: typeDef.name,
  }));

  const priorityOptions = [
    ...TaskPriorityOptions.map((priority) => ({
      value: priority,
      label: priority.charAt(0).toUpperCase() + priority.slice(1),
    })),
    { value: 'none', label: 'Clear Priority' },
  ];

  return (
    <Portal>
      <Box
        role="toolbar"
        aria-label="Bulk actions"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'var(--mantine-color-body)',
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-sm)',
          boxShadow: 'var(--mantine-shadow-lg)',
          padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
        }}
      >
        <Group gap="sm" wrap="nowrap">
          {/* Selection count */}
          <Text size="sm" c="dimmed" aria-live="polite" style={{ whiteSpace: 'nowrap' }}>
            {count} selected
          </Text>

          <Divider orientation="vertical" />

          {/* Action icons group */}
          <Group gap={4} wrap="nowrap">
            {/* Process button - inbox only */}
            {viewType === 'inbox' && (
              <Tooltip label="Mark as done" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="sage"
                  onClick={handleProcess}
                  aria-label="Mark as done"
                >
                  <Icon name="check" size={14} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Task-specific actions */}
            {selectedInfo.hasTasks && viewType === 'tasks' && (
              <>
                <Tooltip label="Complete tasks" position="top" withArrow>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="sage"
                    onClick={handleMarkComplete}
                    aria-label="Complete tasks"
                  >
                    <Icon name="check" size={14} />
                  </ActionIcon>
                </Tooltip>

                <Menu position="top" withArrow>
                  <Menu.Target>
                    <Tooltip label="Set priority" position="top" withArrow>
                      <ActionIcon variant="subtle" size="sm" aria-label="Set priority">
                        <Icon name="flag" size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {priorityOptions.map((option) => (
                      <Menu.Item key={option.value} onClick={() => handleSetPriority(option.value)}>
                        {option.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </>
            )}

            {/* Tags */}
            <Tooltip label="Manage tags" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setTagPickerOpen(true)}
                aria-label="Manage tags"
              >
                <Icon name="tag" size={14} />
              </ActionIcon>
            </Tooltip>

            {/* Project assignment */}
            <Tooltip label="Assign to project" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setProjectPickerOpen(true)}
                aria-label="Assign to project"
              >
                <Icon name="folder" size={14} />
              </ActionIcon>
            </Tooltip>

            {/* Pin/Unpin */}
            {!selectedInfo.allPinned && (
              <Tooltip label="Pin items" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handlePin}
                  aria-label="Pin items"
                >
                  <Icon name="pin" size={14} />
                </ActionIcon>
              </Tooltip>
            )}
            {!selectedInfo.nonePinned && (
              <Tooltip label="Unpin items" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handleUnpin}
                  aria-label="Unpin items"
                >
                  <Icon name="pin-off" size={14} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Type change */}
            <Menu position="top" withArrow>
              <Menu.Target>
                <Tooltip label="Change type" position="top" withArrow>
                  <ActionIcon variant="subtle" size="sm" aria-label="Change type">
                    <Icon name="shapes" size={14} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {typeOptions.map((option) => (
                  <Menu.Item key={option.value} onClick={() => handleChangeType(option.value)}>
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Divider orientation="vertical" />

          {/* Archive/Restore button - show Archive in normal views, Restore in archive view */}
          {viewType === 'archive' ? (
            <Tooltip label="Restore items" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="sage"
                onClick={handleUnarchive}
                aria-label="Restore items"
              >
                <Icon name="archive-restore" size={14} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label="Archive items" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleArchive}
                aria-label="Archive items"
              >
                <Icon name="archive" size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Delete button - only available in archive view */}
          {viewType === 'archive' && (
            <Tooltip label="Delete permanently" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="brick"
                onClick={handleDelete}
                aria-label="Delete permanently"
              >
                <Icon name="trash-2" size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          <Divider orientation="vertical" />

          {/* Clear selection button */}
          <Tooltip label="Clear selection" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              onClick={onClearSelection}
              aria-label="Clear selection"
            >
              <Icon name="x" size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>

      {/* Tag Picker Modal */}
      <ObjectSearchModal
        isOpen={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        onSelect={(tagId) => {
          handleAddTag(tagId);
          setTagPickerOpen(false);
        }}
        targetTypeIds={['tag']}
        title="Add Tag"
      />

      {/* Project Picker Modal */}
      <ObjectSearchModal
        isOpen={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
        onSelect={(projectId) => {
          handleAssignProject(projectId);
          setProjectPickerOpen(false);
        }}
        targetTypeIds={['project']}
        title="Assign to Project"
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
    </Portal>
  );
}
