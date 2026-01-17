/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileInboxView } from '../MobileInboxView';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { BuiltInTypeIds } from '@/lib/types';
import { useInbox, useSelection } from '@/hooks';

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
    div: ({ children, layoutId: _layoutId, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Hoisted mocks
const mocks = vi.hoisted(() => ({
  navigateToObject: vi.fn(),
  refreshData: vi.fn(),
  confirm: vi.fn(),
  notification: vi.fn(),
  addToast: vi.fn(),
  archiveItem: vi.fn(),
  deleteItem: vi.fn(),
  processItem: vi.fn(),
  showArchiveUndo: vi.fn(),
  showDeleteUndo: vi.fn(),
  // Selection mocks
  selection: {
    selectedArray: [],
    selectedCount: 0,
    hasSelection: false,
    isSelected: vi.fn(() => false),
    toggle: vi.fn(),
    clear: vi.fn(),
    selectAll: vi.fn(),
  },
}));

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(() => ({
    navigateToObject: mocks.navigateToObject,
  })),
  useObjects: vi.fn(() => ({
    refreshData: mocks.refreshData,
  })),
  useToast: vi.fn(() => ({
    addToast: mocks.addToast,
  })),
  useTypeRegistry: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

vi.mock('@/hooks', () => ({
  useInbox: vi.fn(() => ({
    items: [],
    isLoading: false,
    count: 0,
    processItem: mocks.processItem,
    archiveItem: mocks.archiveItem,
    deleteItem: mocks.deleteItem,
  })),
  useConfirmDialog: vi.fn(() => ({
    confirm: mocks.confirm,
  })),
  useReducedMotion: vi.fn(() => false),
  useUndoToast: vi.fn(() => ({
    showArchiveUndo: mocks.showArchiveUndo,
    showDeleteUndo: mocks.showDeleteUndo,
  })),
  useSelection: vi.fn(() => mocks.selection),
  useHaptics: vi.fn(() => ({
    notification: mocks.notification,
  })),
}));

// Mock Components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, count }: any) => (
    <div data-testid="mobile-header">
      {title} {count && `(${count})`}
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
        {title && <div>{title}</div>}
        {actions.map((action: any) => (
          <button
            key={action.id}
            onClick={action.onAction}
            data-testid={`action-${action.id}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    ) : null,
  SelectionToolbar: ({ visible, count, onActionsPress }: any) =>
    visible ? (
      <div data-testid="selection-toolbar">
        <span>{count} Selected</span>
        <button onClick={onActionsPress} data-testid="toolbar-actions">
          Actions
        </button>
      </div>
    ) : null,
  ConfirmDialog: ({ opened, onConfirm, title }: any) =>
    opened ? (
      <div data-testid="confirm-dialog">
        {title}
        <button onClick={onConfirm} data-testid="confirm-dialog-button">
          Confirm
        </button>
      </div>
    ) : null,
}));

vi.mock('../../rows', () => ({
  MobileInboxRow: ({ item, onPress, onLongPress, onToggleSelection }: any) => (
    <div
      data-testid={`inbox-row-${item.id}`}
      onClick={onPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
    >
      {item.properties.title}
      <button
        onClick={() => onToggleSelection(item.id)}
        data-testid={`select-${item.id}`}
      >
        Select
      </button>
    </div>
  ),
}));

vi.mock('../../sheets', () => ({
  BulkActionsSheet: ({ opened, onAction }: any) =>
    opened ? (
      <div data-testid="bulk-actions-sheet">
        <button onClick={() => onAction('archive')} data-testid="bulk-archive">
          Archive
        </button>
        <button onClick={() => onAction('delete')} data-testid="bulk-delete">
          Delete
        </button>
      </div>
    ) : null,
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileInboxView', () => {
  const mockDate = new Date('2024-01-01T12:00:00');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(mockDate);
    vi.clearAllMocks();
    // Reset selection mock state
    mocks.selection.hasSelection = false;
    mocks.selection.selectedCount = 0;
    mocks.selection.selectedArray = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading state', () => {
    (useInbox as any).mockReturnValue({
      items: [],
      isLoading: true,
      count: 0,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileInboxView />);
    expect(screen.getByTestId('mobile-header')).toBeDefined();
  });

  it('renders empty state', () => {
    (useInbox as any).mockReturnValue({
      items: [],
      isLoading: false,
      count: 0,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileInboxView />);
    expect(screen.getByText('All clear! Nothing to process.')).toBeDefined();
  });

  it('renders items grouped by date', () => {
    const items = [
      {
        id: '1',
        properties: { title: 'Today Item' },
        createdAt: mockDate.getTime(),
        inboxed: true,
      },
      {
        id: '2',
        properties: { title: 'Yesterday Item' },
        createdAt: mockDate.getTime() - 86400000,
        inboxed: true,
      },
    ];
    (useInbox as any).mockReturnValue({
      items,
      isLoading: false,
      count: 2,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileInboxView />);
    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Today Item')).toBeDefined();
    expect(screen.getByText('Yesterday')).toBeDefined();
    expect(screen.getByText('Yesterday Item')).toBeDefined();
  });

  it('navigates to object on press', () => {
    const items = [
      {
        id: '1',
        properties: { title: 'Test Item' },
        createdAt: mockDate.getTime(),
        inboxed: true,
      },
    ];
    (useInbox as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileInboxView />);
    fireEvent.click(screen.getByTestId('inbox-row-1'));
    expect(mocks.navigateToObject).toHaveBeenCalledWith('1');
  });

  it('enters selection mode on long press', async () => {
    const items = [
      {
        id: '1',
        properties: { title: 'Test Item' },
        createdAt: mockDate.getTime(),
        inboxed: true,
      },
    ];
    (useInbox as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    // Use a mock override for selection
    (useSelection as any).mockReturnValue({
      ...mocks.selection,
      hasSelection: false,
    });

    renderWithProvider(<MobileInboxView />);

    fireEvent.contextMenu(screen.getByTestId('inbox-row-1'));

    await waitFor(() => {
      expect(mocks.notification).toHaveBeenCalledWith('success');
      expect(mocks.selection.toggle).toHaveBeenCalledWith('1');
    });
  });

  it('shows action sheet on long press when already selecting', async () => {
    const items = [
      {
        id: '1',
        properties: { title: 'Test Item' },
        createdAt: mockDate.getTime(),
        inboxed: true,
      },
    ];
    (useInbox as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    (useSelection as any).mockReturnValue({
      ...mocks.selection,
      hasSelection: true,
    });

    renderWithProvider(<MobileInboxView />);

    fireEvent.contextMenu(screen.getByTestId('inbox-row-1'));

    await waitFor(() => {
      expect(screen.getByTestId('action-sheet')).toBeDefined();
    });
  });

  it('performs individual actions from action sheet', async () => {
    const items = [
      {
        id: '1',
        properties: { title: 'Test Item' },
        createdAt: mockDate.getTime(),
        inboxed: true,
        typeId: BuiltInTypeIds.NOTE,
      },
    ];
    (useInbox as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    (useSelection as any).mockReturnValue({
      ...mocks.selection,
      hasSelection: true,
    });

    renderWithProvider(<MobileInboxView />);

    fireEvent.contextMenu(screen.getByTestId('inbox-row-1'));
    await waitFor(() =>
      expect(screen.getByTestId('action-sheet')).toBeDefined()
    );

    fireEvent.click(screen.getByTestId('action-process'));
    expect(mocks.processItem).toHaveBeenCalledWith('1');

    fireEvent.click(screen.getByTestId('action-archive'));
    expect(mocks.archiveItem).toHaveBeenCalledWith('1');
    expect(mocks.showArchiveUndo).toHaveBeenCalled();
  });

  it('handles delete from action sheet', async () => {
    const items = [
      {
        id: '1',
        properties: { title: 'Test Item' },
        createdAt: mockDate.getTime(),
        inboxed: true,
      },
    ];
    (useInbox as any).mockReturnValue({
      items,
      isLoading: false,
      count: 1,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    (useSelection as any).mockReturnValue({
      ...mocks.selection,
      hasSelection: true,
    });
    mocks.confirm.mockResolvedValue(true);

    renderWithProvider(<MobileInboxView />);

    fireEvent.contextMenu(screen.getByTestId('inbox-row-1'));
    await waitFor(() =>
      expect(screen.getByTestId('action-sheet')).toBeDefined()
    );

    fireEvent.click(screen.getByTestId('action-delete'));

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled();
      expect(mocks.deleteItem).toHaveBeenCalledWith('1');
      expect(mocks.showDeleteUndo).toHaveBeenCalled();
    });
  });

  it('handles bulk archive', async () => {
    (useInbox as any).mockReturnValue({
      items: [],
      isLoading: false,
      count: 0,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    (useSelection as any).mockReturnValue({
      ...mocks.selection,
      hasSelection: true,
      selectedCount: 2,
      selectedArray: ['1', '2'],
    });

    renderWithProvider(<MobileInboxView />);

    fireEvent.click(screen.getByTestId('toolbar-actions'));
    await waitFor(() =>
      expect(screen.getByTestId('bulk-actions-sheet')).toBeDefined()
    );

    fireEvent.click(screen.getByTestId('bulk-archive'));

    await waitFor(() => {
      expect(mocks.archiveItem).toHaveBeenCalledWith('1');
      expect(mocks.archiveItem).toHaveBeenCalledWith('2');
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('handles bulk delete', async () => {
    (useInbox as any).mockReturnValue({
      items: [],
      isLoading: false,
      count: 0,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    (useSelection as any).mockReturnValue({
      ...mocks.selection,
      hasSelection: true,
      selectedCount: 2,
      selectedArray: ['1', '2'],
    });

    renderWithProvider(<MobileInboxView />);

    fireEvent.click(screen.getByTestId('toolbar-actions'));
    await waitFor(() =>
      expect(screen.getByTestId('bulk-actions-sheet')).toBeDefined()
    );

    fireEvent.click(screen.getByTestId('bulk-delete'));

    await waitFor(() =>
      expect(screen.getByTestId('confirm-dialog')).toBeDefined()
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-button'));

    await waitFor(() => {
      expect(mocks.deleteItem).toHaveBeenCalledWith('1');
      expect(mocks.deleteItem).toHaveBeenCalledWith('2');
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('triggers refresh on pull', () => {
    (useInbox as any).mockReturnValue({
      items: [],
      isLoading: false,
      count: 0,
      processItem: mocks.processItem,
      archiveItem: mocks.archiveItem,
      deleteItem: mocks.deleteItem,
    });

    renderWithProvider(<MobileInboxView />);

    fireEvent.click(screen.getByTestId('refresh-trigger'));
    expect(mocks.refreshData).toHaveBeenCalled();
  });
});
