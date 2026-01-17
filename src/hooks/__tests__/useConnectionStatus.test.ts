/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConnectionStatus } from '../useConnectionStatus';

// Mock SyncContext
const mockContext = {
  status: 'connected' as const,
  isConnected: true,
  isSyncing: false,
  isOnline: true,
  pendingCount: 0,
};

vi.mock('@/contexts/SyncContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useSyncContext: () => mockContext,
  };
});

describe('useConnectionStatus', () => {
  it('should return connection status from context', () => {
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.pendingCount).toBe(0);
  });

  it('should reflect disconnected state', () => {
    // Temporarily update mock
    const originalStatus = mockContext.status;
    const originalConnected = mockContext.isConnected;

    (mockContext as any).status = 'disconnected';
    mockContext.isConnected = false;

    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);

    // Restore

    (mockContext as any).status = originalStatus;
    mockContext.isConnected = originalConnected;
  });

  it('should reflect pending count', () => {
    mockContext.pendingCount = 5;

    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.pendingCount).toBe(5);

    // Restore
    mockContext.pendingCount = 0;
  });

  it('should reflect syncing state', () => {
    mockContext.isSyncing = true;

    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isSyncing).toBe(true);

    // Restore
    mockContext.isSyncing = false;
  });
});
