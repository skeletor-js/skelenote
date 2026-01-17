/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyChip } from '../PropertyChip';
import { MantineProvider } from '@mantine/core';
import { Calendar } from 'lucide-react';

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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('PropertyChip', () => {
  const mockOnPress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render label when no value is provided', () => {
    renderWithProvider(
      <PropertyChip icon={Calendar} label="Due Date" onPress={mockOnPress} />
    );

    expect(screen.getByText('Due Date')).toBeDefined();
  });

  it('should render value instead of label when value is provided', () => {
    renderWithProvider(
      <PropertyChip
        icon={Calendar}
        label="Due Date"
        value="Tomorrow"
        onPress={mockOnPress}
      />
    );

    expect(screen.getByText('Tomorrow')).toBeDefined();
    expect(screen.queryByText('Due Date')).toBeNull();
  });

  it('should call onPress when clicked', () => {
    renderWithProvider(
      <PropertyChip icon={Calendar} label="Due Date" onPress={mockOnPress} />
    );

    const chip = screen.getByRole('button');
    fireEvent.click(chip);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should apply different styling when value is present', () => {
    const { rerender } = renderWithProvider(
      <PropertyChip icon={Calendar} label="Due Date" onPress={mockOnPress} />
    );

    const chipWithoutValue = screen.getByRole('button');
    const bgWithoutValue = chipWithoutValue.style.backgroundColor;

    rerender(
      <MantineProvider>
        <PropertyChip
          icon={Calendar}
          label="Due Date"
          value="Today"
          onPress={mockOnPress}
        />
      </MantineProvider>
    );

    const chipWithValue = screen.getByRole('button');
    const bgWithValue = chipWithValue.style.backgroundColor;

    // Background colors should be different based on hasValue
    expect(bgWithoutValue).not.toBe(bgWithValue);
  });

  it('should render with custom color', () => {
    renderWithProvider(
      <PropertyChip
        icon={Calendar}
        label="Due Date"
        onPress={mockOnPress}
        color="red"
      />
    );

    // Component should render without error
    expect(screen.getByText('Due Date')).toBeDefined();
  });
});
