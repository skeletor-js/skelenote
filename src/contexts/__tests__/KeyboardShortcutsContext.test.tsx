/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
  useKeyboardShortcutsSafe,
} from '../KeyboardShortcutsContext';

describe('KeyboardShortcutsContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
  );

  it('should throw when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useKeyboardShortcuts());
    }).toThrow(
      'useKeyboardShortcuts must be used within a KeyboardShortcutsProvider'
    );

    spy.mockRestore();
  });

  it('should return null from safe hook when outside provider', () => {
    const { result } = renderHook(() => useKeyboardShortcutsSafe());

    expect(result.current).toBeNull();
  });

  it('should register and unregister shortcuts', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper });

    const action = vi.fn();

    act(() => {
      result.current.registerShortcut('test-shortcut', {
        key: 'k',
        metaKey: true,
        action,
        description: 'Test shortcut',
      });
    });

    let shortcuts = result.current.getShortcuts();
    expect(shortcuts.has('test-shortcut')).toBe(true);

    act(() => {
      result.current.unregisterShortcut('test-shortcut');
    });

    shortcuts = result.current.getShortcuts();
    expect(shortcuts.has('test-shortcut')).toBe(false);
  });

  it('should trigger shortcut on matching key event', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper });

    const action = vi.fn();

    act(() => {
      result.current.registerShortcut('cmd-k', {
        key: 'k',
        metaKey: true,
        action,
        description: 'Command K',
      });
    });

    // Trigger the shortcut
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(action).toHaveBeenCalled();
  });

  it('should not trigger disabled shortcuts', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper });

    const action = vi.fn();

    act(() => {
      result.current.registerShortcut('disabled-shortcut', {
        key: 'k',
        metaKey: true,
        action,
        description: 'Disabled shortcut',
        enabled: false,
      });
    });

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(action).not.toHaveBeenCalled();
  });

  it('should require modifier keys to match', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper });

    const action = vi.fn();

    act(() => {
      result.current.registerShortcut('shift-k', {
        key: 'k',
        shiftKey: true,
        action,
        description: 'Shift K',
      });
    });

    // Event without shift should not trigger
    const eventWithoutShift = new KeyboardEvent('keydown', {
      key: 'k',
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(eventWithoutShift);
    });

    expect(action).not.toHaveBeenCalled();

    // Event with shift should trigger
    const eventWithShift = new KeyboardEvent('keydown', {
      key: 'k',
      shiftKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(eventWithShift);
    });

    expect(action).toHaveBeenCalled();
  });

  it('should default enabled to true', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      result.current.registerShortcut('auto-enabled', {
        key: 'j',
        metaKey: true,
        action: vi.fn(),
        description: 'Auto enabled',
      });
    });

    const shortcuts = result.current.getShortcuts();
    expect(shortcuts.get('auto-enabled')?.enabled).toBe(true);
  });

  it('should return a copy of shortcuts from getShortcuts', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      result.current.registerShortcut('test', {
        key: 'x',
        action: vi.fn(),
        description: 'Test',
      });
    });

    const shortcuts1 = result.current.getShortcuts();
    const shortcuts2 = result.current.getShortcuts();

    // Should be different objects (copies)
    expect(shortcuts1).not.toBe(shortcuts2);
    // But with same content
    expect(shortcuts1.size).toBe(shortcuts2.size);
  });
});
