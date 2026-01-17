/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastContext';

describe('ToastContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ToastProvider>{children}</ToastProvider>
  );

  it('should throw when used outside provider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');

    spy.mockRestore();
  });

  it('should initialize with empty toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast and return id', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let toastId: string;
    act(() => {
      toastId = result.current.addToast({
        type: 'success',
        message: 'Test toast',
      });
    });

    expect(toastId!).toBeDefined();
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test toast');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should add multiple toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({ type: 'success', message: 'Toast 1' });
      result.current.addToast({ type: 'error', message: 'Toast 2' });
      result.current.addToast({ type: 'info', message: 'Toast 3' });
    });

    expect(result.current.toasts).toHaveLength(3);
  });

  it('should remove a toast by id', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let toastId: string;
    act(() => {
      toastId = result.current.addToast({
        type: 'info',
        message: 'To be removed',
      });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.removeToast(toastId!);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should clear all toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({ type: 'success', message: 'Toast 1' });
      result.current.addToast({ type: 'error', message: 'Toast 2' });
      result.current.addToast({ type: 'warning', message: 'Toast 3' });
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should preserve toast with action', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    const onClick = vi.fn();

    act(() => {
      result.current.addToast({
        type: 'info',
        message: 'With action',
        action: {
          label: 'Undo',
          onClick,
        },
      });
    });

    expect(result.current.toasts[0].action).toBeDefined();
    expect(result.current.toasts[0].action?.label).toBe('Undo');

    // Execute the action
    result.current.toasts[0].action?.onClick();
    expect(onClick).toHaveBeenCalled();
  });

  it('should preserve toast duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({
        type: 'success',
        message: 'With duration',
        duration: 5000,
      });
    });

    expect(result.current.toasts[0].duration).toBe(5000);
  });

  it('should generate unique ids for each toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id1: string, id2: string, id3: string;

    act(() => {
      id1 = result.current.addToast({ type: 'info', message: '1' });
      id2 = result.current.addToast({ type: 'info', message: '2' });
      id3 = result.current.addToast({ type: 'info', message: '3' });
    });

    expect(id1!).not.toBe(id2!);
    expect(id2!).not.toBe(id3!);
    expect(id1!).not.toBe(id3!);
  });
});
