/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShareHandler } from '..';
import { BuiltInTypeIds } from '@/lib/types';

// Mock dependencies
const mockStore = {
  create: vi.fn(),
};

const mockRefreshData = vi.fn();
const mockAddToast = vi.fn();
const mockIsMobile = vi.fn();

vi.mock('../platform/usePlatform', () => ({
  usePlatform: () => ({ isMobile: mockIsMobile() }),
}));

vi.mock('@/contexts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useObjects: () => ({ store: mockStore, refreshData: mockRefreshData }),
    useToast: () => ({ addToast: mockAddToast }),
  };
});

const { mockGetPendingShares, mockClearPendingShares } = vi.hoisted(() => ({
  mockGetPendingShares: vi.fn(),
  mockClearPendingShares: vi.fn(),
}));

vi.mock('@/lib/share', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getPendingShares: mockGetPendingShares,
    clearPendingShares: mockClearPendingShares,
    isUrl: (text: string) => text.startsWith('http'),
    extractTitleFromUrl: () => 'Extracted Title',
  };
});

describe('useShareHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile.mockReturnValue(true);
    mockGetPendingShares.mockResolvedValue([]);
  });

  it('should do nothing on non-mobile', async () => {
    mockIsMobile.mockReturnValue(false);
    renderHook(() => useShareHandler());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(mockGetPendingShares).not.toHaveBeenCalled();
  });

  it('should check pending shares on mount (mobile)', async () => {
    renderHook(() => useShareHandler());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(mockGetPendingShares).toHaveBeenCalled();
  });

  it('should process URL share', async () => {
    mockGetPendingShares.mockResolvedValue([
      { type: 'url', url: 'https://example.com' },
    ]);

    renderHook(() => useShareHandler());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.LINK,
        properties: {
          url: 'https://example.com',
          title: 'Extracted Title',
        },
      })
    );
    expect(mockClearPendingShares).toHaveBeenCalled();
    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should process Text share (Note)', async () => {
    mockGetPendingShares.mockResolvedValue([
      { type: 'text', text: 'Some text content' },
    ]);

    renderHook(() => useShareHandler());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.NOTE,
        properties: {
          title: 'Some text content',
        },
        withContent: true,
      })
    );
  });

  it('should process Text share as Link if it is a URL', async () => {
    mockGetPendingShares.mockResolvedValue([
      { type: 'text', text: 'http://example.com' },
    ]);

    renderHook(() => useShareHandler());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.LINK,
        properties: expect.objectContaining({
          url: 'http://example.com',
        }),
      })
    );
  });
});
