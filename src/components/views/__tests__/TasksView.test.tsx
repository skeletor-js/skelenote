// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TasksView } from '../TasksView';
import { MantineProvider } from '@mantine/core';
import { useSelection } from '@/hooks';

// Mock hooks
const mockUseTasks = vi.fn();
// We need to mock the module, but we can't use the imported symbol inside the factory if it's hoisted.
vi.mock('@/hooks', () => ({
  useTasks: (args: any) => mockUseTasks(args),
  useSelection: vi.fn(),
}));

const mockRefreshData = vi.fn();
const mockStore = {
  getByType: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    refreshData: mockRefreshData,
    store: mockStore,
  }),
}));

// Mock utils
vi.mock('@/lib/tasks/filters', () => ({
  getTaskFilter: vi.fn(() => () => true), // default to matching everything for counts unless mocked
}));

// Mock child components
vi.mock('../TaskList', () => ({
  TaskList: ({ tasks }: any) => (
    <div data-testid="task-list">
      Tasks: {tasks.length}
      {tasks.map((t: any) => (
        <div key={t.id}>{t.properties.title}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/actions', () => ({
  BulkActions: ({ selectedIds }: any) => (
    <div data-testid="bulk-actions">Selected: {selectedIds.length}</div>
  ),
}));

vi.mock('@/components/ui', () => ({
  ViewHeader: ({ title, count }: any) => (
    <h1>
      {title} {count !== undefined ? `(${count})` : ''}
    </h1>
  ),
  Icon: () => <span data-testid="icon" />,
}));

describe('TasksView', () => {
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

    // Default useTasks mock
    mockUseTasks.mockReturnValue({
      tasks: [],
      isLoading: false,
      toggleComplete: vi.fn(),
      archiveTask: vi.fn(),
    });

    // Default useSelection mock
    vi.mocked(useSelection).mockReturnValue({
      selectedArray: [],
      isSelected: () => false,
      toggle: vi.fn(),
      selectRange: vi.fn(),
      selectAll: vi.fn(),
      clear: vi.fn(),
      hasSelection: false,
      allIds: [],
    } as any);

    // Default store mock for counts
    mockStore.getByType.mockReturnValue([]);
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <TasksView />
      </MantineProvider>
    );
  };

  it('should render loading state', () => {
    mockUseTasks.mockReturnValue({ tasks: [], isLoading: true });
    renderView();
    expect(screen.getByText('Loading tasks...')).toBeTruthy();
  });

  it('should render empty state for Today tab by default', () => {
    renderView();
    expect(screen.getByText('All clear for today')).toBeTruthy();
  });

  it('should render tabs', () => {
    renderView();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('This Week')).toBeTruthy();
    expect(screen.getByText('Overdue')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('should switch tabs and update filter', () => {
    renderView();
    const weekTab = screen.getByText('This Week');
    fireEvent.click(weekTab);

    // Check if useTasks was called with new filter.
    // Since useTasks is called during render, we check the last call or subsequent calls.
    // Wait for effect update if any? useTasks is a hook called in render body.
    // The component state `activeTab` updates, triggering re-render, calling `useTasks` with new filter.
    expect(mockUseTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: 'this-week' })
    );
  });

  it('should render tasks list when tasks exist', () => {
    const tasks = [{ id: '1', properties: { title: 'Task 1' } }];
    mockUseTasks.mockReturnValue({
      tasks,
      isLoading: false,
    });

    renderView();
    expect(screen.getByTestId('task-list')).toBeTruthy();
    expect(screen.getByText('Task 1')).toBeTruthy();
  });

  it('should display counts on tabs', async () => {
    // Mock getTaskFilter to return true for 'today' and false others?
    // The component calls getTaskFilter for each tab type inside useMemo.
    // And iterates allTasks.
    // We mocked getTaskFilter to return true always.
    // But we need to distinguish them.

    // Better strategy: mocking the store.getByType is easy, but making getTaskFilter distinguish is hard if it's mocked globally.
    // Let's unmock getTaskFilter so we can use real logic? No, too complex dependencies.
    // Let's mock getTaskFilter implementation to check a property on the fake task?

    const { getTaskFilter } = await import('@/lib/tasks/filters');
    vi.mocked(getTaskFilter).mockImplementation((filterType: any) => {
      return (task: any) => task.properties.status === filterType;
    });

    const tasks = [
      { id: '1', properties: { status: 'today' } },
      { id: '2', properties: { status: 'today' } },
      { id: '3', properties: { status: 'overdue' } },
    ];
    mockStore.getByType.mockReturnValue(tasks);

    renderView();

    // Today tab should have badge '2'
    // We check via aria-label or badge content?
    // The tab component renders text and badge.

    // Badges are rendered inside tabs.
    // Mantine Tabs structure is complex.
    // Let's try finding by text '2' and '1'.

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });
});
