/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FAB } from '../FAB';
import { MantineProvider } from '@mantine/core';
import { Edit } from 'lucide-react';

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
    button: ({
      children,
      onClick,
      'aria-label': ariaLabel,
      style,
    }: React.PropsWithChildren<{
      onClick?: () => void;
      'aria-label'?: string;
      style?: React.CSSProperties;
    }>) => (
      <button onClick={onClick} aria-label={ariaLabel} style={style}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock hooks
const mockImpact = vi.fn();
vi.mock('@/hooks', () => ({
  usePlatform: vi.fn(() => ({
    safeAreaBottom: 0,
    isMobile: true,
    isIOS: true,
    isAndroid: false,
  })),
  useHaptics: vi.fn(() => ({
    impact: mockImpact,
    notification: vi.fn(),
    selection: vi.fn(),
  })),
  useReducedMotion: vi.fn(() => false),
  useScrollDirection: vi.fn(() => ({
    isVisible: true,
    direction: 'up',
  })),
}));

// Mock BottomTabBar constant
vi.mock('@/components/layout/BottomTabBar', () => ({
  TAB_BAR_HEIGHT: 56,
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('FAB', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockImpact.mockResolvedValue(undefined);
  });

  it('should render when visible is true', () => {
    renderWithProvider(<FAB onClick={mockOnClick} visible={true} />);

    expect(screen.getByRole('button')).toBeDefined();
  });

  it('should not render when visible is false', () => {
    renderWithProvider(<FAB onClick={mockOnClick} visible={false} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should have default aria-label', () => {
    renderWithProvider(<FAB onClick={mockOnClick} />);

    expect(screen.getByRole('button', { name: 'Create new' })).toBeDefined();
  });

  it('should use custom label for aria-label', () => {
    renderWithProvider(<FAB onClick={mockOnClick} label="Add task" />);

    expect(screen.getByRole('button', { name: 'Add task' })).toBeDefined();
  });

  it('should call onClick when clicked', async () => {
    renderWithProvider(<FAB onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  it('should trigger haptic feedback on click', async () => {
    renderWithProvider(<FAB onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockImpact).toHaveBeenCalledWith('light');
    });
  });

  it('should render custom icon', () => {
    renderWithProvider(<FAB onClick={mockOnClick} icon={Edit} label="Edit" />);

    expect(screen.getByRole('button', { name: 'Edit' })).toBeDefined();
  });

  it('should be positioned fixed', () => {
    renderWithProvider(<FAB onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button.style.position).toBe('fixed');
  });

  it('should have proper dimensions', () => {
    renderWithProvider(<FAB onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button.style.width).toBe('56px');
    expect(button.style.height).toBe('56px');
  });
});
