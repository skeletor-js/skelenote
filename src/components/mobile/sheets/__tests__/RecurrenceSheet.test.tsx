/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecurrenceSheet } from '../RecurrenceSheet';
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

// Mock recurrence editor utilities
vi.mock('@/components/object/editors/RecurrenceEditor', () => ({
  parseRecurrenceValue: (value: string | null) => {
    if (!value) return { frequency: 'none' };
    try {
      return JSON.parse(value);
    } catch {
      return { frequency: 'none' };
    }
  },
  formatRecurrenceDisplay: (value: string | null) => {
    if (!value) return 'No recurrence';
    try {
      const parsed = JSON.parse(value);
      return `Repeats ${parsed.frequency}`;
    } catch {
      return 'No recurrence';
    }
  },
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('RecurrenceSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <RecurrenceSheet
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
      <RecurrenceSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Recurrence')).toBeDefined();
  });

  it('should show frequency selector', () => {
    renderWithProvider(
      <RecurrenceSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Repeat')).toBeDefined();
  });

  it('should show Save button', () => {
    renderWithProvider(
      <RecurrenceSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Save')).toBeDefined();
  });

  it('should call onSave and onClose when Save is clicked', () => {
    renderWithProvider(
      <RecurrenceSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Save'));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show Remove recurrence button when value exists', () => {
    const weeklyValue = JSON.stringify({
      frequency: 'weekly',
      daysOfWeek: [1],
    });

    renderWithProvider(
      <RecurrenceSheet
        opened={true}
        onClose={mockOnClose}
        value={weeklyValue}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Remove recurrence')).toBeDefined();
  });

  it('should call onSave with null when Remove recurrence is clicked', () => {
    const weeklyValue = JSON.stringify({
      frequency: 'weekly',
      daysOfWeek: [1],
    });

    renderWithProvider(
      <RecurrenceSheet
        opened={true}
        onClose={mockOnClose}
        value={weeklyValue}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Remove recurrence'));

    expect(mockOnSave).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not show Remove button when no value', () => {
    renderWithProvider(
      <RecurrenceSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Remove recurrence')).toBeNull();
  });
});
