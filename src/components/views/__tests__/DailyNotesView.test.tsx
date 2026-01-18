// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyNotesView } from '../DailyNotesView';
import { MantineProvider } from '@mantine/core';

// Mock hooks
const mockStore = {
  getContent: vi.fn(),
  setContent: vi.fn(),
  delete: vi.fn(),
};
const mockRefreshData = vi.fn();
const mockScheduleSave = vi.fn();
const mockAddToast = vi.fn();
const mockSemanticContext = {
  notifyContentChange: vi.fn(),
  flushContentChanges: vi.fn(),
};
const mockConfirm = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    isLoading: false,
    refreshData: mockRefreshData,
    scheduleSave: mockScheduleSave,
  }),
  useTypeRegistry: () => ({
    get: () => ({ hasContent: true }),
  }),
  useToast: () => ({
    addToast: mockAddToast,
  }),
  useSemanticSearchSafe: () => mockSemanticContext,
  useNavigation: () => ({}), // if used by child components
}));

vi.mock('@/hooks', () => ({
  useConfirmDialog: () => ({
    dialogState: { isOpen: false },
    confirm: mockConfirm,
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
}));

vi.mock('@/lib/daily', () => ({
  getOrCreateDailyNote: vi.fn((_store, date) => ({
    id: `note-${date.toISOString().split('T')[0]}`,
    typeId: 'daily-note',
    properties: { title: 'Daily Note' },
  })),
  getDailyNoteByDate: vi.fn(),
}));

// Mock child components
vi.mock('../WeekStrip', () => ({
  WeekStrip: ({ selectedDate, onDateSelect }: any) => (
    <div data-testid="week-strip">
      Selected: {selectedDate.toISOString()}
      <button onClick={() => onDateSelect(new Date('2025-01-01'))}>
        Select Jan 1
      </button>
    </div>
  ),
}));

vi.mock('@/components/daily/DayTasksSection', () => ({
  DayTasksSection: () => <div data-testid="day-tasks" />,
}));

vi.mock('@/components/daily', () => ({
  DailyNoteHeader: ({ onDelete }: any) => (
    <div data-testid="daily-note-header">
      <button onClick={onDelete}>Delete Note</button>
    </div>
  ),
}));

vi.mock('@/components/editor', () => ({
  Editor: ({ onContentChange }: any) => (
    <textarea
      data-testid="editor"
      onChange={(e) => onContentChange(e.target.value)}
    />
  ),
}));

vi.mock('@/components/object/Backlinks', () => ({
  Backlinks: () => <div data-testid="backlinks" />,
}));

vi.mock('@/components/object/FindSimilar', () => ({
  FindSimilar: () => <div data-testid="find-similar" />,
}));

vi.mock('@/components/ui', () => ({
  ViewHeader: ({ title }: any) => <h1>{title}</h1>,
  ConfirmDialog: () => <div data-testid="confirm-dialog" />,
}));

describe('DailyNotesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    mockStore.getContent.mockReturnValue('Initial Content');
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <DailyNotesView />
      </MantineProvider>
    );
  };

  it('should render main view components', () => {
    renderView();
    expect(screen.getByText('Daily Notes')).toBeTruthy();
    expect(screen.getByTestId('week-strip')).toBeTruthy();
    expect(screen.getByTestId('daily-note-header')).toBeTruthy();
    expect(screen.getByTestId('editor')).toBeTruthy();
    expect(screen.getByTestId('backlinks')).toBeTruthy();
    expect(screen.getByTestId('find-similar')).toBeTruthy();
  });

  it('should handle content changes', () => {
    renderView();
    const editor = screen.getByTestId('editor');
    fireEvent.change(editor, { target: { value: 'New Content' } });

    expect(mockStore.setContent).toHaveBeenCalled();
    // note id is dynamic based on date, just checking call
    expect(mockScheduleSave).toHaveBeenCalled();
    expect(mockSemanticContext.notifyContentChange).toHaveBeenCalled();
  });

  it('should handle date selection', () => {
    renderView();
    const selectBtn = screen.getByText('Select Jan 1');
    fireEvent.click(selectBtn);

    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('should handle delete flow', async () => {
    mockConfirm.mockResolvedValue(true);
    renderView();

    const deleteBtn = screen.getByText('Delete Note');
    fireEvent.click(deleteBtn);

    // Wait for async confirmation
    await vi.waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    expect(mockStore.delete).toHaveBeenCalled();
    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should flush semantic index on unmount', () => {
    const { unmount } = renderView();
    unmount();
    expect(mockSemanticContext.flushContentChanges).toHaveBeenCalled();
  });
});
