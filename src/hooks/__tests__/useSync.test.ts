/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSync } from '../useSync';

// Mock context
const mockContext = {
    syncClient: { isConnected: true },
    status: 'connected',
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    reconnect: vi.fn(),
};

vi.mock('@/contexts/SyncContext', () => ({
    useSyncContext: () => mockContext,
}));

describe('useSync', () => {
    it('should return context values', () => {
        const { result } = renderHook(() => useSync());
        expect(result.current.syncClient).toEqual(mockContext.syncClient);
        expect(result.current.status).toBe('connected');
        expect(result.current.isConnected).toBe(true);
    });

    it('should expose controls', () => {
        const { result } = renderHook(() => useSync());

        result.current.connect('url', 'user', 'device');
        expect(mockContext.connect).toHaveBeenCalledWith('url', 'user', 'device');

        result.current.disconnect();
        expect(mockContext.disconnect).toHaveBeenCalled();

        result.current.reconnect();
        expect(mockContext.reconnect).toHaveBeenCalled();
    });
});
