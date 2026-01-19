/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ReminderSheet } from '../ReminderSheet';
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

describe('ReminderSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set a fixed date for consistent test behavior
    vi.setSystemTime(new Date(2024, 5, 15, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <ReminderSheet
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
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Reminder')).toBeDefined();
  });

  it('should show preset options', () => {
    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('In 15 minutes')).toBeDefined();
    expect(screen.getByText('In 1 hour')).toBeDefined();
    expect(screen.getByText('In 3 hours')).toBeDefined();
    expect(screen.getByText('Tomorrow at 9 AM')).toBeDefined();
  });

  it('should show Pick a time option', () => {
    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Pick a time...')).toBeDefined();
  });

  it('should call onSelect when preset is clicked', () => {
    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('In 15 minutes'));

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show current value when set', () => {
    // Set value to tomorrow at noon
    const tomorrow = new Date(2024, 5, 16, 12, 0, 0).getTime();

    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={tomorrow}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Currently:/)).toBeDefined();
  });

  it('should show Remove reminder button when value is set', () => {
    const tomorrow = new Date(2024, 5, 16, 12, 0, 0).getTime();

    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={tomorrow}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Remove reminder')).toBeDefined();
  });

  it('should call onSelect with null when Remove is clicked', () => {
    const tomorrow = new Date(2024, 5, 16, 12, 0, 0).getTime();

    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={tomorrow}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('Remove reminder'));

    expect(mockOnSelect).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not show Remove button when no value', () => {
    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByText('Remove reminder')).toBeNull();
  });

  it('should show datetime picker when Pick a time is clicked', () => {
    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('Pick a time...'));

    expect(screen.getByText('Pick date and time')).toBeDefined();
    expect(screen.getByText('Set Reminder')).toBeDefined();
  });

  it('should show smart presets when due date is set', () => {
    // Set due date to 3 days from now
    const dueDate = new Date(2024, 5, 18, 10, 0, 0).getTime();

    renderWithProvider(
      <ReminderSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        dueDate={dueDate}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Day before due')).toBeDefined();
    expect(screen.getByText('Morning of due date')).toBeDefined();
  });
});
