/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Store for mock localStorage
let mockStore: Record<string, string> = {};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStore[key];
  }),
  clear: vi.fn(() => {
    mockStore = {};
  }),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia - default to light mode preference
let prefersDark = false;
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: query === '(prefers-color-scheme: dark)' && prefersDark,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', { value: matchMediaMock });

describe('ThemeContext', () => {
  beforeEach(() => {
    // Reset storage before each test
    mockStore = {};
    prefersDark = false;
    vi.clearAllMocks();
    document.documentElement.setAttribute('data-theme', 'light');
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  it('should throw when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    spy.mockRestore();
  });

  it('should initialize with light theme by default', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
  });

  it('should load theme from localStorage', () => {
    mockStore['skelenote-theme'] = 'dark';

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
  });

  it('should set theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should toggle theme', () => {
    // Ensure we start with light theme
    mockStore = {};
    prefersDark = false;

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Verify initial state
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
  });

  it('should persist theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'skelenote-theme',
      'dark'
    );
  });

  it('should apply theme to document', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should use OS preference when no localStorage value', () => {
    // Set OS preference to dark
    prefersDark = true;

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
  });

  it('should support render prop pattern', () => {
    // Ensure light theme
    mockStore = {};
    prefersDark = false;

    let receivedColorScheme: string | undefined;

    const TestComponent = () => (
      <ThemeProvider>
        {({ colorScheme }) => {
          receivedColorScheme = colorScheme;
          return <div>Theme: {colorScheme}</div>;
        }}
      </ThemeProvider>
    );

    render(<TestComponent />);

    expect(receivedColorScheme).toBe('light');
  });
});
