/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActionsSheet } from '../QuickActionsSheet';
import { MantineProvider } from '@mantine/core';

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

// Mock BottomSheet
vi.mock('@/components/mobile/primitives', () => ({
  BottomSheet: ({
    children,
    opened,
    title,
  }: {
    children: React.ReactNode;
    opened: boolean;
    title: string;
  }) =>
    opened ? (
      <div data-testid="bottom-sheet">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// Mock contexts
const mockNavigateToView = vi.fn();
const mockNavigateToObject = vi.fn();
const mockNavigateToSearch = vi.fn();
const mockStore = {
  create: vi.fn().mockReturnValue({ id: 'new-object-id' }),
};
const mockRefreshData = vi.fn();

vi.mock('@/contexts', () => ({
  useNavigation: () => ({
    navigateToView: mockNavigateToView,
    navigateToObject: mockNavigateToObject,
    navigateToSearch: mockNavigateToSearch,
  }),
  useObjects: () => ({
    store: mockStore,
    refreshData: mockRefreshData,
  }),
}));

// Mock hooks
const mockImpact = vi.fn();
vi.mock('@/hooks', () => ({
  useHaptics: () => ({
    impact: mockImpact,
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}));

// Mock palette actions
vi.mock('@/lib/palette/actions', () => ({
  navigationActions: [
    {
      id: 'nav-inbox',
      label: 'Inbox',
      icon: 'inbox',
      category: 'navigation',
      view: 'inbox',
    },
    {
      id: 'nav-tasks',
      label: 'Tasks',
      icon: 'check-square',
      category: 'navigation',
      view: 'tasks',
    },
  ],
  createActions: [
    {
      id: 'create-task',
      label: 'New Task',
      icon: 'check-square',
      category: 'create',
      typeId: 'built-in:task',
    },
    {
      id: 'create-note',
      label: 'New Note',
      icon: 'file-text',
      category: 'create',
      typeId: 'built-in:note',
    },
  ],
  filterActions: (
    actions: Array<{ id: string; label: string }>,
    query: string
  ) => {
    if (!query) return actions;
    return actions.filter((a) =>
      a.label.toLowerCase().includes(query.toLowerCase())
    );
  },
  SEARCH_ACTION_ID: 'search',
  KEYBOARD_SHORTCUTS_ACTION_ID: 'keyboard-shortcuts',
  OPEN_IN_SPLIT_ACTION_ID: 'open-in-split',
  DUPLICATE_OBJECT_ACTION_ID: 'duplicate-object',
  CREATE_FROM_TEMPLATE_ACTION_ID: 'create-from-template',
  NEW_TEMPLATE_ACTION_ID: 'new-template',
  TOGGLE_THEME_ACTION_ID: 'toggle-theme',
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('QuickActionsSheet', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <QuickActionsSheet opened={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Quick Actions')).toBeDefined();
  });

  it('should show search input', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByPlaceholderText('Search actions...')).toBeDefined();
  });

  it('should show navigation actions', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Navigate')).toBeDefined();
    expect(screen.getByText('Inbox')).toBeDefined();
    expect(screen.getByText('Tasks')).toBeDefined();
  });

  it('should show create actions', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Create New')).toBeDefined();
    expect(screen.getByText('New Task')).toBeDefined();
    expect(screen.getByText('New Note')).toBeDefined();
  });

  it('should call navigateToView when navigation action is clicked', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Inbox'));

    expect(mockNavigateToView).toHaveBeenCalledWith('inbox');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should create object when create action is clicked', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('New Task'));

    expect(mockStore.create).toHaveBeenCalledWith({
      typeId: 'built-in:task',
      properties: {},
    });
    expect(mockRefreshData).toHaveBeenCalledTimes(1);
    expect(mockNavigateToObject).toHaveBeenCalledWith('new-object-id');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should trigger haptic feedback on action click', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Inbox'));

    expect(mockImpact).toHaveBeenCalledWith('light');
  });

  it('should filter actions by search query', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    const searchInput = screen.getByPlaceholderText('Search actions...');
    fireEvent.change(searchInput, { target: { value: 'task' } });

    expect(screen.getByText('Tasks')).toBeDefined();
    expect(screen.getByText('New Task')).toBeDefined();
    expect(screen.queryByText('Inbox')).toBeNull();
    expect(screen.queryByText('New Note')).toBeNull();
  });

  it('should show empty state when no actions match', () => {
    renderWithProvider(
      <QuickActionsSheet opened={true} onClose={mockOnClose} />
    );

    const searchInput = screen.getByPlaceholderText('Search actions...');
    fireEvent.change(searchInput, { target: { value: 'zzzzz' } });

    expect(screen.getByText(/No actions match/)).toBeDefined();
  });
});
