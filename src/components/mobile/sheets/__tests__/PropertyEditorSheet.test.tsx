/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyEditorSheet } from '../PropertyEditorSheet';
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

// Mock Tauri shell
vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}));

// Mock contexts
const mockStore = {
  get: vi.fn((id) => ({
    id,
    properties: { title: 'Test Object' },
  })),
};

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
  }),
}));

// Mock RecurrenceEditor formatRecurrenceDisplay
vi.mock('@/components/object/editors/RecurrenceEditor', () => ({
  formatRecurrenceDisplay: vi.fn((value) =>
    value ? 'Every week' : 'No recurrence'
  ),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('PropertyEditorSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when property is null', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={null}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render text input for text property', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'title',
          name: 'Title',
          type: 'text',
        }}
        value="My Title"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter title')).toBeDefined();
  });

  it('should render number input for number property', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'priority',
          name: 'Priority',
          type: 'number',
        }}
        value={5}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByPlaceholderText('Enter priority')).toBeDefined();
  });

  it('should render url input with external link icon', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'website',
          name: 'Website',
          type: 'url',
        }}
        value="https://example.com"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByPlaceholderText('https://...')).toBeDefined();
  });

  it('should render email input', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'email',
          name: 'Email',
          type: 'email',
        }}
        value="test@example.com"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByPlaceholderText('email@example.com')).toBeDefined();
  });

  it('should render phone input', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'phone',
          name: 'Phone',
          type: 'phone',
        }}
        value="+1 (555) 123-4567"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toBeDefined();
  });

  it('should render select options', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'status',
          name: 'Status',
          type: 'select',
          config: { options: ['todo', 'in-progress', 'done'] },
        }}
        value="todo"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Todo')).toBeDefined();
    expect(screen.getByText('In Progress')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
  });

  it('should render checkbox options', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'completed',
          name: 'Completed',
          type: 'checkbox',
        }}
        value={true}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Yes')).toBeDefined();
    expect(screen.getByText('No')).toBeDefined();
  });

  it('should render relation property with add button', () => {
    const mockOpenRelationPicker = vi.fn();

    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'project',
          name: 'Project',
          type: 'relation',
          config: { targetTypeIds: ['built-in:project'] },
        }}
        value={null}
        onSave={mockOnSave}
        onOpenRelationPicker={mockOpenRelationPicker}
      />
    );

    expect(screen.getByText('Add project')).toBeDefined();
  });

  it('should show Save button for text inputs', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'title',
          name: 'Title',
          type: 'text',
        }}
        value="My Title"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Save')).toBeDefined();
  });

  it('should call onSave when save button is clicked', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'title',
          name: 'Title',
          type: 'text',
        }}
        value="My Title"
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Save'));

    expect(mockOnSave).toHaveBeenCalledWith('My Title');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show clear value button for optional properties with values', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'title',
          name: 'Title',
          type: 'text',
          required: false,
        }}
        value="My Title"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Clear value')).toBeDefined();
  });

  it('should render recurrence property with edit button', () => {
    const mockOpenRecurrenceSheet = vi.fn();

    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'recurrence',
          name: 'Recurrence',
          type: 'recurrence',
        }}
        value={null}
        onSave={mockOnSave}
        onOpenRecurrenceSheet={mockOpenRecurrenceSheet}
      />
    );

    expect(screen.getByText('Edit recurrence')).toBeDefined();
  });

  it('should show existing relation values', () => {
    renderWithProvider(
      <PropertyEditorSheet
        opened={true}
        onClose={mockOnClose}
        property={{
          id: 'project',
          name: 'Project',
          type: 'relation',
          config: { targetTypeIds: ['built-in:project'] },
        }}
        value="project-123"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Test Object')).toBeDefined();
  });
});
