/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnimatedCheckbox } from '../AnimatedCheckbox';
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

// Mock framer-motion to avoid animation issues in tests
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
  useHaptics: vi.fn(() => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  })),
  useReducedMotion: vi.fn(() => false),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('AnimatedCheckbox', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render unchecked state', () => {
    renderWithProvider(
      <AnimatedCheckbox checked={false} onChange={mockOnChange} />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDefined();
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
  });

  it('should render checked state', () => {
    renderWithProvider(
      <AnimatedCheckbox checked={true} onChange={mockOnChange} />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
  });

  it('should call onChange when clicked', () => {
    renderWithProvider(
      <AnimatedCheckbox checked={false} onChange={mockOnChange} />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('should call onChange with false when checked and clicked', () => {
    renderWithProvider(
      <AnimatedCheckbox checked={true} onChange={mockOnChange} />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith(false);
  });

  it('should not call onChange when disabled', () => {
    renderWithProvider(
      <AnimatedCheckbox
        checked={false}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should have reduced opacity when disabled', () => {
    renderWithProvider(
      <AnimatedCheckbox
        checked={false}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.style.opacity).toBe('0.5');
  });

  it('should apply custom aria-label', () => {
    renderWithProvider(
      <AnimatedCheckbox
        checked={false}
        onChange={mockOnChange}
        aria-label="Mark task complete"
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.getAttribute('aria-label')).toBe('Mark task complete');
  });

  it('should have default aria-label based on checked state', () => {
    const { rerender } = renderWithProvider(
      <AnimatedCheckbox checked={false} onChange={mockOnChange} />
    );

    expect(screen.getByRole('checkbox').getAttribute('aria-label')).toBe(
      'Unchecked'
    );

    rerender(
      <MantineProvider>
        <AnimatedCheckbox checked={true} onChange={mockOnChange} />
      </MantineProvider>
    );

    expect(screen.getByRole('checkbox').getAttribute('aria-label')).toBe(
      'Checked'
    );
  });

  it('should apply custom size', () => {
    renderWithProvider(
      <AnimatedCheckbox checked={false} onChange={mockOnChange} size={24} />
    );

    // The touch target size should always be 44 for iOS accessibility
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.style.width).toBe('44px');
    expect(checkbox.style.height).toBe('44px');
  });
});
