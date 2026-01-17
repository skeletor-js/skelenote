// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileProjectsView } from '../MobileProjectsView';
import { useObjects, useNavigation } from '@/contexts';
import { useConfirmDialog } from '@/hooks';
import { BuiltInTypeIds } from '@/lib/types';
import { MantineProvider } from '@mantine/core';

// Mock dependencies
vi.mock('@/contexts', () => ({
  useObjects: vi.fn(),
  useNavigation: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useConfirmDialog: vi.fn(),
  useReducedMotion: vi.fn(() => false),
}));

// Mock primitives with correct relative path
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, rightSection }: any) => (
    <div data-testid="mobile-view-header">
      {title}
      {rightSection}
    </div>
  ),
  HeaderAddButton: ({ onClick }: any) => (
    <button data-testid="header-add-button" onClick={onClick}>
      Add
    </button>
  ),
  PullToRefresh: ({ children }: any) => (
    <div data-testid="pull-to-refresh">{children}</div>
  ),
  EmptyState: ({ title, onAction }: any) => (
    <div data-testid="empty-state">
      {title}
      {onAction && <button onClick={onAction}>Create project</button>}
    </div>
  ),
  SwipeableRow: ({ children, leftActions, rightActions, onPress }: any) => (
    <div data-testid="swipeable-row" onClick={onPress}>
      {children}
      <div data-testid="swipe-actions">
        {leftActions?.map((a: any) => (
          <button
            key={a.id}
            onClick={(e) => {
              e.stopPropagation();
              a.onAction();
            }}
          >
            {a.label}
          </button>
        ))}
        {rightActions?.map((a: any) => (
          <button
            key={a.id}
            onClick={(e) => {
              e.stopPropagation();
              a.onAction();
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  ),
  BottomSheet: ({ children, opened }: any) =>
    opened ? <div data-testid="bottom-sheet">{children}</div> : null,
}));

// Mock sheets using alias to ensure it catches imports
vi.mock('@/components/mobile/sheets', () => ({
  QuickCreateProjectSheet: ({ opened }: any) =>
    opened ? (
      <div data-testid="quick-create-project-sheet">Sheet Open</div>
    ) : null,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, ...props }: any) => (
      <div {...props} style={style}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('MobileProjectsView', () => {
  const mockStore = {
    getAll: vi.fn(),
    update: vi.fn(),
  };
  const mockNavigateToView = vi.fn();
  const mockNavigateToObject = vi.fn();
  const mockConfirm = vi.fn();

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

    (useObjects as any).mockReturnValue({
      store: mockStore,
      isLoading: false,
      dataVersion: 1,
      refreshData: vi.fn(),
    });

    (useNavigation as any).mockReturnValue({
      navigateToView: mockNavigateToView,
      navigateToObject: mockNavigateToObject,
    });

    (useConfirmDialog as any).mockReturnValue({
      confirm: mockConfirm,
    });
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <MobileProjectsView />
      </MantineProvider>
    );
  };

  it('renders loading state', () => {
    (useObjects as any).mockReturnValue({ isLoading: true });
    renderView();
    expect(screen.getByTestId('mobile-view-header')).toBeTruthy();
    expect(screen.queryByTestId('pull-to-refresh')).toBeNull();
  });

  it('renders empty state when no projects', () => {
    mockStore.getAll.mockReturnValue([]);
    renderView();
    expect(screen.getByTestId('empty-state').textContent).toContain(
      'No projects yet'
    );
    expect(screen.getByText('Create project')).toBeTruthy();
  });

  it('renders list of projects', () => {
    const projects = [
      {
        id: 'p1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project A', status: 'active' },
        updatedAt: 100,
      },
      {
        id: 'p2',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project B', status: 'on-hold' },
        updatedAt: 200,
      },
    ];
    mockStore.getAll.mockReturnValue(projects);

    renderView();
    expect(screen.getByText('Project A')).toBeTruthy();
    expect(screen.getByText('Project B')).toBeTruthy();
  });

  it('filters projects by search', () => {
    const projects = [
      {
        id: 'p1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Alpha' },
      },
      {
        id: 'p2',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Beta' },
      },
    ];
    mockStore.getAll.mockReturnValue(projects);

    renderView();
    const input = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(input, { target: { value: 'Alpha' } });

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.queryByText('Beta')).toBeNull();
  });

  it('navigates to project on tap', () => {
    const projects = [
      {
        id: 'p1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project A' },
      },
    ];
    mockStore.getAll.mockReturnValue(projects);

    renderView();
    fireEvent.click(screen.getByTestId('swipeable-row'));
    expect(mockNavigateToObject).toHaveBeenCalledWith('p1');
  });

  it('opens quick create sheet', () => {
    mockStore.getAll.mockReturnValue([]); // Empty state shows button
    renderView();

    // Test both EmptyState button and Header button
    const headerBtn = screen.getByTestId('header-add-button');
    fireEvent.click(headerBtn);
    expect(screen.getByTestId('quick-create-project-sheet')).toBeTruthy();
  });

  it('archives project', async () => {
    const projects = [
      {
        id: 'p1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project A' },
      },
    ];
    mockStore.getAll.mockReturnValue(projects);
    mockConfirm.mockResolvedValue(true);

    renderView();

    // Click Archive action (mocked in SwipeableRow)
    const archiveBtn = screen.getByText('Archive');
    fireEvent.click(archiveBtn);

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockStore.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({
          properties: expect.objectContaining({ status: 'archived' }),
        })
      );
    });
  });

  it('calculates task counts correctly', () => {
    const data = [
      {
        id: 'p1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project A' },
      },
      {
        id: 't1',
        typeId: BuiltInTypeIds.TASK,
        properties: { project: 'p1', status: 'todo' },
      },
      {
        id: 't2',
        typeId: BuiltInTypeIds.TASK,
        properties: { project: 'p1', status: 'done' },
      },
    ];
    mockStore.getAll.mockReturnValue(data);

    renderView();
    // Project A should show counts
    // "1 open task" or similar
    expect(screen.getByText(/1 open task/)).toBeTruthy();
  });
});
