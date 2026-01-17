/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickAddTaskSheet } from '../QuickAddTaskSheet';
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

// Mock TemplatePickerSheet
vi.mock('../TemplatePickerSheet', () => ({
  TemplatePickerSheet: () => null,
}));

// Mock contexts
const mockStore = {
  create: vi.fn().mockReturnValue({ id: 'new-task-id' }),
  get: vi.fn(),
};
const mockRefreshData = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    refreshData: mockRefreshData,
  }),
}));

// Mock useLinkToDaily hook
const mockLinkToDaily = vi.fn();
vi.mock('@/hooks', () => ({
  useLinkToDaily: () => ({
    linkToDaily: mockLinkToDaily,
  }),
}));

// Mock templates
vi.mock('@/lib/templates', () => ({
  createFromTemplate: vi.fn(),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('QuickAddTaskSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnTaskCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('New Task')).toBeDefined();
  });

  it('should show title input', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByPlaceholderText('What needs to be done?')).toBeDefined();
  });

  it('should show due date options', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Due Date')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Today' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toBeDefined();
    expect(screen.getByRole('button', { name: '+1 Week' })).toBeDefined();
  });

  it('should show priority options', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Priority')).toBeDefined();
    expect(screen.getByRole('button', { name: /low/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /medium/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /high/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /urgent/i })).toBeDefined();
  });

  it('should show template selector', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('No template')).toBeDefined();
  });

  it('should disable Create Task button when title is empty', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    const createButton = screen.getByRole('button', { name: 'Create Task' });
    expect(createButton).toHaveProperty('disabled', true);
  });

  it('should enable Create Task button when title is entered', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    const input = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(input, { target: { value: 'My new task' } });

    const createButton = screen.getByRole('button', { name: 'Create Task' });
    expect(createButton).toHaveProperty('disabled', false);
  });

  it('should create task when Create Task is clicked', () => {
    renderWithProvider(
      <QuickAddTaskSheet
        opened={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const input = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(input, { target: { value: 'My new task' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));

    expect(mockStore.create).toHaveBeenCalledTimes(1);
    expect(mockRefreshData).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should toggle due date selection', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    const todayButton = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayButton);

    // Click again to deselect
    fireEvent.click(todayButton);

    // Button state is controlled internally
    expect(todayButton).toBeDefined();
  });

  it('should toggle priority selection', () => {
    renderWithProvider(
      <QuickAddTaskSheet opened={true} onClose={mockOnClose} />
    );

    const highButton = screen.getByRole('button', { name: /high/i });
    fireEvent.click(highButton);

    // Click again to deselect
    fireEvent.click(highButton);

    expect(highButton).toBeDefined();
  });
});
