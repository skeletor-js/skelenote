/**
 * Hook for showing undo toasts after destructive actions
 *
 * Provides helper functions to show toasts with undo buttons
 * for common actions like archive and delete.
 */

import { useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useObjects } from '@/contexts';
import type { SkelenoteObject, PropertyValue } from '@/lib/types';

// Default duration for undo toasts (5 seconds)
const UNDO_TOAST_DURATION = 5000;

interface ArchivedObjectData {
  id: string;
  archived: boolean;
  properties: Record<string, PropertyValue>;
}

interface DeletedObjectData {
  id: string;
  typeId: string;
  properties: Record<string, PropertyValue>;
  hasContent: boolean;
  pinned: boolean;
  inboxed: boolean;
}

export function useUndoToast() {
  const { addToast, removeToast } = useToast();
  const { store, refreshData } = useObjects();

  /**
   * Show undo toast after archiving an object
   */
  const showArchiveUndo = useCallback(
    (object: SkelenoteObject, objectName?: string) => {
      if (!store) return;

      // Store the original state
      const originalData: ArchivedObjectData = {
        id: object.id,
        archived: object.archived ?? false,
        properties: { ...object.properties },
      };

      const name =
        objectName ??
        (object.properties.title as string) ??
        (object.properties.name as string) ??
        'Item';

      const toastId = addToast({
        type: 'info',
        message: `"${name}" archived`,
        duration: UNDO_TOAST_DURATION,
        action: {
          label: 'Undo',
          onClick: () => {
            // Restore the object
            store.unarchive(originalData.id);
            refreshData();
            removeToast(toastId);
          },
        },
      });
    },
    [store, addToast, removeToast, refreshData]
  );

  /**
   * Show undo toast after deleting an object
   */
  const showDeleteUndo = useCallback(
    (object: SkelenoteObject, objectName?: string) => {
      if (!store) return;

      // Store the deleted object data for restoration
      const deletedData: DeletedObjectData = {
        id: object.id,
        typeId: object.typeId,
        properties: { ...object.properties },
        hasContent: object.hasContent,
        pinned: object.pinned,
        inboxed: object.inboxed,
      };

      const name =
        objectName ??
        (object.properties.title as string) ??
        (object.properties.name as string) ??
        'Item';

      const toastId = addToast({
        type: 'info',
        message: `"${name}" deleted`,
        duration: UNDO_TOAST_DURATION,
        action: {
          label: 'Undo',
          onClick: () => {
            // Re-create the object with the same ID
            store.create({
              id: deletedData.id,
              typeId: deletedData.typeId,
              properties: deletedData.properties,
              withContent: deletedData.hasContent,
              inboxed: deletedData.inboxed,
            });
            // Restore pinned state if it was pinned
            if (deletedData.pinned) {
              store.pin(deletedData.id);
            }
            refreshData();
            removeToast(toastId);
          },
        },
      });
    },
    [store, addToast, removeToast, refreshData]
  );

  /**
   * Show undo toast after a generic action
   */
  const showUndoToast = useCallback(
    (message: string, undoFn: () => void) => {
      const toastId = addToast({
        type: 'info',
        message,
        duration: UNDO_TOAST_DURATION,
        action: {
          label: 'Undo',
          onClick: () => {
            undoFn();
            removeToast(toastId);
          },
        },
      });
      return toastId;
    },
    [addToast, removeToast]
  );

  return {
    showArchiveUndo,
    showDeleteUndo,
    showUndoToast,
  };
}
