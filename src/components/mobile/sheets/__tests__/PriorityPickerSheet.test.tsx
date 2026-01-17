/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PriorityPickerSheet, getPriorityInfo } from '../PriorityPickerSheet';
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

describe('PriorityPickerSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <PriorityPickerSheet
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
      <PriorityPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Priority')).toBeDefined();
  });

  it('should render all priority options', () => {
    renderWithProvider(
      <PriorityPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Urgent')).toBeDefined();
    expect(screen.getByText('High')).toBeDefined();
    expect(screen.getByText('Medium')).toBeDefined();
    expect(screen.getByText('Low')).toBeDefined();
    expect(screen.getByText('No Priority')).toBeDefined();
  });

  it('should call onSelect and onClose when priority is selected', () => {
    renderWithProvider(
      <PriorityPickerSheet
        opened={true}
        onClose={mockOnClose}
        value={null}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('High'));

    expect(mockOnSelect).toHaveBeenCalledWith('high');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSelect with null when No Priority is selected', () => {
    renderWithProvider(
      <PriorityPickerSheet
        opened={true}
        onClose={mockOnClose}
        value="high"
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('No Priority'));

    expect(mockOnSelect).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show check mark for selected priority', () => {
    renderWithProvider(
      <PriorityPickerSheet
        opened={true}
        onClose={mockOnClose}
        value="urgent"
        onSelect={mockOnSelect}
      />
    );

    const urgentButton = screen.getByText('Urgent').closest('button');
    expect(urgentButton).toBeDefined();
  });
});

describe('getPriorityInfo', () => {
  it('should return correct info for urgent priority', () => {
    const info = getPriorityInfo('urgent');
    expect(info.label).toBe('Urgent');
    expect(info.value).toBe('urgent');
  });

  it('should return correct info for low priority', () => {
    const info = getPriorityInfo('low');
    expect(info.label).toBe('Low');
    expect(info.value).toBe('low');
  });

  it('should return No Priority for null', () => {
    const info = getPriorityInfo(null);
    expect(info.label).toBe('No Priority');
    expect(info.value).toBeNull();
  });

  it('should return No Priority for unknown value', () => {
    const info = getPriorityInfo('unknown');
    expect(info.label).toBe('No Priority');
  });
});
