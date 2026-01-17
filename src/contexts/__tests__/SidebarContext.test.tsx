/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SidebarProvider, useSidebar } from '../SidebarContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SidebarContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SidebarProvider>{children}</SidebarProvider>
  );

  it('should throw when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSidebar());
    }).toThrow('useSidebar must be used within a SidebarProvider');

    spy.mockRestore();
  });

  it('should initialize with default selected item', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.selectedItem).toBe('inbox');
  });

  it('should update selected item', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.setSelectedItem('tasks');
    });

    expect(result.current.selectedItem).toBe('tasks');
  });

  it('should set selected item to null', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.setSelectedItem(null);
    });

    expect(result.current.selectedItem).toBeNull();
  });

  it('should toggle section collapsed state', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.isSectionCollapsed('favorites')).toBe(false);

    act(() => {
      result.current.toggleSection('favorites');
    });

    expect(result.current.isSectionCollapsed('favorites')).toBe(true);

    act(() => {
      result.current.toggleSection('favorites');
    });

    expect(result.current.isSectionCollapsed('favorites')).toBe(false);
  });

  it('should track multiple collapsed sections', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.toggleSection('favorites');
      result.current.toggleSection('areas');
    });

    expect(result.current.isSectionCollapsed('favorites')).toBe(true);
    expect(result.current.isSectionCollapsed('areas')).toBe(true);
    expect(result.current.isSectionCollapsed('projects')).toBe(false);
  });

  it('should persist collapsed sections to localStorage', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.toggleSection('favorites');
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should load collapsed sections from localStorage', () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify(['favorites', 'areas'])
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.isSectionCollapsed('favorites')).toBe(true);
    expect(result.current.isSectionCollapsed('areas')).toBe(true);
  });

  it('should handle invalid localStorage data', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');

    // Should not throw
    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.collapsedSections.size).toBe(0);
  });
});
