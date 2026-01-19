/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDailyNote } from '..';

// Mock dependencies
const mockStore = {};
const mockRefreshData = vi.fn();

vi.mock('@/contexts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useObjects: () => ({
      store: mockStore,
      isLoading: false,
      refreshData: mockRefreshData,
    }),
  };
});

const mockGetDailyNoteByDate = vi.fn();
const mockGetOrCreateDailyNote = vi.fn();

vi.mock('@/lib/daily', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,

    getDailyNoteByDate: (...args: any[]) => mockGetDailyNoteByDate(...args),

    getOrCreateDailyNote: (...args: any[]) => mockGetOrCreateDailyNote(...args),
  };
});

describe('useDailyNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('querying', () => {
    it('should return null if note does not exist', () => {
      mockGetDailyNoteByDate.mockReturnValue(null);
      const { result } = renderHook(() => useDailyNote());
      expect(result.current.dailyNote).toBeNull();
    });

    it('should return note if exists', () => {
      const note = { id: 'note-1' };
      mockGetDailyNoteByDate.mockReturnValue(note);
      const { result } = renderHook(() => useDailyNote());
      expect(result.current.dailyNote).toBe(note);
    });

    it('should query by specific date', () => {
      const date = new Date(2023, 0, 1);
      renderHook(() => useDailyNote(date));
      expect(mockGetDailyNoteByDate).toHaveBeenCalledWith(mockStore, date);
    });
  });

  describe('ensureExists', () => {
    it('should create note if missing', () => {
      const newNote = { id: 'new-note' };
      mockGetOrCreateDailyNote.mockReturnValue(newNote);

      const { result } = renderHook(() => useDailyNote());

      let note;
      act(() => {
        note = result.current.ensureExists();
      });

      expect(mockGetOrCreateDailyNote).toHaveBeenCalled();
      expect(mockRefreshData).toHaveBeenCalled();
      expect(note).toBe(newNote);
    });
  });
});
