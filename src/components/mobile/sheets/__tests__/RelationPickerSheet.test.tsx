/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { RelationPickerSheet } from '../RelationPickerSheet';
import { setupSheetMocks, renderWithProvider } from './test-utils';

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

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// Mock icons lib
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: vi.fn(() => 'folder'),
}));

// Mock objects
const mockObjects = [
  {
    id: 'project-1',
    typeId: 'built-in:project',
    properties: { title: 'Website Redesign' },
  },
  {
    id: 'project-2',
    typeId: 'built-in:project',
    properties: { title: 'Mobile App' },
  },
  {
    id: 'project-3',
    typeId: 'built-in:project',
    properties: { title: 'API Development' },
  },
];

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: {
      getByType: vi.fn(() => mockObjects),
    },
    isLoading: false,
  }),
  useTypeRegistry: () => ({
    get: vi.fn((typeId) => {
      if (typeId === 'built-in:project') {
        return { name: 'Project', icon: '📁' };
      }
      return null;
    }),
  }),
}));

describe('RelationPickerSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    opened: true,
    onClose: mockOnClose,
    property: {
      id: 'project',
      name: 'Project',
      type: 'relation' as const,
      config: { targetTypeIds: ['built-in:project'] },
      required: false,
      multiple: false,
    },
    value: null,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when property is null', () => {
    renderWithProvider(
      <RelationPickerSheet
        opened={true}
        onClose={mockOnClose}
        property={null}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened with property', () => {
    renderWithProvider(<RelationPickerSheet {...defaultProps} />);

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Select Project')).toBeDefined();
  });

  it('should show search input', () => {
    renderWithProvider(<RelationPickerSheet {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search Project...')).toBeDefined();
  });

  it('should show available objects', () => {
    renderWithProvider(<RelationPickerSheet {...defaultProps} />);

    expect(screen.getByText('Website Redesign')).toBeDefined();
    expect(screen.getByText('Mobile App')).toBeDefined();
    expect(screen.getByText('API Development')).toBeDefined();
  });

  it('should filter objects by search query', () => {
    renderWithProvider(<RelationPickerSheet {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search Project...');
    fireEvent.change(searchInput, { target: { value: 'Mobile' } });

    expect(screen.getByText('Mobile App')).toBeDefined();
    expect(screen.queryByText('Website Redesign')).toBeNull();
    expect(screen.queryByText('API Development')).toBeNull();
  });

  it('should call onSave when object is selected', () => {
    renderWithProvider(<RelationPickerSheet {...defaultProps} />);

    fireEvent.click(screen.getByText('Mobile App'));

    expect(mockOnSave).toHaveBeenCalledWith('project-2');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should deselect when selected object is clicked again', () => {
    renderWithProvider(
      <RelationPickerSheet {...defaultProps} value="project-1" />
    );

    fireEvent.click(screen.getByText('Website Redesign'));

    expect(mockOnSave).toHaveBeenCalledWith(null);
  });

  it('should show Done button for multi-select', () => {
    renderWithProvider(
      <RelationPickerSheet
        {...defaultProps}
        property={{
          ...defaultProps.property,
          multiple: true,
        }}
      />
    );

    expect(screen.getByText('Done')).toBeDefined();
  });

  it('should handle multi-select toggle', () => {
    renderWithProvider(
      <RelationPickerSheet
        {...defaultProps}
        property={{
          ...defaultProps.property,
          multiple: true,
        }}
        value={['project-1']}
      />
    );

    // Add another selection
    fireEvent.click(screen.getByText('Mobile App'));

    expect(mockOnSave).toHaveBeenCalledWith(['project-1', 'project-2']);
  });

  it('should remove from multi-select when already selected', () => {
    renderWithProvider(
      <RelationPickerSheet
        {...defaultProps}
        property={{
          ...defaultProps.property,
          multiple: true,
        }}
        value={['project-1', 'project-2']}
      />
    );

    // Remove selection
    fireEvent.click(screen.getByText('Website Redesign'));

    expect(mockOnSave).toHaveBeenCalledWith(['project-2']);
  });

  it('should close and clear search on Done click', () => {
    renderWithProvider(
      <RelationPickerSheet
        {...defaultProps}
        property={{
          ...defaultProps.property,
          multiple: true,
        }}
      />
    );

    fireEvent.click(screen.getByText('Done'));

    expect(mockOnClose).toHaveBeenCalled();
  });
});
