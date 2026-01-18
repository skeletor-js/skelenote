/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileAreasView } from '../MobileAreasView';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { BuiltInTypeIds } from '@/lib/types';

vi.mock('@mantine/core', async () => {
  const actual =
    await vi.importActual<typeof import('@mantine/core')>('@mantine/core');
  return {
    ...actual,
    Menu: Object.assign(({ children }: any) => <div>{children}</div>, {
      Target: ({ children }: any) => <div>{children}</div>,
      Dropdown: ({ children }: any) => <div>{children}</div>,
      Label: ({ children }: any) => <div>{children}</div>,
      Item: ({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
      ),
    }),
  };
});

// Mock ResizeObserver
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Hoisted mocks
const mocks = vi.hoisted(() => ({
  navigateToObject: vi.fn(),
  navigateToView: vi.fn(),
  refreshData: vi.fn(),
  confirm: vi.fn(),
  store: {
    getAll: vi.fn(),
    archive: vi.fn(),
  },
}));

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(() => ({
    navigateToObject: mocks.navigateToObject,
    navigateToView: mocks.navigateToView,
  })),
  useObjects: vi.fn(() => ({
    store: mocks.store,
    refreshData: mocks.refreshData,
    isLoading: false,
    dataVersion: 1,
  })),
  useToast: vi.fn(() => ({
    message: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@/hooks', () => ({
  useConfirmDialog: vi.fn(() => ({
    confirm: mocks.confirm,
  })),
  useReducedMotion: vi.fn(() => false),
}));

// Mock Components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, onBack, rightSection }: any) => (
    <div data-testid="mobile-header">
      {title}
      <button onClick={onBack} data-testid="header-back">
        Back
      </button>
      {rightSection}
    </div>
  ),
  PullToRefresh: ({ children, onRefresh }: any) => (
    <div data-testid="pull-to-refresh">
      <button onClick={onRefresh} data-testid="refresh-trigger">
        Refresh
      </button>
      {children}
    </div>
  ),
  HeaderAddButton: ({ onClick, label }: any) => (
    <button onClick={onClick} data-testid="header-add">
      {label}
    </button>
  ),
  SwipeableRow: ({ children, leftActions, rightActions, onPress }: any) => (
    <div data-testid="swipeable-row" onClick={onPress}>
      {children}
      {leftActions.map((a: any) => (
        <button key={a.id} onClick={a.onAction} data-testid={`action-${a.id}`}>
          {a.label}
        </button>
      ))}
      {rightActions.map((a: any) => (
        <button key={a.id} onClick={a.onAction} data-testid={`action-${a.id}`}>
          {a.label}
        </button>
      ))}
    </div>
  ),
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
  BottomSheet: ({ children, opened }: any) =>
    opened ? <div data-testid="bottom-sheet">{children}</div> : null,
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileAreasView', () => {
  const mockAreas = [
    {
      id: 'area-1',
      typeId: BuiltInTypeIds.AREA,
      properties: { name: 'Area A' },
      updatedAt: 1000,
    },
    {
      id: 'area-2',
      typeId: BuiltInTypeIds.AREA,
      properties: { name: 'Area B' },
      updatedAt: 2000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.getAll.mockReturnValue(mockAreas);
  });

  it('renders list of areas', () => {
    renderWithProvider(<MobileAreasView />);
    expect(screen.getByText('Area A')).toBeDefined();
    expect(screen.getByText('Area B')).toBeDefined();
  });

  it('renders empty state when no areas', () => {
    mocks.store.getAll.mockReturnValue([]);
    renderWithProvider(<MobileAreasView />);
    expect(screen.getByTestId('empty-state').textContent).toContain(
      'No areas yet'
    );
  });

  it('filters areas by search query', () => {
    renderWithProvider(<MobileAreasView />);
    const searchInput = screen.getByPlaceholderText('Search areas...');
    fireEvent.change(searchInput, { target: { value: 'Area A' } });

    expect(screen.getByText('Area A')).toBeDefined();
    expect(screen.queryByText('Area B')).toBeNull();
  });

  it('navigates on area press', () => {
    renderWithProvider(<MobileAreasView />);
    fireEvent.click(screen.getByText('Area A'));
    expect(mocks.navigateToObject).toHaveBeenCalledWith('area-1');
  });

  it('handles archive action', async () => {
    mocks.confirm.mockResolvedValue(true);
    renderWithProvider(<MobileAreasView />);

    // Find the archive button (exposed by mocked SwipeableRow)
    // Taking the first one corresponds to Area A
    const archiveButtons = screen.getAllByTestId('action-archive');
    fireEvent.click(archiveButtons[0]);

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled();
      expect(mocks.store.archive).toHaveBeenCalledWith('area-1');
      expect(mocks.refreshData).toHaveBeenCalled();
    });
  });

  it('sorts areas', () => {
    renderWithProvider(<MobileAreasView />);
    // Default is name-asc (Area A, Area B)
    const rows = screen.getAllByTestId('swipeable-row');
    expect(rows[0].textContent).toContain('Area A');
    expect(rows[1].textContent).toContain('Area B');

    // Change sort to updated (Area B is newer)
    // Need to open menu and click option.
    // Component uses Menu from mantine.
    // We need to trigger the menu. The trigger uses ActionIcon with aria-label="Sort options"

    const sortButton = screen.getByLabelText('Sort options');
    fireEvent.click(sortButton);

    const recentlyUpdated = screen.getByText('Recently Updated');
    fireEvent.click(recentlyUpdated);

    const sortedRows = screen.getAllByTestId('swipeable-row');
    expect(sortedRows[0].textContent).toContain('Area B');
    expect(sortedRows[1].textContent).toContain('Area A');
  });

  it('handles refresh', async () => {
    renderWithProvider(<MobileAreasView />);
    fireEvent.click(screen.getByTestId('refresh-trigger'));
    expect(mocks.refreshData).toHaveBeenCalled();
  });
});
