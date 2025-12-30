/**
 * BulkActions - Floating action bar for batch operations on selected items
 * Appears at bottom center when items are selected
 */

import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import { useConfirmDialog } from '@/hooks';
import { ConfirmDialog } from '@/components/ui';
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

  const count = selectedIds.length;

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
    async (newTypeId: string) => {
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
