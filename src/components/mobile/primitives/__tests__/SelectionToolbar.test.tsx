/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionToolbar } from '../SelectionToolbar';
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock hooks
vi.mock('@/hooks', () => ({
  useReducedMotion: vi.fn(() => false),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('SelectionToolbar', () => {
  const mockOnClear = vi.fn();
  const mockOnActionsPress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when visible and count > 0', () => {
    renderWithProvider(
      <SelectionToolbar
        count={3}
        visible={true}
        onClear={mockOnClear}
        onActionsPress={mockOnActionsPress}
      />
    );

    expect(screen.getByText('3 selected')).toBeDefined();
  });

  it('should not render when visible is false', () => {
    renderWithProvider(
      <SelectionToolbar
        count={3}
        visible={false}
        onClear={mockOnClear}
        onActionsPress={mockOnActionsPress}
      />
    );

    expect(screen.queryByText('3 selected')).toBeNull();
  });

  it('should not render when count is 0', () => {
    renderWithProvider(
      <SelectionToolbar
        count={0}
        visible={true}
        onClear={mockOnClear}
        onActionsPress={mockOnActionsPress}
      />
    );

    expect(screen.queryByText('0 selected')).toBeNull();
  });

  it('should display correct count', () => {
    const { rerender } = renderWithProvider(
      <SelectionToolbar
        count={5}
        visible={true}
        onClear={mockOnClear}
        onActionsPress={mockOnActionsPress}
      />
    );

    expect(screen.getByText('5 selected')).toBeDefined();

    rerender(
      <MantineProvider>
        <SelectionToolbar
          count={12}
          visible={true}
          onClear={mockOnClear}
          onActionsPress={mockOnActionsPress}
        />
      </MantineProvider>
    );

    expect(screen.getByText('12 selected')).toBeDefined();
  });

  it('should call onClear when clear button is pressed', () => {
    renderWithProvider(
      <SelectionToolbar
        count={3}
        visible={true}
        onClear={mockOnClear}
        onActionsPress={mockOnActionsPress}
      />
    );

    const clearButton = screen.getByRole('button', { name: 'Clear selection' });
    fireEvent.click(clearButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it('should call onActionsPress when actions button is pressed', () => {
    renderWithProvider(
      <SelectionToolbar
        count={3}
        visible={true}
        onClear={mockOnClear}
        onActionsPress={mockOnActionsPress}
      />
    );

    const actionsButton = screen.getByRole('button', { name: 'Actions menu' });
    fireEvent.click(actionsButton);

    expect(mockOnActionsPress).toHaveBeenCalledTimes(1);
  });

  it('should have accessible live region for count', () => {
    renderWithProvider(
      <SelectionToolbar
        count={3}
        visible={true}
        onClear={mockOnClear}
        onActionsPress={mockOnActionsPress}
      />
    );

    const countText = screen.getByText('3 selected');
    expect(countText.getAttribute('aria-live')).toBe('polite');
    expect(countText.getAttribute('aria-atomic')).toBe('true');
  });

  it('should render Clear and Actions text', () => {
    renderWithProvider(
      <SelectionToolbar
        count={3}
        visible={true}
        onClear={mockOnClear}
        onActionsPress={mockOnActionsPress}
      />
    );

    expect(screen.getByText('Clear')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });
});
