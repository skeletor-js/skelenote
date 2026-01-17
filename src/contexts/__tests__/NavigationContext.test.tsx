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

  it('should handle split pane operations', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.openInSplit('obj-secondary');
    });

    expect(result.current.splitPane.isOpen).toBe(true);
    expect(result.current.splitPane.objectId).toBe('obj-secondary');

    act(() => {
      result.current.closeSplit();
    });

    expect(result.current.splitPane.isOpen).toBe(false);
    expect(result.current.splitPane.objectId).toBeNull();
  });

  it('should swap panes', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToObject('obj-primary');
      result.current.openInSplit('obj-secondary');
    });

    expect(result.current.selectedObjectId).toBe('obj-primary');
    expect(result.current.splitPane.objectId).toBe('obj-secondary');

    act(() => {
      result.current.swapPanes();
    });

    expect(result.current.selectedObjectId).toBe('obj-secondary');
    expect(result.current.splitPane.objectId).toBe('obj-primary');
  });

  it('should not swap panes when split objectId is null', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToObject('obj-primary');
    });

    const initialObjectId = result.current.selectedObjectId;

    act(() => {
      result.current.swapPanes();
    });

    // Should not change since splitPane.objectId is null
    expect(result.current.selectedObjectId).toBe(initialObjectId);
  });

  it('should not swap panes when current objectId is null', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToView('inbox');
      result.current.openInSplit('obj-secondary');
    });

    expect(result.current.currentView).toBe('inbox');
    expect(result.current.selectedObjectId).toBeNull();

    act(() => {
      result.current.swapPanes();
    });

    // Should not swap since currentState.objectId is null
    expect(result.current.currentView).toBe('inbox');
    expect(result.current.splitPane.objectId).toBe('obj-secondary');
  });

  it('should clamp split width between 25% and 75%', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.setSplitWidth(10);
    });

    expect(result.current.splitPane.width).toBe(25);

    act(() => {
      result.current.setSplitWidth(90);
    });

    expect(result.current.splitPane.width).toBe(75);

    act(() => {
      result.current.setSplitWidth(50);
    });

    expect(result.current.splitPane.width).toBe(50);
  });

  it('should open version comparison', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    const frontier = [{ peer: '1' as `${number}`, counter: 10 }];
    const timestamp = Date.now();
    const context = { selectedDate: '2024-01-15', changeIndex: 5 };

    act(() => {
      result.current.openVersionComparison(
        'obj-123',
        frontier,
        timestamp,
        context
      );
    });

    expect(result.current.currentView).toBe('object');
    expect(result.current.selectedObjectId).toBe('obj-123');
    expect(result.current.splitPane.isOpen).toBe(true);
    expect(result.current.splitPane.mode).toBe('version-comparison');
    expect(result.current.splitPane.historicalFrontier).toEqual(frontier);
    expect(result.current.splitPane.historicalTimestamp).toBe(timestamp);
    expect(result.current.splitPane.timeMachineContext).toEqual(context);
  });

  it('should update version comparison', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    const initialFrontier = [{ peer: '1' as `${number}`, counter: 10 }];
    const initialTimestamp = Date.now();

    act(() => {
      result.current.openVersionComparison(
        'obj-123',
        initialFrontier,
        initialTimestamp
      );
    });

    const newFrontier = [{ peer: '1' as `${number}`, counter: 15 }];
    const newTimestamp = Date.now() + 1000;

    act(() => {
      result.current.updateVersionComparison(newFrontier, newTimestamp);
    });

    expect(result.current.splitPane.historicalFrontier).toEqual(newFrontier);
    expect(result.current.splitPane.historicalTimestamp).toBe(newTimestamp);
    expect(result.current.splitPane.mode).toBe('version-comparison');
  });

  it('should return to time machine from version comparison', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    // Navigate to time machine first
    act(() => {
      result.current.navigateToTimeMachine('filter-obj-id');
    });

    // Then open version comparison
    act(() => {
      result.current.openVersionComparison(
        'obj-123',
        [{ peer: '1' as `${number}`, counter: 10 }],
        Date.now()
      );
    });

    expect(result.current.currentView).toBe('object');
    expect(result.current.splitPane.mode).toBe('version-comparison');

    // Return to time machine
    act(() => {
      result.current.returnToTimeMachine();
    });

    expect(result.current.currentView).toBe('time-machine');
    expect(result.current.splitPane.isOpen).toBe(false);
    expect(result.current.splitPane.mode).toBe('normal');
  });

  it('should handle navigateBack with empty history', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    expect(result.current.canGoBack).toBe(false);

    act(() => {
      result.current.navigateBack();
    });

    // Should remain at inbox
    expect(result.current.currentView).toBe('inbox');
  });

  it('should handle navigateForward with empty forward history', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    expect(result.current.canGoForward).toBe(false);

    act(() => {
      result.current.navigateForward();
    });

    // Should remain at inbox
    expect(result.current.currentView).toBe('inbox');
  });

  it('should navigate to search with query', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToSearch('test query');
    });

    expect(result.current.currentView).toBe('search');
    expect(result.current.searchQuery).toBe('test query');
  });

  it('should navigate to time machine with object filter', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToTimeMachine('obj-filter-id');
    });

    expect(result.current.currentView).toBe('time-machine');
    expect(result.current.timeMachineObjectFilter).toBe('obj-filter-id');
  });

  it('should navigate to saved view', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToSavedView('saved-view-1');
    });

    expect(result.current.currentView).toBe('saved-view');
    expect(result.current.activeSavedViewId).toBe('saved-view-1');
  });

  it('should navigate to type browse', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.navigateToTypeBrowse('type-123');
    });

    expect(result.current.currentView).toBe('type-browse');
    expect(result.current.browseTypeId).toBe('type-123');
  });

  it('should close version comparison when navigating away', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    act(() => {
      result.current.openVersionComparison(
        'obj-123',
        [{ peer: '1' as `${number}`, counter: 10 }],
        Date.now()
      );
    });

    expect(result.current.splitPane.mode).toBe('version-comparison');

    act(() => {
      result.current.navigateToView('inbox');
    });

    expect(result.current.splitPane.isOpen).toBe(false);
    expect(result.current.splitPane.mode).toBe('normal');
  });

  it('should handle editor focus state', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    });

    expect(result.current.isEditorFocused).toBe(false);

    act(() => {
      result.current.setEditorFocused(true);
    });

    expect(result.current.isEditorFocused).toBe(true);

    act(() => {
      result.current.setEditorFocused(false);
    });

    expect(result.current.isEditorFocused).toBe(false);
  });
});
