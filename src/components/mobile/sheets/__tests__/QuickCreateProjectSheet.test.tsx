/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickCreateProjectSheet } from '../QuickCreateProjectSheet';
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

// Mock contexts
const mockStore = {
  create: vi.fn().mockReturnValue({ id: 'new-project-id' }),
};
const mockRefreshData = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    refreshData: mockRefreshData,
  }),
}));

// Mock types
vi.mock('@/lib/types', () => ({
  BuiltInTypeIds: {
    PROJECT: 'built-in:project',
  },
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('QuickCreateProjectSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnProjectCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <QuickCreateProjectSheet opened={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <QuickCreateProjectSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('New Project')).toBeDefined();
  });

  it('should show project name input', () => {
    renderWithProvider(
      <QuickCreateProjectSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByPlaceholderText('Project name')).toBeDefined();
  });

  it('should show status options', () => {
    renderWithProvider(
      <QuickCreateProjectSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Active' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'On Hold' })).toBeDefined();
  });

  it('should show Create Project button', () => {
    renderWithProvider(
      <QuickCreateProjectSheet opened={true} onClose={mockOnClose} />
    );

    expect(
      screen.getByRole('button', { name: 'Create Project' })
    ).toBeDefined();
  });

  it('should disable Create Project button when name is empty', () => {
    renderWithProvider(
      <QuickCreateProjectSheet opened={true} onClose={mockOnClose} />
    );

    const createButton = screen.getByRole('button', { name: 'Create Project' });
    expect(createButton).toHaveProperty('disabled', true);
  });

  it('should enable Create Project button when name is entered', () => {
    renderWithProvider(
      <QuickCreateProjectSheet opened={true} onClose={mockOnClose} />
    );

    const input = screen.getByPlaceholderText('Project name');
    fireEvent.change(input, { target: { value: 'My Project' } });

    const createButton = screen.getByRole('button', { name: 'Create Project' });
    expect(createButton).toHaveProperty('disabled', false);
  });

  it('should create project when Create Project is clicked', () => {
    renderWithProvider(
      <QuickCreateProjectSheet
        opened={true}
        onClose={mockOnClose}
        onProjectCreated={mockOnProjectCreated}
      />
    );

    const input = screen.getByPlaceholderText('Project name');
    fireEvent.change(input, { target: { value: 'My Project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(mockStore.create).toHaveBeenCalledWith({
      typeId: 'built-in:project',
      properties: {
        name: 'My Project',
        status: 'active',
      },
      inboxed: false,
    });
    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockOnProjectCreated).toHaveBeenCalledWith('new-project-id');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should toggle status selection', () => {
    renderWithProvider(
      <QuickCreateProjectSheet opened={true} onClose={mockOnClose} />
    );

    // Click On Hold to change status
    fireEvent.click(screen.getByRole('button', { name: 'On Hold' }));

    const input = screen.getByPlaceholderText('Project name');
    fireEvent.change(input, { target: { value: 'My Project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          status: 'on-hold',
        }),
      })
    );
  });
});
