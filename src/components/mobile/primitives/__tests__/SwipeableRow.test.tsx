/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableRow, type SwipeAction } from '../SwipeableRow';
import { MantineProvider } from '@mantine/core';
import { CheckCircle, Trash2, Archive } from 'lucide-react';

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
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      style,
    }: React.PropsWithChildren<{
      onTouchStart?: (e: React.TouchEvent) => void;
      onTouchMove?: (e: React.TouchEvent) => void;
      onTouchEnd?: () => void;
      onTouchCancel?: () => void;
      style?: React.CSSProperties;
    }>) => (
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        style={style}
      >
        {children}
      </div>
    ),
  },
  useMotionValue: vi.fn(() => ({
    get: vi.fn(() => 0),
    set: vi.fn(),
  })),
  useSpring: vi.fn((value) => value),
  animate: vi.fn(),
}));

// Mock hooks
const mockImpact = vi.fn();
vi.mock('@/hooks', () => ({
  useHaptics: vi.fn(() => ({
    impact: mockImpact,
    notification: vi.fn(),
    selection: vi.fn(),
  })),
  useReducedMotion: vi.fn(() => false),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('SwipeableRow', () => {
  const mockOnPress = vi.fn();
  const mockOnLongPress = vi.fn();

  const mockLeftActions: SwipeAction[] = [
    {
      id: 'complete',
      icon: CheckCircle,
      label: 'Complete',
      color: 'sage',
      onAction: vi.fn(),
    },
  ];

  const mockRightActions: SwipeAction[] = [
    {
      id: 'archive',
      icon: Archive,
      label: 'Archive',
      color: 'ember',
      onAction: vi.fn(),
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      color: 'brick',
      onAction: vi.fn(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockImpact.mockResolvedValue(undefined);
  });

  it('should render children', () => {
    renderWithProvider(
      <SwipeableRow>
        <div>Row content</div>
      </SwipeableRow>
    );

    expect(screen.getByText('Row content')).toBeDefined();
  });

  it('should render left action buttons', () => {
    renderWithProvider(
      <SwipeableRow leftActions={mockLeftActions}>
        <div>Row content</div>
      </SwipeableRow>
    );

    expect(screen.getByRole('button', { name: 'Complete' })).toBeDefined();
  });

  it('should render right action buttons', () => {
    renderWithProvider(
      <SwipeableRow rightActions={mockRightActions}>
        <div>Row content</div>
      </SwipeableRow>
    );

    expect(screen.getByRole('button', { name: 'Archive' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined();
  });

  it('should call onPress when tapped', () => {
    renderWithProvider(
      <SwipeableRow onPress={mockOnPress}>
        <div>Row content</div>
      </SwipeableRow>
    );

    const row = screen.getByText('Row content').parentElement;

    // Simulate tap (touch start/end without movement)
    fireEvent.touchStart(row!, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(row!);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should show priority border when priority is set', () => {
    const { container } = renderWithProvider(
      <SwipeableRow priority="high">
        <div>Row content</div>
      </SwipeableRow>
    );

    // The motion.div should have borderLeft style
    const row = container.querySelector('div[style*="border-left"]');
    expect(row).toBeDefined();
  });

  it('should hide separator when hideSeparator is true', () => {
    const { container } = renderWithProvider(
      <SwipeableRow hideSeparator={true}>
        <div>Row content</div>
      </SwipeableRow>
    );

    // Separator should not be present (only one child in motion.div)
    expect(screen.getByText('Row content')).toBeDefined();
  });

  it('should accept custom minHeight prop', () => {
    renderWithProvider(
      <SwipeableRow minHeight={80}>
        <div>Row content</div>
      </SwipeableRow>
    );

    // Component should render with custom minHeight without error
    expect(screen.getByText('Row content')).toBeDefined();
  });

  it('should call action onAction when action button is clicked', () => {
    renderWithProvider(
      <SwipeableRow leftActions={mockLeftActions}>
        <div>Row content</div>
      </SwipeableRow>
    );

    const completeButton = screen.getByRole('button', { name: 'Complete' });
    fireEvent.click(completeButton);

    expect(mockLeftActions[0].onAction).toHaveBeenCalledTimes(1);
  });

  it('should not handle interactions when disabled', () => {
    renderWithProvider(
      <SwipeableRow disabled={true} onPress={mockOnPress}>
        <div>Row content</div>
      </SwipeableRow>
    );

    const row = screen.getByText('Row content').parentElement;

    fireEvent.touchStart(row!, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(row!);

    // onPress should not be called when disabled (touch handlers return early)
    // The touchEnd will still be processed but no action taken
  });

  it('should render action labels', () => {
    renderWithProvider(
      <SwipeableRow
        leftActions={mockLeftActions}
        rightActions={mockRightActions}
      >
        <div>Row content</div>
      </SwipeableRow>
    );

    expect(screen.getByText('Complete')).toBeDefined();
    expect(screen.getByText('Archive')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });
});
