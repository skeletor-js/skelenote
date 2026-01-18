// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileSavedViewsView } from '../MobileSavedViewsView';
import { MantineProvider } from '@mantine/core';

// Mock ResizeObserver (required for Mantine ScrollArea)
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

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

// Mocks
const mockNavigateToView = vi.fn();
const mockNavigateToSavedView = vi.fn();
const mockRefreshData = vi.fn();
const mockConfirm = vi.fn();

const mockSavedViews = {
  views: [] as unknown[],
  deleteView: vi.fn(),
  createView: vi.fn(),
  updateView: vi.fn(),
  isLoading: false,
};

vi.mock('@/contexts', () => ({
  useNavigation: () => ({
    navigateToView: mockNavigateToView,
    navigateToSavedView: mockNavigateToSavedView,
  }),
  useObjects: () => ({
    refreshData: mockRefreshData,
  }),
}));

vi.mock('@/hooks', () => ({
  useSavedViews: () => mockSavedViews,
  useConfirmDialog: () => ({
    confirm: mockConfirm,
  }),
}));

// Mock child components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, rightSection }: any) => (
    <div>
      <h1>{title}</h1>
      {rightSection}
    </div>
  ),
  PullToRefresh: ({ children, onRefresh }: any) => (
    <div>
      <button onClick={onRefresh}>Refresh</button>
      {children}
    </div>
  ),
  HeaderAddButton: ({ onClick, label }: any) => (
    <button onClick={onClick}>{label}</button>
  ),
  SwipeableRow: ({ children, rightActions, leftActions, onLongPress }: any) => (
    <div
      data-testid="swipeable-row"
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
    >
      {children}
      <div className="actions">
        {rightActions &&
          rightActions.map((action: any) => (
            <button key={action.id} onClick={action.onAction}>
              {action.label}
            </button>
          ))}
        {leftActions &&
          leftActions.map((action: any) => (
            <button key={action.id} onClick={action.onAction}>
              {action.label}
            </button>
          ))}
      </div>
    </div>
  ),
  ActionSheet: ({ opened, actions }: any) =>
    opened ? (
      <div data-testid="action-sheet">
        {actions.map((a: any) => (
          <button key={a.id} onClick={a.onAction}>
            {a.label}
          </button>
        ))}
      </div>
    ) : null,
}));

vi.mock('../../sheets', () => ({
  SavedViewEditorSheet: ({ opened, onCreate, onUpdate, view }: any) =>
    opened ? (
      <div data-testid="editor-sheet">
        <button
          onClick={() =>
            view
              ? onUpdate(view.id, 'New Name', 'icon')
              : onCreate({ name: 'New View' })
          }
        >
          Save View
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span>Icon:{name}</span>,
  type: {},
}));

const mockView1 = {
  id: 'view1',
  name: 'My View',
  icon: 'star',
  filters: [],
  sort: { field: 'updatedAt', direction: 'desc' as const },
};

describe('MobileSavedViewsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSavedViews.views = [mockView1];
    mockSavedViews.isLoading = false;
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <MobileSavedViewsView />
      </MantineProvider>
    );
  };

  it('renders loading state', () => {
    mockSavedViews.isLoading = true;
    renderView();
    expect(screen.getByText('Saved Views')).toBeTruthy();
  });

  it('renders list of views', () => {
    renderView();
    expect(screen.getByText('My View')).toBeTruthy();
    expect(screen.getByText('0 filters')).toBeTruthy();
  });

  it('renders empty state', () => {
    mockSavedViews.views = [];
    renderView();
    expect(screen.getByText('No saved views yet')).toBeTruthy();
  });

  it('navigates on click', () => {
    renderView();
    fireEvent.click(screen.getByText('My View'));
    expect(mockNavigateToSavedView).toHaveBeenCalledWith('view1');
  });

  it('filters by search', () => {
    const mockView2 = { ...mockView1, id: 'view2', name: 'Another One' };
    mockSavedViews.views = [mockView1, mockView2];

    renderView();
    expect(screen.getByText('My View')).toBeTruthy();
    expect(screen.getByText('Another One')).toBeTruthy();

    const searchInput = screen.getByPlaceholderText('Search saved views...');
    fireEvent.change(searchInput, { target: { value: 'Another' } });

    expect(screen.queryByText('My View')).toBeNull();
    expect(screen.getByText('Another One')).toBeTruthy();
  });

  it('handles create view flow', () => {
    renderView();
    fireEvent.click(screen.getByText('New view'));
    expect(screen.getByTestId('editor-sheet')).toBeTruthy();

    fireEvent.click(screen.getByText('Save View'));
    expect(mockSavedViews.createView).toHaveBeenCalled();
  });

  it('handles delete view flow', async () => {
    mockConfirm.mockResolvedValue(true);
    renderView();

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockSavedViews.deleteView).toHaveBeenCalledWith('view1');
    });
  });

  it('handles edit view flow via swipe', () => {
    renderView();
    const editBtn = screen.getByText('Edit'); // Rendered by Left actions mock
    fireEvent.click(editBtn);

    expect(screen.getByTestId('editor-sheet')).toBeTruthy();
    fireEvent.click(screen.getByText('Save View'));
    expect(mockSavedViews.updateView).toHaveBeenCalledWith('view1', {
      name: 'New Name',
      icon: 'icon',
    });
  });

  it('handles edit flow via long press (open action sheet)', () => {
    renderView();
    fireEvent.contextMenu(screen.getByTestId('swipeable-row'));

    expect(screen.getByTestId('action-sheet')).toBeTruthy();
    // Action sheet has "Edit View" button from code
    fireEvent.click(screen.getByText('Edit View'));

    expect(screen.getByTestId('editor-sheet')).toBeTruthy();
  });
});
