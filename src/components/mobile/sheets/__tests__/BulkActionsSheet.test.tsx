/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionsSheet } from '../BulkActionsSheet';
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

// Mock BottomSheet to render children directly
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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('BulkActionsSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={false}
        onClose={mockOnClose}
        count={3}
        onAction={mockOnAction}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={3}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
  });

  it('should show correct title with count', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={5}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('5 items selected')).toBeDefined();
  });

  it('should show singular title for single item', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={1}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('1 item selected')).toBeDefined();
  });

  it('should show normal actions when not in archive context', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={3}
        onAction={mockOnAction}
        isArchiveContext={false}
      />
    );

    expect(screen.getByText('Archive')).toBeDefined();
    expect(screen.getByText('Add Tag')).toBeDefined();
    expect(screen.getByText('Move to Project')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('should show archive actions when in archive context', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={3}
        onAction={mockOnAction}
        isArchiveContext={true}
      />
    );

    expect(screen.getByText('Restore')).toBeDefined();
    expect(screen.getByText('Delete Permanently')).toBeDefined();
    expect(screen.queryByText('Archive')).toBeNull();
  });

  it('should call onAction when action is clicked', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={3}
        onAction={mockOnAction}
      />
    );

    fireEvent.click(screen.getByText('Archive'));

    expect(mockOnAction).toHaveBeenCalledWith('archive');
  });

  it('should show loading state', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={3}
        onAction={mockOnAction}
        isLoading={true}
      />
    );

    expect(screen.getByText('Processing...')).toBeDefined();
  });

  it('should show hint text for normal context', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={3}
        onAction={mockOnAction}
      />
    );

    expect(
      screen.getByText('Actions will be applied to all selected items')
    ).toBeDefined();
  });

  it('should show hint text for archive context', () => {
    renderWithProvider(
      <BulkActionsSheet
        opened={true}
        onClose={mockOnClose}
        count={3}
        onAction={mockOnAction}
        isArchiveContext={true}
      />
    );

    expect(
      screen.getByText('Restore items to move them out of archive')
    ).toBeDefined();
  });
});
