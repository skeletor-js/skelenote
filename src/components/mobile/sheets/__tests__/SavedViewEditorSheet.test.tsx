/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavedViewEditorSheet } from '../SavedViewEditorSheet';
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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('SavedViewEditorSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render with New Saved View title when creating', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('New Saved View')).toBeDefined();
  });

  it('should render with Edit View title when editing', () => {
    renderWithProvider(
      <SavedViewEditorSheet
        opened={true}
        onClose={mockOnClose}
        view={{
          id: 'view-1',
          name: 'My View',
          icon: 'clipboard',
          filters: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
      />
    );

    expect(screen.getByText('Edit View')).toBeDefined();
  });

  it('should show name input', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByPlaceholderText('View name')).toBeDefined();
  });

  it('should show icon picker label', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Icon')).toBeDefined();
  });

  it('should show icon buttons', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={true} onClose={mockOnClose} />
    );

    // Check for some of the icons
    expect(screen.getByTestId('icon-clipboard')).toBeDefined();
    expect(screen.getByTestId('icon-filter')).toBeDefined();
  });

  it('should show info text when creating', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText(/After creating, add filters/)).toBeDefined();
  });

  it('should show Cancel and Create buttons', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDefined();
  });

  it('should show Save button when editing', () => {
    renderWithProvider(
      <SavedViewEditorSheet
        opened={true}
        onClose={mockOnClose}
        view={{
          id: 'view-1',
          name: 'My View',
          icon: 'clipboard',
          filters: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined();
  });

  it('should disable Create button when name is empty', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={true} onClose={mockOnClose} />
    );

    const createButton = screen.getByRole('button', { name: 'Create' });
    expect(createButton).toHaveProperty('disabled', true);
  });

  it('should enable Create button when name is entered', () => {
    renderWithProvider(
      <SavedViewEditorSheet
        opened={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );

    const input = screen.getByPlaceholderText('View name');
    fireEvent.change(input, { target: { value: 'My New View' } });

    const createButton = screen.getByRole('button', { name: 'Create' });
    expect(createButton).toHaveProperty('disabled', false);
  });

  it('should call onCreate when Create button is clicked', () => {
    renderWithProvider(
      <SavedViewEditorSheet
        opened={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );

    const input = screen.getByPlaceholderText('View name');
    fireEvent.change(input, { target: { value: 'My New View' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockOnCreate).toHaveBeenCalledWith({
      name: 'My New View',
      icon: 'clipboard',
      filters: [],
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when Cancel is clicked', () => {
    renderWithProvider(
      <SavedViewEditorSheet opened={true} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalled();
  });
});
