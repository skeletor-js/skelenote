/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NavigationProvider, useNavigation } from '../NavigationContext';

describe('NavigationContext', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    expect(result.current.currentView).toBe('inbox');
    expect(result.current.selectedObjectId).toBeNull();
    expect(result.current.canGoBack).toBe(false);
  });

  it('should navigate to object', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToObject('obj-123');
    });

    expect(result.current.currentView).toBe('object');
    expect(result.current.selectedObjectId).toBe('obj-123');
    expect(result.current.canGoBack).toBe(true);
  });

  it('should navigate to view', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToView('settings');
    });

    expect(result.current.currentView).toBe('settings');
  });

  it('should handle history (back/forward)', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    // Initial: inbox
    act(() => {
      result.current.navigateToView('tasks');
    });
    // Now: tasks, History: [inbox]

    expect(result.current.currentView).toBe('tasks');
    expect(result.current.canGoBack).toBe(true);

    act(() => {
      result.current.navigateBack();
    });
    // Now: inbox, Forward: [tasks]

    expect(result.current.currentView).toBe('inbox');
    expect(result.current.canGoForward).toBe(true);

    act(() => {
      result.current.navigateForward();
    });
    // Now: tasks

    expect(result.current.currentView).toBe('tasks');
  });

  it('should clear forward history on new navigation', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToView('tasks');
    });

    act(() => {
      result.current.navigateBack();
    });
    // Back at inbox, forward has tasks

    expect(result.current.canGoForward).toBe(true);

    act(() => {
      result.current.navigateToView('settings');
    });
    // New nav, forward should be cleared

    expect(result.current.currentView).toBe('settings');
    expect(result.current.canGoForward).toBe(false);
  });

  it('scrolls input into view', () => {
    // split pane tests
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.openInSplit('obj-secondary');
    });

    expect(result.current.splitPane.isOpen).toBe(true);
    expect(result.current.splitPane.objectId).toBe('obj-secondary');

    // Swap
    act(() => {
      // Primary needs to be an object for swap to work based on logic?
      // swapPanes implementation checks: if (!splitPane.objectId || !currentState.objectId) return;
      result.current.navigateToObject('obj-primary');
    });

    // Need to re-open split because navigateToObject closes it if not version comparison?
    // Logic:
    /*
        if (
          splitPane.mode === 'version-comparison' &&
          splitPane.objectId !== objectId
        ) { ... }
        */
    // It typically preserves split pane unless explicitly closed or mode conflict.
    // But wait, does navigateToView close split?
    /*
        const navigateToObject = useCallback(...) => {
          if (splitPane.mode === 'version-comparison' ...) closeVersionComparisonIfActive();
          ...
        }
        */
    // It doesn't generic close split.

    act(() => {
      result.current.openInSplit('obj-secondary');
      result.current.swapPanes();
    });

    expect(result.current.selectedObjectId).toBe('obj-secondary');
    expect(result.current.splitPane.objectId).toBe('obj-primary');
  });
});
