/**
 * BulkActions - Floating action bar for batch operations on selected items
 * Appears at bottom center when items are selected
 */

import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import { useConfirmDialog } from '@/hooks';
import { ConfirmDialog } from '@/components/ui';
import { ObjectSearchModal } from '@/components/object/editors';
import { TaskPriorityOptions } from '@/lib/types';
import './BulkActions.css';

export interface BulkActionsProps {
  /** Array of selected item IDs */
  selectedIds: string[];
  /** Callback to clear selection after action */
  onClearSelection: () => void;
  /** Callback after successful action (triggers data refresh) */
  onActionComplete?: () => void;
  /** View type for context-specific actions */
  viewType?: 'inbox' | 'tasks' | 'all';
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
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

  // Modal states
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagPickerMode, setTagPickerMode] = useState<'add' | 'remove'>('add');
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
      message: `Are you sure you want to delete ${count} selected item${count === 1 ? '' : 's'}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
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
    }
  }, [store, selectedIds, count, confirm, refreshData, onClearSelection, onActionComplete, addToast]);

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
    (newTypeId: string) => {
      if (!store) return;

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

  // Handle remove tag
  const handleRemoveTag = useCallback(
    (tagId: string) => {
      if (!store) return;

      const tag = store.get(tagId);
      const tagName = (tag?.properties.name as string) ?? 'tag';

      const result = store.removeTagFromMany(selectedIds, tagId);
      refreshData();
      onActionComplete?.();

      if (result.errors.length > 0) {
        addToast({
          type: 'warning',
          message: `Removed "${tagName}" from ${result.updated} of ${count} items`,
        });
      } else {
        addToast({
          type: 'success',
          message: `Removed "${tagName}" from ${result.updated} item${result.updated === 1 ? '' : 's'}`,
        });
      }
    },
    [store, selectedIds, count, refreshData, onActionComplete, addToast]
  );

  // Handle set priority
  const handleSetPriority = useCallback(
    (priority: string | null) => {
      if (!store) return;

      const result = store.setPriorityMany(selectedIds, priority);
      refreshData();
      onActionComplete?.();

      const label = priority ?? 'none';
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

  // Handle mark incomplete
  const handleMarkIncomplete = useCallback(() => {
    if (!store) return;

    const result = store.setStatusMany(selectedIds, 'todo');
    refreshData();
    onActionComplete?.();

    if (result.errors.length > 0) {
      addToast({
        type: 'warning',
        message: `Reopened ${result.updated} of ${selectedInfo.taskCount} tasks`,
      });
    } else {
      addToast({
        type: 'success',
        message: `Reopened ${result.updated} task${result.updated === 1 ? '' : 's'}`,
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

  return createPortal(
    <>
      <div className="bulk-actions" role="toolbar" aria-label="Bulk actions">
        {/* Selection count */}
        <span className="bulk-actions__count" aria-live="polite">
          {count} selected
        </span>

        {/* Divider */}
        <span className="bulk-actions__divider" aria-hidden="true" />

        {/* Actions */}
        <div className="bulk-actions__buttons">
          {/* Process button - inbox only */}
          {viewType === 'inbox' && (
            <button
              type="button"
              className="bulk-actions__button"
              onClick={handleProcess}
              title="Mark as processed (removes from inbox)"
            >
              Done
            </button>
          )}

          {/* Task-specific actions */}
          {selectedInfo.hasTasks && viewType === 'tasks' && (
            <>
              <button
                type="button"
                className="bulk-actions__button"
                onClick={handleMarkComplete}
                title="Mark selected tasks as complete"
              >
                Complete
              </button>
              <button
                type="button"
                className="bulk-actions__button"
                onClick={handleMarkIncomplete}
                title="Mark selected tasks as incomplete"
              >
                Reopen
              </button>
              <div className="bulk-actions__dropdown">
                <select
                  className="bulk-actions__select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value === 'none') {
                      handleSetPriority(null);
                    } else if (e.target.value) {
                      handleSetPriority(e.target.value);
                    }
                  }}
                  aria-label="Set priority"
                >
                  <option value="" disabled>
                    Priority
                  </option>
                  {TaskPriorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                  <option value="none">Clear Priority</option>
                </select>
              </div>
            </>
          )}

          {/* Tag actions */}
          <button
            type="button"
            className="bulk-actions__button"
            onClick={() => {
              setTagPickerMode('add');
              setTagPickerOpen(true);
            }}
            title="Add tag to selected items"
          >
            +Tag
          </button>
          <button
            type="button"
            className="bulk-actions__button"
            onClick={() => {
              setTagPickerMode('remove');
              setTagPickerOpen(true);
            }}
            title="Remove tag from selected items"
          >
            -Tag
          </button>

          {/* Project assignment */}
          <button
            type="button"
            className="bulk-actions__button"
            onClick={() => setProjectPickerOpen(true)}
            title="Assign to project"
          >
            Project
          </button>

          {/* Pin/Unpin */}
          {selectedInfo.nonePinned ? (
            <button
              type="button"
              className="bulk-actions__button"
              onClick={handlePin}
              title="Pin selected items"
            >
              Pin
            </button>
          ) : selectedInfo.allPinned ? (
            <button
              type="button"
              className="bulk-actions__button"
              onClick={handleUnpin}
              title="Unpin selected items"
            >
              Unpin
            </button>
          ) : (
            <>
              <button
                type="button"
                className="bulk-actions__button"
                onClick={handlePin}
                title="Pin selected items"
              >
                Pin
              </button>
              <button
                type="button"
                className="bulk-actions__button"
                onClick={handleUnpin}
                title="Unpin selected items"
              >
                Unpin
              </button>
            </>
          )}

          {/* Type change dropdown */}
          <div className="bulk-actions__dropdown">
            <select
              className="bulk-actions__select"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleChangeType(e.target.value);
                }
              }}
              aria-label="Change type"
            >
              <option value="" disabled>
                Type
              </option>
              {types.map((typeDef) => (
                <option key={typeDef.id} value={typeDef.id}>
                  {typeDef.icon} {typeDef.name}
                </option>
              ))}
            </select>
          </div>

          {/* Delete button */}
          <button
            type="button"
            className="bulk-actions__button bulk-actions__button--danger"
            onClick={handleDelete}
            title="Delete selected items"
          >
            Delete
          </button>
        </div>

        {/* Divider */}
        <span className="bulk-actions__divider" aria-hidden="true" />

        {/* Clear selection button */}
        <button
          type="button"
          className="bulk-actions__close"
          onClick={onClearSelection}
          aria-label="Clear selection"
          title="Clear selection (Escape)"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {/* Tag Picker Modal */}
      <ObjectSearchModal
        isOpen={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        onSelect={(tagId) => {
          if (tagPickerMode === 'add') {
            handleAddTag(tagId);
          } else {
            handleRemoveTag(tagId);
          }
          setTagPickerOpen(false);
        }}
        targetTypeIds={['tag']}
        title={tagPickerMode === 'add' ? 'Add Tag' : 'Remove Tag'}
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
    </>,
    document.body
  );
}
