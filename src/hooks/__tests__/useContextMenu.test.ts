/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContextMenu } from '..';

describe('useContextMenu', () => {
  it('should initialize with closed state', () => {
    const { result } = renderHook(() => useContextMenu());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.position).toEqual({ x: 0, y: 0 });
  });

  it('should open context menu with correct position', () => {
    const { result } = renderHook(() => useContextMenu());

    const mockEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.position).toEqual({ x: 100, y: 200 });
  });

  it('should close context menu', () => {
    const { result } = renderHook(() => useContextMenu());

    // Open first
    const mockEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent);
    });

    expect(result.current.isOpen).toBe(true);

    // Now close
    act(() => {
      result.current.closeContextMenu();
    });

    expect(result.current.isOpen).toBe(false);
    // Position should remain
    expect(result.current.position).toEqual({ x: 100, y: 200 });
  });

  it('should prevent default on open', () => {
    const { result } = renderHook(() => useContextMenu());

    let preventDefaultCalled = false;
    let stopPropagationCalled = false;

    const mockEvent = {
      preventDefault: () => {
        preventDefaultCalled = true;
      },
      stopPropagation: () => {
        stopPropagationCalled = true;
      },
      clientX: 50,
      clientY: 75,
    } as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent);
    });

    expect(preventDefaultCalled).toBe(true);
    expect(stopPropagationCalled).toBe(true);
  });

  it('should update position on subsequent opens', () => {
    const { result } = renderHook(() => useContextMenu());

    const mockEvent1 = {
      preventDefault: () => {},
      stopPropagation: () => {},
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent1);
    });

    expect(result.current.position).toEqual({ x: 100, y: 200 });

    // Open at a different position
    const mockEvent2 = {
      preventDefault: () => {},
      stopPropagation: () => {},
      clientX: 300,
      clientY: 400,
    } as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent2);
    });

    expect(result.current.position).toEqual({ x: 300, y: 400 });
  });
});
