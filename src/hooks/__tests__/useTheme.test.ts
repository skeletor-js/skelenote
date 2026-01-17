/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from '../useTheme';

// Mock ThemeContext
const mockUseTheme = vi.fn().mockReturnValue({
  theme: 'light',
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
});

vi.mock('@/contexts/ThemeContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useTheme: () => mockUseTheme(),
  };
});

describe('useTheme', () => {
  it('should re-export useTheme from ThemeContext', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(typeof result.current.toggleTheme).toBe('function');
  });

  it('should return dark color scheme when context provides it', () => {
    mockUseTheme.mockReturnValueOnce({
      theme: 'dark',
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });
});
