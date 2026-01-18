/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SidebarProvider, useSidebar } from '../SidebarContext';

const STORAGE_KEY = 'skelenote-sidebar-collapsed-sections';

describe('SidebarContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SidebarProvider>{children}</SidebarProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.selectedItem).toBe('inbox');
    expect(result.current.collapsedSections.size).toBe(0);
  });

  it('should set selected item', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => {
      result.current.setSelectedItem('today');
    });
    expect(result.current.selectedItem).toBe('today');
  });

  it('should toggle sections', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.toggleSection('projects');
    });

    expect(result.current.collapsedSections.has('projects')).toBe(true);
    expect(result.current.isSectionCollapsed('projects')).toBe(true);
    expect(result.current.isSectionCollapsed('areas')).toBe(false);

    act(() => {
      result.current.toggleSection('projects');
    });

    expect(result.current.collapsedSections.has('projects')).toBe(false);
  });

  it('should persist collapsed sections to localStorage', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.toggleSection('tags');
    });

    // Verify storage update
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBe('["tags"]');

    // Verify load from storage is handled by mounting a new provider
    // We can't easily unmount/remount in the same test cleanly without separate renderHook calls,
    // effectively simulating app reload

    // Simulating reload:
    const { result: result2 } = renderHook(() => useSidebar(), { wrapper });
    expect(result2.current.collapsedSections.has('tags')).toBe(true);
  });

  it('should handle corrupt localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json');

    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsedSections.size).toBe(0); // Falls back to empty
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSidebar())).toThrow(
      'useSidebar must be used within a SidebarProvider'
    );

    consoleSpy.mockRestore();
  });
});
