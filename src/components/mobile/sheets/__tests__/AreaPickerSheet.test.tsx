/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { AreaPickerSheet } from '../AreaPickerSheet';
import {
  setupSheetMocks,
  renderWithProvider,
  createMockStore,
} from './test-utils';

setupSheetMocks();

// Mock BottomSheet (must be inline due to vi.mock hoisting)
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

const mockStore = createMockStore();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    isLoading: false,
  }),
}));

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
