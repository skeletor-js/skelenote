/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../useSelection';
import { getAccessibleTransition } from '../useReducedMotion';

// ============================================================================
// getAccessibleTransition Tests
// ============================================================================

describe('getAccessibleTransition', () => {
  it('should return instant transition when reduced motion is enabled', () => {
    const transition = { duration: 0.3, ease: 'easeOut' };

    const result = getAccessibleTransition(transition as any, true);
    expect(result).toEqual({ duration: 0 });
  });

  it('should return original transition when reduced motion is disabled', () => {
    const transition = { duration: 0.3, ease: 'easeOut' };

    const result = getAccessibleTransition(transition as any, false);
    expect(result).toEqual(transition);
  });

  it('should handle complex spring transitions', () => {
    const springTransition = {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    };

    const result = getAccessibleTransition(springTransition as any, false);
    expect(result).toEqual(springTransition);
  });

  it('should override spring to instant when reduced motion is enabled', () => {
    const springTransition = {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    };

    const result = getAccessibleTransition(springTransition as any, true);
    expect(result).toEqual({ duration: 0 });
  });

  it('should handle empty transition object', () => {
    const result = getAccessibleTransition({}, false);
    expect(result).toEqual({});
  });

  it('should handle transition with multiple properties', () => {
    const transition = {
      duration: 0.5,
      delay: 0.1,
      ease: [0.4, 0, 0.2, 1],
    };

    const result = getAccessibleTransition(transition as any, false);
    expect(result).toEqual(transition);
  });

  it('should convert all complex transitions to instant when motion reduced', () => {
    const transition = {
      duration: 2,
      delay: 0.5,
      ease: 'anticipate',
      repeat: 3,
    };

    const result = getAccessibleTransition(transition as any, true);
    expect(result).toEqual({ duration: 0 });
  });
});

// ============================================================================
// useSelection Hook Tests
// ============================================================================

describe('useSelection', () => {
  const defaultItems = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5'];

  describe('initialization', () => {
    it('should start with empty selection', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      expect(result.current.hasSelection).toBe(false);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.selectedArray).toEqual([]);
    });

    it('should have empty selectedIds set', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('toggle', () => {
    it('should select an item when toggled', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.toggle('item-1');
      });

      expect(result.current.isSelected('item-1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.hasSelection).toBe(true);
    });

    it('should deselect an item when toggled twice', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.toggle('item-1');
      });
      act(() => {
        result.current.toggle('item-1');
      });

      expect(result.current.isSelected('item-1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });

    it('should allow multiple selections', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.toggle('item-1');
        result.current.toggle('item-3');
        result.current.toggle('item-5');
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isSelected('item-1')).toBe(true);
      expect(result.current.isSelected('item-2')).toBe(false);
      expect(result.current.isSelected('item-3')).toBe(true);
      expect(result.current.isSelected('item-5')).toBe(true);
    });
  });

  describe('selectRange', () => {
    it('should select a single item if no previous selection', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.selectRange('item-3');
      });

      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('item-3')).toBe(true);
    });

    it('should select range from last selected to target', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      // First select item-1
      act(() => {
        result.current.toggle('item-1');
      });

      // Then range select to item-4
      act(() => {
        result.current.selectRange('item-4');
      });

      expect(result.current.selectedCount).toBe(4);
      expect(result.current.isSelected('item-1')).toBe(true);
      expect(result.current.isSelected('item-2')).toBe(true);
      expect(result.current.isSelected('item-3')).toBe(true);
      expect(result.current.isSelected('item-4')).toBe(true);
      expect(result.current.isSelected('item-5')).toBe(false);
    });

    it('should select range in reverse direction', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      // First select item-4
      act(() => {
        result.current.toggle('item-4');
      });

      // Then range select to item-2 (backwards)
      act(() => {
        result.current.selectRange('item-2');
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isSelected('item-2')).toBe(true);
      expect(result.current.isSelected('item-3')).toBe(true);
      expect(result.current.isSelected('item-4')).toBe(true);
    });

    it('should add to existing selection', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      // Select item-5 first
      act(() => {
        result.current.toggle('item-5');
      });

      // Toggle item-1 (sets lastSelectedId)
      act(() => {
        result.current.toggle('item-1');
      });

      // Range select to item-3
      act(() => {
        result.current.selectRange('item-3');
      });

      // Should have both item-5 and items 1-3
      expect(result.current.selectedCount).toBe(4);
      expect(result.current.isSelected('item-5')).toBe(true);
    });
  });

  describe('selectAll', () => {
    it('should select all items', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedCount).toBe(5);
      defaultItems.forEach((id) => {
        expect(result.current.isSelected(id)).toBe(true);
      });
    });

    it('should handle empty items array', () => {
      const { result } = renderHook(() => useSelection({ allItems: [] }));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.toggle('item-1');
        result.current.toggle('item-3');
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('isSelected', () => {
    it('should return true for selected items', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.toggle('item-2');
      });

      expect(result.current.isSelected('item-2')).toBe(true);
    });

    it('should return false for non-selected items', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.toggle('item-2');
      });

      expect(result.current.isSelected('item-1')).toBe(false);
      expect(result.current.isSelected('item-3')).toBe(false);
    });
  });

  describe('selectedArray', () => {
    it('should return array of selected IDs', () => {
      const { result } = renderHook(() =>
        useSelection({ allItems: defaultItems })
      );

      act(() => {
        result.current.toggle('item-1');
        result.current.toggle('item-4');
      });

      expect(result.current.selectedArray).toHaveLength(2);
      expect(result.current.selectedArray).toContain('item-1');
      expect(result.current.selectedArray).toContain('item-4');
    });
  });

  describe('orphan pruning', () => {
    it('should remove orphaned selections when items change', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useSelection({ allItems: items }),
        { initialProps: { items: defaultItems } }
      );

      // Select items 3 and 5
      act(() => {
        result.current.toggle('item-3');
        result.current.toggle('item-5');
      });

      expect(result.current.selectedCount).toBe(2);

      // Rerender with fewer items (item-5 removed)
      rerender({ items: ['item-1', 'item-2', 'item-3', 'item-4'] });

      // item-5 should have been pruned
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('item-3')).toBe(true);
      expect(result.current.isSelected('item-5')).toBe(false);
    });

    it('should reset lastSelectedId if it was orphaned', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useSelection({ allItems: items }),
        { initialProps: { items: defaultItems } }
      );

      // Select item-5 (sets it as lastSelectedId)
      act(() => {
        result.current.toggle('item-5');
      });

      // Rerender without item-5
      rerender({ items: ['item-1', 'item-2', 'item-3'] });

      // Now trying range select should just add the item
      act(() => {
        result.current.selectRange('item-2');
      });

      // Should only have item-2, not a range from orphaned item-5
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('item-2')).toBe(true);
    });
  });
});
