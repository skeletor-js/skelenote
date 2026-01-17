/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DueDateSheet } from '../DueDateSheet';
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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('DueDateSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <DueDateSheet
        opened={false}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <DueDateSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Due Date')).toBeDefined();
  });

  it('should show preset options', () => {
    renderWithProvider(
      <DueDateSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Tomorrow')).toBeDefined();
    expect(screen.getByText('This Weekend')).toBeDefined();
    expect(screen.getByText('Next Week')).toBeDefined();
  });

  it('should show Pick a date option', () => {
    renderWithProvider(
      <DueDateSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Pick a date...')).toBeDefined();
  });

  it('should call onSelect when preset is clicked', () => {
    renderWithProvider(
      <DueDateSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('Today'));

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show Remove due date when value is set', () => {
    const now = Date.now();

    renderWithProvider(
      <DueDateSheet
        opened={true}
        onClose={mockOnClose}
        value={now}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Remove due date')).toBeDefined();
  });

  it('should call onSelect with null when Remove is clicked', () => {
    const now = Date.now();

    renderWithProvider(
      <DueDateSheet
        opened={true}
        onClose={mockOnClose}
        value={now}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('Remove due date'));

    expect(mockOnSelect).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show current date when value is provided', () => {
    // Create a specific date for testing
    const testDate = new Date(2024, 5, 15).getTime(); // June 15, 2024

    renderWithProvider(
      <DueDateSheet
        opened={true}
        onClose={mockOnClose}
        value={testDate}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Currently:/)).toBeDefined();
  });
});
