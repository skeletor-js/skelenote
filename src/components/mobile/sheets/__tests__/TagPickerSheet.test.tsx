/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagPickerSheet } from '../TagPickerSheet';
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

describe('TagPickerSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getByType.mockReturnValue([
      { id: 'tag-1', properties: { name: 'Important' } },
      { id: 'tag-2', properties: { name: 'Review' } },
      { id: 'tag-3', properties: { name: 'Blocked' } },
    ]);
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <TagPickerSheet
        opened={false}
        onClose={mockOnClose}
        value={[]}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <TagPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={[]}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Add Tags')).toBeDefined();
  });

  it('should show search input', () => {
    renderWithProvider(
      <TagPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={[]}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByPlaceholderText('Search tags...')).toBeDefined();
  });

  it('should display tags from store', () => {
    renderWithProvider(
      <TagPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={[]}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Important')).toBeDefined();
    expect(screen.getByText('Review')).toBeDefined();
    expect(screen.getByText('Blocked')).toBeDefined();
  });

  it('should have Done button', () => {
    renderWithProvider(
      <TagPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={[]}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Done')).toBeDefined();
  });

  it('should call onSave with selected tags when Done is clicked', () => {
    renderWithProvider(
      <TagPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={['tag-1']}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Done'));

    expect(mockOnSave).toHaveBeenCalledWith(['tag-1']);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should toggle tag selection when clicked', () => {
    renderWithProvider(
      <TagPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={[]}
        onSave={mockOnSave}
      />
    );

    // Click to select a tag
    fireEvent.click(screen.getByText('Important'));

    // Click Done to save
    fireEvent.click(screen.getByText('Done'));

    expect(mockOnSave).toHaveBeenCalledWith(['tag-1']);
  });

  it('should show empty state when no tags exist', () => {
    mockStore.getByType.mockReturnValue([]);

    renderWithProvider(
      <TagPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={[]}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('No tags yet')).toBeDefined();
  });

  it('should filter tags by search query', () => {
    renderWithProvider(
      <TagPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={[]}
        onSave={mockOnSave}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'imp' } });

    expect(screen.getByText('Important')).toBeDefined();
    expect(screen.queryByText('Review')).toBeNull();
  });
});
