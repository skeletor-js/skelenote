/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileArchiveView } from '../MobileArchiveView';
import { MantineProvider } from '@mantine/core';
import React from 'react';

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
  unarchiveItem: vi.fn(),
  deleteItem: vi.fn(),
  showDeleteUndo: vi.fn(),
}));

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(() => ({
    navigateToObject: mocks.navigateToObject,
    navigateToView: mocks.navigateToView,
  })),
  useObjects: vi.fn(() => ({
    refreshData: mocks.refreshData,
  })),
}));

vi.mock('@/hooks', () => ({
  useArchive: vi.fn(() => ({
    items: [],
    isLoading: false,
    count: 0,
    unarchiveItem: mocks.unarchiveItem,
    deleteItem: mocks.deleteItem,
  })),
  useConfirmDialog: vi.fn(() => ({
    confirm: mocks.confirm,
  })),
  useUndoToast: vi.fn(() => ({
    showDeleteUndo: mocks.showDeleteUndo,
  })),
  useReducedMotion: vi.fn(() => false),
}));

// Mock Components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, onBack }: any) => (
    <div data-testid="mobile-header">
      {title}
      <button onClick={onBack} data-testid="header-back">
        Back
      </button>
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
  ActionSheet: ({ opened, title, actions }: any) =>
    opened ? (
      <div data-testid="action-sheet">
        {title}
        {actions.map((a: any) => (
          <button
            key={a.id}
            onClick={a.onAction}
            data-testid={`action-${a.id}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    ) : null,
}));

vi.mock('../../rows', () => ({
  MobileArchiveRow: ({
    item,
    onPress,
    onLongPress,
    onRestore,
    onDelete,
  }: any) => (
    <div
      data-testid={`archive-row-${item.id}`}
      onClick={onPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
    >
      {item.properties.title}
      <button
        onClick={() => onRestore(item.id)}
        data-testid={`restore-${item.id}`}
      >
        Restore
      </button>
      <button
        onClick={() => onDelete(item.id)}
        data-testid={`delete-${item.id}`}
      >
        Delete
      </button>
    </div>
  ),
}));

import { useArchive } from '@/hooks';

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileArchiveView', () => {
  const today = new Date('2024-01-01T12:00:00'); // Monday

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(today);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders empty state', () => {
    (useArchive as any).mockReturnValue({
      items: [],
      isLoading: false,
      count: 0,
      unarchiveItem: mocks.unarchiveItem,
      deleteItem: mocks.deleteItem,
    });
    renderWithProvider(<MobileArchiveView />);
    expect(screen.getByText('No archived items')).toBeDefined();
  });

  it('renders grouped items', () => {
    const items = [
      {
        id: '1',
        properties: { title: 'Today Item' },
        updatedAt: today.getTime(),
      },
      {
        id: '2',
        properties: { title: 'Yesterday Item' },
        updatedAt: today.getTime() - 86400000,
      },
      {
        id: '3',
        properties: { title: 'Older Item' },
        updatedAt: today.getTime() - 86400000 * 10,
      },
    ];
    (useArchive as any).mockReturnValue({
      items,
      isLoading: false,
      count: 3,
      unarchiveItem: mocks.unarchiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileArchiveView />);
    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Today Item')).toBeDefined();
    expect(screen.getByText('Yesterday')).toBeDefined();
    expect(screen.getByText('Yesterday Item')).toBeDefined();
    expect(screen.getByText('Older')).toBeDefined();
    expect(screen.getByText('Older Item')).toBeDefined();
  });

  it('filters items', () => {
    const items = [
      { id: '1', properties: { title: 'Find Me' }, updatedAt: today.getTime() },
      { id: '2', properties: { title: 'Hide Me' }, updatedAt: today.getTime() },
    ];
    (useArchive as any).mockReturnValue({
      items,
      isLoading: false,
      count: 2,
      unarchiveItem: mocks.unarchiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileArchiveView />);
    const searchInput = screen.getByPlaceholderText('Search archived items...');
    fireEvent.change(searchInput, { target: { value: 'Find' } });

    expect(screen.getByText('Find Me')).toBeDefined();
    expect(screen.queryByText('Hide Me')).toBeNull();
  });

  it('handles restore', () => {
    const items = [
      { id: '1', properties: { title: 'Item 1' }, updatedAt: today.getTime() },
    ];
    (useArchive as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      unarchiveItem: mocks.unarchiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileArchiveView />);
    fireEvent.click(screen.getByTestId('restore-1'));
    expect(mocks.unarchiveItem).toHaveBeenCalledWith('1');
  });

  it('handles delete with confirmation', async () => {
    const items = [
      { id: '1', properties: { title: 'Item 1' }, updatedAt: today.getTime() },
    ];
    (useArchive as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      unarchiveItem: mocks.unarchiveItem,
      deleteItem: mocks.deleteItem,
    });
    mocks.confirm.mockResolvedValue(true);

    renderWithProvider(<MobileArchiveView />);
    fireEvent.click(screen.getByTestId('delete-1'));

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled();
      expect(mocks.deleteItem).toHaveBeenCalledWith('1');
      expect(mocks.showDeleteUndo).toHaveBeenCalled();
    });
  });

  it('handles long press action sheet', async () => {
    const items = [
      { id: '1', properties: { title: 'Item 1' }, updatedAt: today.getTime() },
    ];
    (useArchive as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      unarchiveItem: mocks.unarchiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileArchiveView />);
    fireEvent.contextMenu(screen.getByTestId('archive-row-1'));

    expect(screen.getByTestId('action-sheet')).toBeDefined();
    expect(screen.getByTestId('action-restore')).toBeDefined();
    expect(screen.getByTestId('action-delete')).toBeDefined();

    // Perform restore from sheet
    fireEvent.click(screen.getByTestId('action-restore'));
    expect(mocks.unarchiveItem).toHaveBeenCalledWith('1');
  });

  it('navigates on item click', () => {
    const items = [
      { id: '1', properties: { title: 'Item 1' }, updatedAt: today.getTime() },
    ];
    (useArchive as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      unarchiveItem: mocks.unarchiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileArchiveView />);
    fireEvent.click(screen.getByTestId('archive-row-1'));
    expect(mocks.navigateToObject).toHaveBeenCalledWith('1');
  });

  it('handles pull to refresh', () => {
    (useArchive as any).mockReturnValue({
      items: [],
      isLoading: false,
      count: 0,
      unarchiveItem: mocks.unarchiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileArchiveView />);
    fireEvent.click(screen.getByTestId('refresh-trigger'));
    expect(mocks.refreshData).toHaveBeenCalled();
  });
});
