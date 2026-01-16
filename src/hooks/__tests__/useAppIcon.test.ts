/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppIcon } from '../useAppIcon';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe('useAppIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_icon_switching_supported') return Promise.resolve(true);
      if (cmd === 'get_available_icons')
        return Promise.resolve([
          { id: 'dark', name: 'Dark' },
          { id: 'light', name: 'Light' },
        ]);
      if (cmd === 'set_app_icon') return Promise.resolve();
      return Promise.resolve();
    });
  });

  it('should initialize with default icon', async () => {
    const { result } = renderHook(() => useAppIcon());
    expect(result.current.currentIcon).toBe('dark');

    // Wait for the effect to finish to avoid act warnings
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });
  });

  it('should load variants and support status on mount', async () => {
    const { result } = renderHook(() => useAppIcon());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
      expect(result.current.variants).toHaveLength(2);
    });
  });

  it('should change icon and persist', async () => {
    const { result } = renderHook(() => useAppIcon());

    // Wait for init first
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await act(async () => {
      await result.current.changeIcon('light');
    });

    expect(mockInvoke).toHaveBeenCalledWith('set_app_icon', {
      iconName: 'light',
    });
    expect(result.current.currentIcon).toBe('light');
    expect(localStorage.getItem('skelenote-app-icon')).toBe('light');
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    // We also expect a warning from the failed init
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    mockInvoke.mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() => useAppIcon());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });

    await act(async () => {
      await result.current.changeIcon('light');
    });

    expect(result.current.error).toBe('Failed');
    expect(result.current.isChanging).toBe(false);

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
