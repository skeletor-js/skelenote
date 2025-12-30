/**
 * Hook for managing multi-selection state in list views
 * Supports toggle, range selection (Shift+click), select all, and clear
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

export interface SelectionState {
  /** Currently selected item IDs */
  selectedIds: Set<string>;
  /** Last selected ID (for Shift+click range selection) */
  lastSelectedId: string | null;
}

export interface SelectionActions {
  /** Toggle selection of a single item */
  toggle: (id: string) => void;
  /** Select a range from lastSelectedId to the given id (Shift+click) */
  selectRange: (id: string) => void;
  /** Select all items */
  selectAll: () => void;
  /** Clear all selections */
  clear: () => void;
  /** Check if an item is selected */
  isSelected: (id: string) => boolean;
}

export interface UseSelectionResult extends SelectionActions {
  /** Set of currently selected IDs */
  selectedIds: Set<string>;
  /** Number of selected items */
  selectedCount: number;
  /** Whether any item is selected (enables "selecting mode") */
  hasSelection: boolean;
  /** Array of selected IDs for iteration */
  selectedArray: string[];
}

export interface UseSelectionOptions {
  /** All item IDs in the current view (for range selection and select all) */
  allItems: string[];
}

/**
 * Hook for managing multi-selection state
 *
 * @example
 * ```tsx
 * const { items } = useInbox();
 * const itemIds = useMemo(() => items.map(i => i.id), [items]);
 * const selection = useSelection({ allItems: itemIds });
 *
 * // Single click on checkbox
 * <input type="checkbox"
 *   checked={selection.isSelected(item.id)}
 *   onChange={() => selection.toggle(item.id)}
 * />
 *
 * // Shift+click for range selection
 * onClick={(e) => {
 *   if (e.shiftKey) {
 *     selection.selectRange(item.id);
 *   } else {
 *     selection.toggle(item.id);
 *   }
 * }}
 *
 * // Cmd+A for select all
 * useEffect(() => {
 *   const handleKeyDown = (e) => {
 *     if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
 *       e.preventDefault();
 *       selection.selectAll();
 *     }
 *   };
 *   // ...
 * }, [selection.selectAll]);
 * ```
 */
export function useSelection({ allItems }: UseSelectionOptions): UseSelectionResult {
  const [state, setState] = useState<SelectionState>({
    selectedIds: new Set(),
    lastSelectedId: null,
  });

  // Prune orphaned IDs when items change (e.g., filter change, sync)
  useEffect(() => {
    const currentIds = new Set(allItems);
    const orphaned = [...state.selectedIds].filter((id) => !currentIds.has(id));

    if (orphaned.length > 0) {
      setState((prev) => {
        const next = new Set(prev.selectedIds);
        orphaned.forEach((id) => next.delete(id));
        return {
          ...prev,
          selectedIds: next,
          // Reset lastSelectedId if it was orphaned
          lastSelectedId:
            prev.lastSelectedId && !currentIds.has(prev.lastSelectedId)
              ? null
              : prev.lastSelectedId,
        };
      });
    }
  }, [allItems, state.selectedIds]);

  // Toggle selection of a single item
  const toggle = useCallback((id: string) => {
    setState((prev) => {
      const next = new Set(prev.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return {
        selectedIds: next,
        lastSelectedId: id,
      };
    });
  }, []);

  // Select range from lastSelectedId to given id
  const selectRange = useCallback(
    (id: string) => {
      setState((prev) => {
        // If no previous selection, just select this item
        if (!prev.lastSelectedId) {
          const next = new Set(prev.selectedIds);
          next.add(id);
          return {
            selectedIds: next,
            lastSelectedId: id,
          };
        }

        // Find indices in the allItems array
        const startIndex = allItems.indexOf(prev.lastSelectedId);
        const endIndex = allItems.indexOf(id);

        // If either not found, just toggle
        if (startIndex === -1 || endIndex === -1) {
          const next = new Set(prev.selectedIds);
          next.add(id);
          return {
            selectedIds: next,
            lastSelectedId: id,
          };
        }

        // Select all items in range (inclusive)
        const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const next = new Set(prev.selectedIds);
        for (let i = from; i <= to; i++) {
          next.add(allItems[i]);
        }

        return {
          selectedIds: next,
          lastSelectedId: id,
        };
      });
    },
    [allItems]
  );

  // Select all items
  const selectAll = useCallback(() => {
    setState({
      selectedIds: new Set(allItems),
      lastSelectedId: allItems.length > 0 ? allItems[allItems.length - 1] : null,
    });
  }, [allItems]);

  // Clear all selections
  const clear = useCallback(() => {
    setState({
      selectedIds: new Set(),
      lastSelectedId: null,
    });
  }, []);

  // Check if an item is selected
  const isSelected = useCallback((id: string) => state.selectedIds.has(id), [state.selectedIds]);

  // Derived values
  const hasSelection = state.selectedIds.size > 0;
  const selectedCount = state.selectedIds.size;
  const selectedArray = useMemo(() => [...state.selectedIds], [state.selectedIds]);

  return {
    selectedIds: state.selectedIds,
    selectedCount,
    hasSelection,
    selectedArray,
    toggle,
    selectRange,
    selectAll,
    clear,
    isSelected,
  };
}
