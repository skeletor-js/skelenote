/**
 * Hook for managing saved views
 */

import { useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';
import { ViewStore, createViewStore } from '@/lib/loro';
import type { SavedView, CreateSavedViewInput, UpdateSavedViewInput } from '@/lib/types';

export interface UseSavedViewsResult {
  /** All saved views sorted by creation date (newest first) */
  views: SavedView[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Number of saved views */
  count: number;
  /** The view store for direct access (if needed) */
  viewStore: ViewStore | null;
  /** Create a new saved view */
  createView: (input: CreateSavedViewInput) => SavedView | null;
  /** Get a single view by ID */
  getView: (id: string) => SavedView | undefined;
  /** Update an existing view */
  updateView: (id: string, input: UpdateSavedViewInput) => SavedView | null;
  /** Delete a view */
  deleteView: (id: string) => boolean;
  /** Check if a view exists */
  exists: (id: string) => boolean;
}

/**
 * Hook for managing saved views
 *
 * @example
 * ```tsx
 * const { views, createView, deleteView } = useSavedViews();
 *
 * // Create a new view
 * const newView = createView({
 *   name: 'High Priority Tasks',
 *   filters: [{ field: 'priority', operator: 'eq', value: 'high' }],
 *   typeFilter: 'task'
 * });
 *
 * // List all views
 * views.map(view => <ViewItem key={view.id} view={view} />);
 * ```
 */
export function useSavedViews(): UseSavedViewsResult {
  const { doc, isLoading, refreshData } = useObjects();

  // Create ViewStore when doc is ready
  const viewStore = useMemo(() => {
    if (!doc) return null;
    return createViewStore(doc);
  }, [doc]);

  // Get all views
  const views = useMemo(() => {
    if (!viewStore) return [];
    return viewStore.getAll();
  }, [viewStore]);

  // Create a new view
  const createView = useCallback(
    (input: CreateSavedViewInput): SavedView | null => {
      if (!viewStore) return null;
      const view = viewStore.create(input);
      refreshData();
      return view;
    },
    [viewStore, refreshData]
  );

  // Get a single view
  const getView = useCallback(
    (id: string): SavedView | undefined => {
      if (!viewStore) return undefined;
      return viewStore.get(id);
    },
    [viewStore]
  );

  // Update a view
  const updateView = useCallback(
    (id: string, input: UpdateSavedViewInput): SavedView | null => {
      if (!viewStore) return null;
      try {
        const view = viewStore.update(id, input);
        refreshData();
        return view;
      } catch {
        return null;
      }
    },
    [viewStore, refreshData]
  );

  // Delete a view
  const deleteView = useCallback(
    (id: string): boolean => {
      if (!viewStore) return false;
      const deleted = viewStore.delete(id);
      if (deleted) {
        refreshData();
      }
      return deleted;
    },
    [viewStore, refreshData]
  );

  // Check if a view exists
  const exists = useCallback(
    (id: string): boolean => {
      if (!viewStore) return false;
      return viewStore.exists(id);
    },
    [viewStore]
  );

  return {
    views,
    isLoading,
    count: views.length,
    viewStore,
    createView,
    getView,
    updateView,
    deleteView,
    exists,
  };
}
