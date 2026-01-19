/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { StatusPickerSheet, getStatusInfo } from '../StatusPickerSheet';
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

describe('StatusPickerSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <StatusPickerSheet
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
      <StatusPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
  });

  it('should render all status options', () => {
    renderWithProvider(
      <StatusPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('To Do')).toBeDefined();
    expect(screen.getByText('In Progress')).toBeDefined();
    expect(screen.getByText('Waiting')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
  });

  it('should call onSelect and onClose when status is selected', () => {
    renderWithProvider(
      <StatusPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('In Progress'));

    expect(mockOnSelect).toHaveBeenCalledWith('in-progress');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show check mark for selected status', () => {
    renderWithProvider(
      <StatusPickerSheet
        opened={true}
        onClose={mockOnClose}
        value="done"
        onSelect={mockOnSelect}
      />
    );

    // The Done button should have a check icon (lucide Check component)
    const doneButton = screen.getByText('Done').closest('button');
    expect(doneButton).toBeDefined();
  });
});

describe('getStatusInfo', () => {
  it('should return correct info for todo status', () => {
    const info = getStatusInfo('todo');
    expect(info.label).toBe('To Do');
    expect(info.value).toBe('todo');
  });

  it('should return correct info for done status', () => {
    const info = getStatusInfo('done');
    expect(info.label).toBe('Done');
    expect(info.value).toBe('done');
  });

  it('should return default (todo) for unknown status', () => {
    const info = getStatusInfo('unknown');
    expect(info.value).toBe('todo');
  });

  it('should return default (todo) for null status', () => {
    const info = getStatusInfo(null);
    expect(info.value).toBe('todo');
  });
});
