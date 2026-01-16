/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArchive } from '../useArchive';

// Mock dependencies
const mockStore = {
    getArchived: vi.fn(),
    unarchive: vi.fn(),
    getAll: vi.fn(),
    getContent: vi.fn(),
    setContent: vi.fn(),
    delete: vi.fn(),
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

vi.mock('@/lib/editor', () => ({
    removeMentionsFromContent: vi.fn(),
}));

import { removeMentionsFromContent } from '@/lib/editor';

describe('useArchive', () => {
    const item1 = { id: '1', updatedAt: 100, title: 'Item 1' };
    const item2 = { id: '2', updatedAt: 200, title: 'Item 2' };

    beforeEach(() => {
        vi.clearAllMocks();
        mockStore.getArchived.mockReturnValue([item1, item2]);
        mockStore.getAll.mockReturnValue([]);
    });

    it('should return sorted archived items', () => {
        const { result } = renderHook(() => useArchive());

        // Should be sorted by updatedAt desc
        expect(result.current.items).toEqual([item2, item1]);
        expect(result.current.count).toBe(2);
    });

    it('should unarchive item', () => {
        const { result } = renderHook(() => useArchive());

        act(() => {
            result.current.unarchiveItem('1');
        });

        expect(mockStore.unarchive).toHaveBeenCalledWith('1');
        expect(mockRefreshData).toHaveBeenCalled();
    });

    describe('deleteItem', () => {
        it('should delete item and clean up mentions', () => {
            const otherObj = { id: 'other', properties: {} };
            mockStore.getAll.mockReturnValue([otherObj, { id: '1' }]); // include self to verify skip logic
            mockStore.getContent.mockReturnValue('content with mention');
            vi.mocked(removeMentionsFromContent).mockReturnValue('cleaned content');

            const { result } = renderHook(() => useArchive());

            act(() => {
                result.current.deleteItem('1');
            });

            // Verification
            expect(mockStore.getAll).toHaveBeenCalledWith({ includeArchived: true });
            expect(mockStore.getContent).toHaveBeenCalledWith('other');
            expect(removeMentionsFromContent).toHaveBeenCalledWith('content with mention', '1');
            expect(mockStore.setContent).toHaveBeenCalledWith('other', 'cleaned content');
            expect(mockStore.delete).toHaveBeenCalledWith('1');
            expect(mockRefreshData).toHaveBeenCalled();
        });

        it('should skip cleanup if no content change', () => {
            const otherObj = { id: 'other' };
            mockStore.getAll.mockReturnValue([otherObj]);
            mockStore.getContent.mockReturnValue('content');
            vi.mocked(removeMentionsFromContent).mockReturnValue(null); // No change

            const { result } = renderHook(() => useArchive());

            act(() => {
                result.current.deleteItem('1');
            });

            expect(mockStore.setContent).not.toHaveBeenCalled();
            expect(mockStore.delete).toHaveBeenCalledWith('1');
        });
    });
});
