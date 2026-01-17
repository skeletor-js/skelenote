/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectPickerSheet } from '../ProjectPickerSheet';
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
  getByType: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    isLoading: false,
  }),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ProjectPickerSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getByType.mockReturnValue([
      { id: 'project-1', properties: { name: 'Website Redesign' } },
      { id: 'project-2', properties: { name: 'Mobile App' } },
      { id: 'project-3', properties: { name: 'API Integration' } },
    ]);
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <ProjectPickerSheet
        opened={false}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <ProjectPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Assign Project')).toBeDefined();
  });

  it('should show search input', () => {
    renderWithProvider(
      <ProjectPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByPlaceholderText('Search projects...')).toBeDefined();
  });

  it('should display projects from store', () => {
    renderWithProvider(
      <ProjectPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Website Redesign')).toBeDefined();
    expect(screen.getByText('Mobile App')).toBeDefined();
    expect(screen.getByText('API Integration')).toBeDefined();
  });

  it('should call onSave with project id when project is selected', () => {
    renderWithProvider(
      <ProjectPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Mobile App'));

    expect(mockOnSave).toHaveBeenCalledWith('project-2');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show remove project button when project is selected', () => {
    renderWithProvider(
      <ProjectPickerSheet
        opened={true}
        onClose={mockOnClose}
        value="project-1"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Remove project')).toBeDefined();
  });

  it('should clear project when remove is clicked', () => {
    renderWithProvider(
      <ProjectPickerSheet
        opened={true}
        onClose={mockOnClose}
        value="project-1"
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Remove project'));

    expect(mockOnSave).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show empty state when no projects exist', () => {
    mockStore.getByType.mockReturnValue([]);

    renderWithProvider(
      <ProjectPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('No projects yet')).toBeDefined();
  });

  it('should filter projects by search query', () => {
    renderWithProvider(
      <ProjectPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'mobile' } });

    expect(screen.getByText('Mobile App')).toBeDefined();
    expect(screen.queryByText('Website Redesign')).toBeNull();
  });
});
