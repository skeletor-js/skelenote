/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '../useNotifications';


// Mocks
const mockCheckPermission = vi.fn();
const mockRequestPermission = vi.fn();
const mockRescheduleAll = vi.fn();
const mockSyncReminder = vi.fn();
const mockCancelReminder = vi.fn();

vi.mock('@/lib/notifications', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkNotificationPermission: (...args: any[]) => mockCheckPermission(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestNotificationPermission: (...args: any[]) =>
    mockRequestPermission(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rescheduleAllReminders: (...args: any[]) => mockRescheduleAll(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  syncTaskReminder: (...args: any[]) => mockSyncReminder(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cancelReminder: (...args: any[]) => mockCancelReminder(...args),
}));

const mockIsMobile = vi.fn();

vi.mock('../usePlatform', () => ({
  usePlatform: () => ({ isMobile: mockIsMobile() }),
}));

const mockStore = {
  getByType: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useObjects: () => ({ store: mockStore }),
}));

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile.mockReturnValue(true); // Default to mobile
    mockCheckPermission.mockResolvedValue(false);
    mockStore.getByType.mockReturnValue([]);
  });

  it('should be available only on mobile', () => {
    mockIsMobile.mockReturnValue(false);
    const { result } = renderHook(() => useNotifications());
    expect(result.current.isAvailable).toBe(false);
  });

  it('should check permission on mount', async () => {
    mockCheckPermission.mockResolvedValue(true);
    const { result } = renderHook(() => useNotifications());

    // permissions check is async in useEffect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.hasPermission).toBe(true);
  });

  it('should request permission', async () => {
    mockRequestPermission.mockResolvedValue(true);
    const { result } = renderHook(() => useNotifications());

    let granted;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(true);
    expect(mockRequestPermission).toHaveBeenCalled();
    expect(result.current.hasPermission).toBe(true);
  });

  it('should sync reminder', async () => {
    const { result } = renderHook(() => useNotifications());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = { id: '1' } as any;

    await act(async () => {
      await result.current.syncReminder(task);
    });

    expect(mockSyncReminder).toHaveBeenCalledWith(task);
  });
});
