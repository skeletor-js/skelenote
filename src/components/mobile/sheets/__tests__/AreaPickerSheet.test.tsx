/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AreaPickerSheet } from '../AreaPickerSheet';
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

describe('AreaPickerSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getByType.mockReturnValue([
      { id: 'area-1', properties: { name: 'Work' } },
      { id: 'area-2', properties: { name: 'Personal' } },
      { id: 'area-3', properties: { name: 'Health' } },
    ]);
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <AreaPickerSheet
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
      <AreaPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Assign Area')).toBeDefined();
  });

  it('should show search input', () => {
    renderWithProvider(
      <AreaPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByPlaceholderText('Search areas...')).toBeDefined();
  });

  it('should display areas from store', () => {
    renderWithProvider(
      <AreaPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Work')).toBeDefined();
    expect(screen.getByText('Personal')).toBeDefined();
    expect(screen.getByText('Health')).toBeDefined();
  });

  it('should call onSave with area id when area is selected', () => {
    renderWithProvider(
      <AreaPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Work'));

    expect(mockOnSave).toHaveBeenCalledWith('area-1');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show remove area button when area is selected', () => {
    renderWithProvider(
      <AreaPickerSheet
        opened={true}
        onClose={mockOnClose}
        value="area-1"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Remove area')).toBeDefined();
  });

  it('should clear area when remove is clicked', () => {
    renderWithProvider(
      <AreaPickerSheet
        opened={true}
        onClose={mockOnClose}
        value="area-1"
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Remove area'));

    expect(mockOnSave).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show empty state when no areas exist', () => {
    mockStore.getByType.mockReturnValue([]);

    renderWithProvider(
      <AreaPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('No areas yet')).toBeDefined();
  });

  it('should filter areas by search query', () => {
    renderWithProvider(
      <AreaPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search areas...');
    fireEvent.change(searchInput, { target: { value: 'work' } });

    expect(screen.getByText('Work')).toBeDefined();
    expect(screen.queryByText('Personal')).toBeNull();
    expect(screen.queryByText('Health')).toBeNull();
  });
});
