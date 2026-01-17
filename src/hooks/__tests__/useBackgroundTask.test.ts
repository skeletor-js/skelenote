/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackgroundTask } from '../useBackgroundTask';

// Mock Tauri's invoke
vi.mock('@tauri-apps/api/core', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    invoke: vi.fn(),
  };
});

// Mock usePlatform
vi.mock('../usePlatform', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    usePlatform: vi.fn(() => ({
      isMobile: true,
      isIOS: true,
      isAndroid: false,
      isDesktop: false,
      platform: 'ios',
    })),
  };
});

import { invoke } from '@tauri-apps/api/core';
import { usePlatform } from '../usePlatform';

describe('useBackgroundTask', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(usePlatform).mockReturnValue({
      isMobile: true,
      isIOS: true,
      isAndroid: false,
      isDesktop: false,
      isMacOS: false,
      isWindows: false,
      isLinux: false,
      platform: 'ios',
      windowControlsHeight: 0,
      windowControlsWidth: 0,
      safeAreaTop: 47,
      safeAreaBottom: 34,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('beginTask', () => {
    it('should begin a background task on iOS', async () => {
      vi.mocked(invoke).mockResolvedValue(123);
      const { result } = renderHook(() => useBackgroundTask());

      let taskId: number | null = null;
      await act(async () => {
        taskId = await result.current.beginTask();
      });

      expect(taskId).toBe(123);
      expect(invoke).toHaveBeenCalledWith('begin_background_task');
    });

    it('should return null when task ID is 0 (UIBackgroundTaskInvalid)', async () => {
      vi.mocked(invoke).mockResolvedValue(0);
      const { result } = renderHook(() => useBackgroundTask());

      let taskId: number | null = null;
      await act(async () => {
        taskId = await result.current.beginTask();
      });

      expect(taskId).toBeNull();
    });

    it('should return existing task ID if task already active', async () => {
      vi.mocked(invoke).mockResolvedValue(456);
      const { result } = renderHook(() => useBackgroundTask());

      // Start first task
      await act(async () => {
        await result.current.beginTask();
      });

      // Try to start another
      let secondTaskId: number | null = null;
      await act(async () => {
        secondTaskId = await result.current.beginTask();
      });

      expect(secondTaskId).toBe(456);
      // invoke should only be called once for the first task
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('should return null on desktop', async () => {
      vi.mocked(usePlatform).mockReturnValue({
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isMacOS: true,
        isWindows: false,
        isLinux: false,
        platform: 'macos',
        windowControlsHeight: 32,
        windowControlsWidth: 80,
        safeAreaTop: 0,
        safeAreaBottom: 0,
      });

      const { result } = renderHook(() => useBackgroundTask());

      let taskId: number | null = null;
      await act(async () => {
        taskId = await result.current.beginTask();
      });

      expect(taskId).toBeNull();
      expect(invoke).not.toHaveBeenCalled();
    });

    it('should return null on Android', async () => {
      vi.mocked(usePlatform).mockReturnValue({
        isMobile: true,
        isIOS: false,
        isAndroid: true,
        isDesktop: false,
        isMacOS: false,
        isWindows: false,
        isLinux: false,
        platform: 'android',
        windowControlsHeight: 0,
        windowControlsWidth: 0,
        safeAreaTop: 24,
        safeAreaBottom: 0,
      });

      const { result } = renderHook(() => useBackgroundTask());

      let taskId: number | null = null;
      await act(async () => {
        taskId = await result.current.beginTask();
      });

      expect(taskId).toBeNull();
      expect(invoke).not.toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Native error'));
      const { result } = renderHook(() => useBackgroundTask());

      let taskId: number | null = null;
      await act(async () => {
        taskId = await result.current.beginTask();
      });

      expect(taskId).toBeNull();
    });
  });

  describe('endTask', () => {
    it('should end a background task with provided ID', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useBackgroundTask());

      await act(async () => {
        await result.current.endTask(789);
      });

      expect(invoke).toHaveBeenCalledWith('end_background_task', {
        taskId: 789,
      });
    });

    it('should end the current task if no ID provided', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(111) // beginTask
        .mockResolvedValueOnce(undefined); // endTask

      const { result } = renderHook(() => useBackgroundTask());

      // Start a task first
      await act(async () => {
        await result.current.beginTask();
      });

      // End without specifying ID
      await act(async () => {
        await result.current.endTask();
      });

      expect(invoke).toHaveBeenCalledWith('end_background_task', {
        taskId: 111,
      });
    });

    it('should not call invoke if no active task', async () => {
      const { result } = renderHook(() => useBackgroundTask());

      await act(async () => {
        await result.current.endTask();
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it('should do nothing on desktop', async () => {
      vi.mocked(usePlatform).mockReturnValue({
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isMacOS: true,
        isWindows: false,
        isLinux: false,
        platform: 'macos',
        windowControlsHeight: 32,
        windowControlsWidth: 80,
        safeAreaTop: 0,
        safeAreaBottom: 0,
      });

      const { result } = renderHook(() => useBackgroundTask());

      await act(async () => {
        await result.current.endTask(123);
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it('should clear task ref even on error', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(100)
        .mockRejectedValueOnce(new Error('Native error'));

      const { result } = renderHook(() => useBackgroundTask());

      // Start a task
      await act(async () => {
        await result.current.beginTask();
      });

      // Try to end (will fail)
      await act(async () => {
        await result.current.endTask(100);
      });

      // Task should no longer be active
      expect(result.current.isTaskActive()).toBe(false);
    });
  });

  describe('isTaskActive', () => {
    it('should return false initially', () => {
      const { result } = renderHook(() => useBackgroundTask());
      expect(result.current.isTaskActive()).toBe(false);
    });

    it('should return true after beginTask', async () => {
      vi.mocked(invoke).mockResolvedValue(222);
      const { result } = renderHook(() => useBackgroundTask());

      await act(async () => {
        await result.current.beginTask();
      });

      expect(result.current.isTaskActive()).toBe(true);
    });

    it('should return false after endTask', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(333)
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useBackgroundTask());

      await act(async () => {
        await result.current.beginTask();
      });
      expect(result.current.isTaskActive()).toBe(true);

      await act(async () => {
        await result.current.endTask(333);
      });
      expect(result.current.isTaskActive()).toBe(false);
    });
  });

  describe('getCurrentTaskId', () => {
    it('should return null initially', () => {
      const { result } = renderHook(() => useBackgroundTask());
      expect(result.current.getCurrentTaskId()).toBeNull();
    });

    it('should return task ID after beginTask', async () => {
      vi.mocked(invoke).mockResolvedValue(444);
      const { result } = renderHook(() => useBackgroundTask());

      await act(async () => {
        await result.current.beginTask();
      });

      expect(result.current.getCurrentTaskId()).toBe(444);
    });

    it('should return null after endTask', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(555)
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useBackgroundTask());

      await act(async () => {
        await result.current.beginTask();
      });

      await act(async () => {
        await result.current.endTask(555);
      });

      expect(result.current.getCurrentTaskId()).toBeNull();
    });
  });
});
