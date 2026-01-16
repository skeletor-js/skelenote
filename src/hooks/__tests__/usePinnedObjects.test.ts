/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePinnedObjects } from '../usePinnedObjects';

// Mock dependencies
const mockStore = {
    getPinnedObjects: vi.fn(),
    pin: vi.fn(),
    unpin: vi.fn(),
    reorderPinned: vi.fn(),
    get: vi.fn(),
};

const mockRefreshData = vi.fn();

vi.mock('@/contexts', () => ({
    useObjects: () => ({
        store: mockStore,
        isLoading: false,
        refreshData: mockRefreshData,
        dataVersion: 1,
    }),
}));

describe('usePinnedObjects', () => {
    const obj1 = { id: '1', pinned: true };
    const obj2 = { id: '2', pinned: true };

    beforeEach(() => {
        vi.clearAllMocks();
        mockStore.getPinnedObjects.mockReturnValue([obj1, obj2]);
        mockStore.get.mockImplementation((id) => (id === '1' ? obj1 : { id: '3', pinned: false }));
    });

    describe('queries', () => {
        it('should return pinned objects', () => {
            const { result } = renderHook(() => usePinnedObjects());
            expect(result.current.pinnedObjects).toEqual([obj1, obj2]);
            expect(result.current.count).toBe(2);
        });

        it('should check isPinned', () => {
            const { result } = renderHook(() => usePinnedObjects());
            expect(result.current.isPinned('1')).toBe(true);
            expect(result.current.isPinned('3')).toBe(false);
        });
    });

    describe('mutations', () => {
        it('should pin object', () => {
            const { result } = renderHook(() => usePinnedObjects());

            act(() => {
                result.current.pin('3');
            });

            expect(mockStore.pin).toHaveBeenCalledWith('3');
            expect(mockRefreshData).toHaveBeenCalled();
        });

        it('should unpin object', () => {
            const { result } = renderHook(() => usePinnedObjects());

            act(() => {
                result.current.unpin('1');
            });

            expect(mockStore.unpin).toHaveBeenCalledWith('1');
            expect(mockRefreshData).toHaveBeenCalled();
        });

        it('should toggle pin (pin unpinned)', () => {
            const { result } = renderHook(() => usePinnedObjects());

            act(() => {
                result.current.togglePin('3');
            });

            expect(mockStore.pin).toHaveBeenCalledWith('3');
            expect(mockRefreshData).toHaveBeenCalled();
        });

        it('should toggle pin (unpin pinned)', () => {
            const { result } = renderHook(() => usePinnedObjects());

            act(() => {
                result.current.togglePin('1');
            });

            expect(mockStore.unpin).toHaveBeenCalledWith('1');
            expect(mockRefreshData).toHaveBeenCalled();
        });

        it('should reorder pinned objects', () => {
            const { result } = renderHook(() => usePinnedObjects());
            const order = ['2', '1'];

            act(() => {
                result.current.reorder(order);
            });

            expect(mockStore.reorderPinned).toHaveBeenCalledWith(order);
            expect(mockRefreshData).toHaveBeenCalled();
        });
    });
});
