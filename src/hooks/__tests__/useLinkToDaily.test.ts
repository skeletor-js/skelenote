/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLinkToDaily } from '../useLinkToDaily';

// Mock dependencies
const mockStore = {};
const mockRefreshData = vi.fn();

vi.mock('@/contexts', () => ({
    useObjects: () => ({
        store: mockStore,
        refreshData: mockRefreshData,
    }),
}));

vi.mock('@/lib/daily', () => ({
    linkObjectToDaily: vi.fn(),
    isLinkedToToday: vi.fn(),
}));

import { linkObjectToDaily, isLinkedToToday } from '@/lib/daily';

describe('useLinkToDaily', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const object = { id: 'obj1' } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyNote = { id: 'daily1' } as any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(linkObjectToDaily).mockReturnValue(dailyNote);
        vi.mocked(isLinkedToToday).mockReturnValue(false);
    });

    it('should link object to daily note', () => {
        const { result } = renderHook(() => useLinkToDaily());

        let returnedNote;
        act(() => {
            returnedNote = result.current.linkToDaily(object);
        });

        expect(linkObjectToDaily).toHaveBeenCalledWith(mockStore, object);
        expect(mockRefreshData).toHaveBeenCalled();
        expect(returnedNote).toBe(dailyNote);
    });

    it('should check if object is linked', () => {
        vi.mocked(isLinkedToToday).mockReturnValue(true);
        const { result } = renderHook(() => useLinkToDaily());

        expect(result.current.isLinkedToToday(object)).toBe(true);
        expect(isLinkedToToday).toHaveBeenCalledWith(object);
    });
});
