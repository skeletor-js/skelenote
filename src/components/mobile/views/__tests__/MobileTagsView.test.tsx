/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileTagsView } from '../MobileTagsView';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { BuiltInTypeIds } from '@/lib/types';

// Mock specific mantine components
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
    delete: vi.fn(),
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
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileTagsView', () => {
  const mockTags = [
    {
      id: 'tag-1',
      typeId: BuiltInTypeIds.TAG,
      properties: { name: 'Tag A', color: 'blue' },
      updatedAt: 1000,
    },
    {
      id: 'tag-2',
      typeId: BuiltInTypeIds.TAG,
      properties: { name: 'Tag B', color: 'red' },
      updatedAt: 2000,
    },
  ];

  // Objects using tags to calculate usage
  const mockObjects = [
    ...mockTags,
    { id: 'obj-1', properties: { tags: ['tag-2'] } },
    { id: 'obj-2', properties: { tags: ['tag-2'] } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.getAll.mockReturnValue(mockObjects);
  });

  it('renders list of tags', () => {
    renderWithProvider(<MobileTagsView />);
    expect(screen.getByText('Tag A')).toBeDefined();
    expect(screen.getByText('Tag B')).toBeDefined();
  });

  it('renders empty state when no tags', () => {
    mocks.store.getAll.mockReturnValue([]);
    renderWithProvider(<MobileTagsView />);
    expect(screen.getByTestId('empty-state').textContent).toContain(
      'No tags yet'
    );
  });

  it('calculates and shows usage counts', () => {
    renderWithProvider(<MobileTagsView />);
    // Tag B is used by 2 objects. Tag A by 0.
    expect(screen.getByText('2 items')).toBeDefined();
    // Tag A usage shouldn't be shown (if count > 0 is the condition) or "0 items"?
    // Component code: {tag.usageCount > 0 && ...}
  });

  it('filters tags by search query', () => {
    renderWithProvider(<MobileTagsView />);
    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'Tag A' } });

    expect(screen.getByText('Tag A')).toBeDefined();
    expect(screen.queryByText('Tag B')).toBeNull();
  });

  it('navigates on tag press', () => {
    renderWithProvider(<MobileTagsView />);
    fireEvent.click(screen.getByText('Tag A'));
    expect(mocks.navigateToObject).toHaveBeenCalledWith('tag-1');
  });

  it('handles delete action', async () => {
    mocks.confirm.mockResolvedValue(true);
    renderWithProvider(<MobileTagsView />);

    const deleteButtons = screen.getAllByTestId('action-delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled();
      // tag-2 has higher usage, so it is first in the list by default
      expect(mocks.store.delete).toHaveBeenCalledWith('tag-2');
      expect(mocks.refreshData).toHaveBeenCalled();
    });
  });

  it('sorts tags', () => {
    renderWithProvider(<MobileTagsView />);
    // Default is usage (Tag B has 2, Tag A has 0). So Tag B first.
    const rows = screen.getAllByTestId('swipeable-row');
    expect(rows[0].textContent).toContain('Tag B');
    expect(rows[1].textContent).toContain('Tag A');

    // Change sort to Name A-Z
    const sortButton = screen.getByLabelText('Sort options');
    fireEvent.click(sortButton);

    const nameOption = screen.getByText('Name (A-Z)');
    fireEvent.click(nameOption);

    const sortedRows = screen.getAllByTestId('swipeable-row');
    expect(sortedRows[0].textContent).toContain('Tag A');
    expect(sortedRows[1].textContent).toContain('Tag B');
  });

  it('handles edit action', () => {
    renderWithProvider(<MobileTagsView />);
    const editButtons = screen.getAllByTestId('action-edit');
    fireEvent.click(editButtons[0]);
    // Tag B is first row by default (highest usage)
    expect(mocks.navigateToObject).toHaveBeenCalledWith('tag-2');
  });
});
