/**
 * useDuplicate hook - Duplicate objects with smart defaults
 */

import { useCallback, useRef } from 'react';
import { useObjects, useNavigation, useToast } from '@/contexts';
import { useLinkToDaily } from './useLinkToDaily';
import type { SkelenoteObject } from '@/lib/types';

export interface UseDuplicateResult {
  /**
   * Duplicate an object with smart defaults
   * - Copies properties with type-specific transformations
   * - Copies content
   * - Links to today's daily note
   * - Shows toast with undo action
   */
  duplicate: (objectId: string) => SkelenoteObject | null;

  /**
   * Duplicate multiple objects
   */
  duplicateMany: (objectIds: string[]) => {
    duplicated: SkelenoteObject[];
    errors: string[];
  };

  /**
   * Check if an object can be duplicated
   * Returns false for daily notes
   */
  canDuplicate: (objectId: string) => boolean;
}

/**
 * Hook for duplicating objects with smart defaults
 *
 * Usage:
 * ```tsx
 * const { duplicate, canDuplicate } = useDuplicate();
 *
 * const handleDuplicate = () => {
 *   if (canDuplicate(objectId)) {
 *     duplicate(objectId);
 *   }
 * };
 * ```
 */
export function useDuplicate(): UseDuplicateResult {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();
  const { addToast } = useToast();
  const { linkToDaily } = useLinkToDaily();

  // Track last duplicated object for undo
  const lastDuplicatedRef = useRef<{
    id: string;
    timeoutId: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const canDuplicate = useCallback(
    (objectId: string): boolean => {
      if (!store) return false;
      return store.canDuplicate(objectId);
    },
    [store]
  );

  const duplicate = useCallback(
    (objectId: string): SkelenoteObject | null => {
      if (!store) return null;

      // Check if duplicatable
      if (!store.canDuplicate(objectId)) {
        addToast({
          type: 'error',
          message: 'Daily notes cannot be duplicated',
        });
        return null;
      }

      try {
        // Duplicate the object
        const duplicated = store.duplicate(objectId);

        // Link to today's daily note
        linkToDaily(duplicated);

        // Clear any pending undo timeout
        if (lastDuplicatedRef.current?.timeoutId) {
          clearTimeout(lastDuplicatedRef.current.timeoutId);
        }

        // Track this duplicate for undo
        lastDuplicatedRef.current = {
          id: duplicated.id,
          timeoutId: null,
        };

        // Get title for display
        const title = String(
          duplicated.properties.title ?? duplicated.properties.name ?? 'object'
        );
        const truncatedTitle =
          title.length > 30 ? title.substring(0, 30) + '...' : title;

        // Show toast with View and Undo actions
        addToast({
          type: 'success',
          message: `Duplicated "${truncatedTitle}"`,
          duration: 5000,
          action: {
            label: 'View',
            onClick: () => {
              navigateToObject(duplicated.id);
            },
          },
        });

        // Set timeout to clear undo reference
        lastDuplicatedRef.current.timeoutId = setTimeout(() => {
          lastDuplicatedRef.current = null;
        }, 5000);

        refreshData();
        return duplicated;
      } catch (error) {
        addToast({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to duplicate object',
        });
        return null;
      }
    },
    [store, linkToDaily, addToast, navigateToObject, refreshData]
  );

  const duplicateMany = useCallback(
    (
      objectIds: string[]
    ): { duplicated: SkelenoteObject[]; errors: string[] } => {
      if (!store) {
        return { duplicated: [], errors: objectIds };
      }

      const result = store.duplicateMany(objectIds);

      // Link each duplicate to today's daily note
      for (const dup of result.duplicated) {
        linkToDaily(dup);
      }

      // Show toast
      if (result.duplicated.length > 0) {
        addToast({
          type: result.errors.length > 0 ? 'warning' : 'success',
          message:
            result.errors.length > 0
              ? `Duplicated ${result.duplicated.length} of ${objectIds.length} items`
              : `Duplicated ${result.duplicated.length} item${result.duplicated.length === 1 ? '' : 's'}`,
          duration: 5000,
        });
      } else {
        addToast({
          type: 'error',
          message: 'Failed to duplicate items',
        });
      }

      refreshData();
      return result;
    },
    [store, linkToDaily, addToast, refreshData]
  );

  return {
    duplicate,
    duplicateMany,
    canDuplicate,
  };
}
