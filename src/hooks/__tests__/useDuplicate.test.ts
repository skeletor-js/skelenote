/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDuplicate } from '../useDuplicate';

// Mocks
const mockStore = {
  duplicate: vi.fn(),
  duplicateMany: vi.fn(),
  canDuplicate: vi.fn(),
};
const mockRefreshData = vi.fn();
const mockNavigateToObject = vi.fn();
const mockAddToast = vi.fn();
const mockLinkToDaily = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    refreshData: mockRefreshData,
  }),
  useNavigation: () => ({
    navigateToObject: mockNavigateToObject,
  }),
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock('../useLinkToDaily', () => ({
  useLinkToDaily: () => ({
    linkToDaily: mockLinkToDaily,
  }),
}));

describe('useDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should duplicate single object', () => {
    const { result } = renderHook(() => useDuplicate());

    const originalId = 'obj-1';
    const duplicatedObj = { id: 'dup-1', properties: { title: 'Copy' } };

    mockStore.canDuplicate.mockReturnValue(true);
    mockStore.duplicate.mockReturnValue(duplicatedObj);

    act(() => {
      const res = result.current.duplicate(originalId);
      expect(res).toBe(duplicatedObj);
    });

    expect(mockStore.duplicate).toHaveBeenCalledWith(originalId);
    expect(mockLinkToDaily).toHaveBeenCalledWith(duplicatedObj);
    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should refuse to duplicate if store says no', () => {
    const { result } = renderHook(() => useDuplicate());
    mockStore.canDuplicate.mockReturnValue(false);

    act(() => {
      const res = result.current.duplicate('obj-1');
      expect(res).toBeNull();
    });

    expect(mockStore.duplicate).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    );
  });

  it('should handle duplicateMany', () => {
    const { result } = renderHook(() => useDuplicate());
    const ids = ['1', '2'];
    const duplicated = [{ id: 'd1' }, { id: 'd2' }];

    mockStore.duplicateMany.mockReturnValue({ duplicated, errors: [] });

    act(() => {
      result.current.duplicateMany(ids);
    });

    expect(mockStore.duplicateMany).toHaveBeenCalledWith(ids);
    expect(mockLinkToDaily).toHaveBeenCalledTimes(2);
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('2 items'),
      })
    );
    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('should handle duplicate failure', () => {
    const { result } = renderHook(() => useDuplicate());
    mockStore.canDuplicate.mockReturnValue(true);
    mockStore.duplicate.mockImplementation(() => {
      throw new Error('Fail');
    });

    act(() => {
      result.current.duplicate('1');
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Fail' })
    );
  });
});
