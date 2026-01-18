/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

const STORAGE_KEY = 'skelenote-theme';

describe('ThemeContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.clearAllMocks();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should initialize with default light theme (fallback)', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('light');
  });

  it('should respect system preference for dark mode', () => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
  });

  it('should toggle theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light'); // Assuming system mock reset or default

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('light');
  });

  it('should set specific theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should load theme from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
  });

  it('should support render prop pattern for Mantine', () => {
    let injectedProps: any;
    const renderSpy = vi.fn().mockImplementation((props) => {
      injectedProps = props;
      return null;
    });

    // Manually render provider with function child
    renderHook(() => {}, {
      wrapper: () => <ThemeProvider>{renderSpy}</ThemeProvider>,
    });

    expect(renderSpy).toHaveBeenCalled();
    expect(injectedProps.colorScheme).toBe('light'); // default
  });

  it('should throw error used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
    consoleSpy.mockRestore();
  });
});
