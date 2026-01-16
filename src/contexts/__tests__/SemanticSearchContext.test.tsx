/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SemanticSearchProvider, useSemanticSearch } from '../SemanticSearchContext';
import * as semanticLib from '@/lib/semantic';

// Mock dependencies
const mockEngine = {
    status: 'ready',
    indexedCount: 10,
    onStatusChange: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    indexContent: vi.fn().mockResolvedValue(true),
    disable: vi.fn().mockResolvedValue(undefined),
    rebuildIndex: vi.fn().mockResolvedValue(true),
};

vi.mock('@/lib/semantic', () => ({
    createSemanticEngine: vi.fn(() => mockEngine),
    SemanticEngineStatus: 'ready',
}));

vi.mock('@/hooks/useSemanticIndexSync', () => ({
    useSemanticIndexSync: () => ({
        notifyContentChange: vi.fn(),
        flushContentChanges: vi.fn(),
    }),
}));

describe('SemanticSearchContext', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SemanticSearchProvider>{children}</SemanticSearchProvider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockEngine.onStatusChange.mockReturnValue(() => { });
    });

    it('should initialize with default disabled state', () => {
        const { result } = renderHook(() => useSemanticSearch(), { wrapper });
        expect(result.current.isEnabled).toBe(false);
        expect(result.current.status).toBe('disabled');
    });

    it('should enable semantic search', async () => {
        const { result } = renderHook(() => useSemanticSearch(), { wrapper });

        await act(async () => {
            await result.current.enable([{ content: 'text', objectId: '1', title: 'test' }]);
        });

        expect(semanticLib.createSemanticEngine).toHaveBeenCalledWith({ enabled: true });
        expect(mockEngine.initialize).toHaveBeenCalled();
        expect(mockEngine.indexContent).toHaveBeenCalled();
        expect(result.current.isEnabled).toBe(true);
        expect(localStorage.getItem('skelenote:semanticSearchEnabled')).toBe('true');
    });

    it('should disable semantic search', async () => {
        const { result } = renderHook(() => useSemanticSearch(), { wrapper });

        // Enable first
        await act(async () => {
            await result.current.enable([]);
        });

        await act(async () => {
            await result.current.disable();
        });

        expect(mockEngine.disable).toHaveBeenCalledWith(false);
        expect(result.current.isEnabled).toBe(false);
        expect(localStorage.getItem('skelenote:semanticSearchEnabled')).toBeNull();
    });

    it('should manage threshold', () => {
        const { result } = renderHook(() => useSemanticSearch(), { wrapper });

        act(() => {
            result.current.setThreshold(0.5);
        });

        // It clamps to MAX_THRESHOLD (0.6)
        expect(result.current.threshold).toBe(0.5);

        act(() => {
            result.current.setThreshold(1.0);
        });

        expect(result.current.threshold).toBe(0.6); // MAX_THRESHOLD defined in context is 0.6
    });

    it('should rebuild index', async () => {
        const { result } = renderHook(() => useSemanticSearch(), { wrapper });

        await act(async () => {
            await result.current.enable([]);
        });

        await act(async () => {
            await result.current.rebuildIndex([{ content: 'text', objectId: '1', title: 'test' }]);
        });

        expect(mockEngine.rebuildIndex).toHaveBeenCalled();
    });

    it('should notify content change', () => {
        // This is just a pass-through to the hook mock, but ensures API is exposed
        const { result } = renderHook(() => useSemanticSearch(), { wrapper });
        expect(result.current.notifyContentChange).toBeDefined();
    });
});
