/**
 * @vitest-environment jsdom
 */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MobileTasksView } from '../MobileTasksView';
import { BuiltInTypeIds } from '@/lib/types';
import { MantineProvider } from '@mantine/core';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layoutId: _layoutId, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Helper to wrap components in providers
const renderWithProviders = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

// Mock dependencies
const mockNavigateToObject = vi.fn();
const mockUpdate = vi.fn();
const mockSetProperty = vi.fn();
const mockRefreshData = vi.fn();
const mockToggleComplete = vi.fn();
const mockArchiveTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockNotification = vi.fn();
const mockSelectionHaptic = vi.fn();
const mockAddToast = vi.fn();
const mockShowArchiveUndo = vi.fn();
const mockShowDeleteUndo = vi.fn();
const mockDuplicate = vi.fn();

// Mock contexts
vi.mock('@/contexts', async () => {
  return {
    useNavigation: () => ({ navigateToObject: mockNavigateToObject }),
    useObjects: () => ({
      store: {
        update: mockUpdate,
        setProperty: mockSetProperty,
        getByType: vi.fn(),
      },
      refreshData: mockRefreshData,
    }),
    useTypeRegistry: () => ({
      get: vi.fn((typeId) => {
        if (typeId === BuiltInTypeIds.TASK) {
          return {
            schema: [{ id: 'project', type: 'relation', name: 'Project' }],
          };
        }
        return null;
      }),
    }),
    useToast: () => ({ addToast: mockAddToast }),
    useSyncContextSafe: () => ({
      syncState: { status: 'synced', lastSync: Date.now() },
      sync: vi.fn(),
    }),
    useLocalSyncSafe: () => ({
      isEnabled: false,
      peers: [],
    }),
  };
});

// Mock hooks
vi.mock('@/hooks', () => ({
  useTasks: ({ filter }: { filter: string }) => {
    const allTasks = [
      { id: 'task-1', properties: { title: 'Task 1', status: 'todo' } },
      { id: 'task-2', properties: { title: 'Task 2', status: 'done' } },
    ];

    let filteredTasks: typeof allTasks = [];
    if (filter === 'today') filteredTasks = [allTasks[0]];
    if (filter === 'completed') filteredTasks = [allTasks[1]];
    if (filter === 'this-week') filteredTasks = [];
    if (filter === 'overdue') filteredTasks = [];

    return {
      tasks: filteredTasks,
      isLoading: false,
      toggleComplete: mockToggleComplete,
      archiveTask: mockArchiveTask,
      deleteTask: mockDeleteTask,
    };
  },
  useSelection: () => ({
    hasSelection: false,
    selectedCount: 0,
    selectedArray: [],
    isSelected: vi.fn().mockReturnValue(false),
    toggle: vi.fn(),
    clear: vi.fn(),
  }),
  useHaptics: () => ({
    notification: mockNotification,
    selection: mockSelectionHaptic,
  }),
  useReducedMotion: () => false,
  useUndoToast: () => ({
    showArchiveUndo: mockShowArchiveUndo,
    showDeleteUndo: mockShowDeleteUndo,
  }),
  useDuplicate: () => ({ duplicate: mockDuplicate }),
}));

// Mock child components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title }: any) => (
    <div data-testid="mobile-view-header">{title}</div>
  ),
  PullToRefresh: ({ children, onRefresh }: any) => (
    <div data-testid="pull-to-refresh">
      <button onClick={onRefresh}>Refresh</button>
      {children}
    </div>
  ),
  ActionSheet: ({ title, opened }: any) =>
    opened ? <div data-testid="action-sheet">{title}</div> : null,
  ConfirmDialog: ({ title, opened, onConfirm }: any) =>
    opened ? (
      <div data-testid="confirm-dialog">
        {title}
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null,
  SelectionToolbar: ({ visible }: any) =>
    visible ? <div data-testid="selection-toolbar" /> : null,
  MobileSyncIndicator: () => <div />,
  SwipeableRow: () => <div />,
  BottomSheet: () => <div />,
  FAB: () => <div />,
  HeaderAddButton: () => <div />,
  CollapsibleSection: () => <div />,
  BrowseItem: () => <div />,
  AnimatedCheckbox: () => <div />,
  EmptyState: () => <div />,
  MatchTypeBadge: () => <div />,
  PropertyChip: () => <div />,
}));

vi.mock('../../rows', () => ({
  MobileTaskRow: ({ task, onPress, onToggleComplete, onArchive }: any) => (
    <div data-testid={`task-row-${task.id}`} onClick={onPress}>
      {task.properties.title}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id);
        }}
      >
        Toggle
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onArchive(task.id);
        }}
      >
        Archive
      </button>
    </div>
  ),
}));

vi.mock('../../sheets', () => ({
  DueDateSheet: () => <div data-testid="due-date-sheet" />,
  ReminderSheet: () => <div data-testid="reminder-sheet" />,
  PriorityPickerSheet: () => <div data-testid="priority-sheet" />,
  RelationPickerSheet: () => <div data-testid="relation-sheet" />,
  BulkActionsSheet: () => <div data-testid="bulk-actions-sheet" />,
  TagPickerSheet: () => <div data-testid="tag-sheet" />,
  AreaPickerSheet: () => <div data-testid="area-sheet" />,
  RecurrenceSheet: () => <div data-testid="recurrence-sheet" />,
  PropertyEditorSheet: () => <div />,
  QuickAddTaskSheet: () => <div />,
  QuickCaptureSheet: () => <div />,
  AccountSettingsSheet: () => <div />,
  SyncSettingsSheet: () => <div />,
  DataSettingsSheet: () => <div />,
  DangerZoneSheet: () => <div />,
  TimeMachineSheet: () => <div />,
  StatusPickerSheet: () => <div />,
  ProjectPickerSheet: () => <div />,
  TemplatePickerSheet: () => <div />,
  QuickCreateProjectSheet: () => <div />,
  SavedViewEditorSheet: () => <div />,
  TemplateEditorSheet: () => <div />,
  QuickActionsSheet: () => <div />,
  SearchSettingsSheet: () => <div />,
  AppearanceSettingsSheet: () => <div />,
  TemplateSettingsSheet: () => <div />,
  CascadingRelationSheet: () => <div />,
  RestoreConfirmSheet: () => <div />,
  ImportSheet: () => <div />,
  DeviceManagerSheet: () => <div />,
}));

describe('MobileTasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    renderWithProviders(<MobileTasksView />);
    const header = screen.getByTestId('mobile-view-header');
    expect(header.textContent).toContain('Tasks');
    expect(header).toBeTruthy();
  });

  it('displays tasks for the default (Today) filter', () => {
    renderWithProviders(<MobileTasksView />);
    expect(screen.getByTestId('task-row-task-1')).toBeTruthy();
    expect(screen.queryByTestId('task-row-task-2')).toBeNull();
  });

  it('switches filters when tabs are clicked', async () => {
    renderWithProviders(<MobileTasksView />);

    // Initial state: Today
    expect(screen.getByTestId('task-row-task-1')).toBeTruthy();

    // Click "Done" tab
    const doneTab = screen.getByText('Done');
    fireEvent.click(doneTab);

    // Should verify haptic feedback
    expect(mockSelectionHaptic).toHaveBeenCalled();

    // Wait for re-render
    await waitFor(() => {
      expect(screen.queryByTestId('task-row-task-1')).toBeNull();
      expect(screen.getByTestId('task-row-task-2')).toBeTruthy();
    });
  });

  it('handles pull to refresh', async () => {
    renderWithProviders(<MobileTasksView />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('navigates to task details when a row is clicked', () => {
    renderWithProviders(<MobileTasksView />);

    const taskRow = screen.getByTestId('task-row-task-1');
    fireEvent.click(taskRow);

    expect(mockNavigateToObject).toHaveBeenCalledWith('task-1');
  });

  it('toggles task completion', () => {
    renderWithProviders(<MobileTasksView />);

    const toggleButton = within(
      screen.getByTestId('task-row-task-1')
    ).getByText('Toggle');
    fireEvent.click(toggleButton);

    expect(mockToggleComplete).toHaveBeenCalledWith('task-1');
  });

  it('archives task', () => {
    renderWithProviders(<MobileTasksView />);

    const archiveButton = within(
      screen.getByTestId('task-row-task-1')
    ).getByText('Archive');
    fireEvent.click(archiveButton);

    expect(mockArchiveTask).toHaveBeenCalled();
  });
});
