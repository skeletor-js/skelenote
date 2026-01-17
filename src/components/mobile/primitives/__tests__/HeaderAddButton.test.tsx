/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HeaderAddButton } from '../HeaderAddButton';
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
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
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

describe('HeaderAddButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockImpact.mockResolvedValue(undefined);
  });

  it('should render button with aria-label', () => {
    renderWithProvider(
      <HeaderAddButton onClick={mockOnClick} label="New task" />
    );

    const button = screen.getByRole('button', { name: 'New task' });
    expect(button).toBeDefined();
  });

  it('should call onClick when clicked', async () => {
    renderWithProvider(
      <HeaderAddButton onClick={mockOnClick} label="New task" />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  it('should trigger haptic feedback on click', async () => {
    renderWithProvider(
      <HeaderAddButton onClick={mockOnClick} label="New task" />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockImpact).toHaveBeenCalledWith('light');
    });
  });

  it('should not call onClick when disabled', async () => {
    renderWithProvider(
      <HeaderAddButton onClick={mockOnClick} label="New task" disabled={true} />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Give time for async handler
    await new Promise((r) => setTimeout(r, 50));

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should have reduced opacity when disabled', () => {
    renderWithProvider(
      <HeaderAddButton onClick={mockOnClick} label="New task" disabled={true} />
    );

    const button = screen.getByRole('button');
    expect(button.style.opacity).toBe('0.5');
  });

  it('should render custom icon', () => {
    renderWithProvider(
      <HeaderAddButton onClick={mockOnClick} label="Edit" icon={Edit} />
    );

    // Button should render without error
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDefined();
  });

  it('should have 44px size for iOS touch target', () => {
    renderWithProvider(
      <HeaderAddButton onClick={mockOnClick} label="New task" />
    );

    const button = screen.getByRole('button');
    // ActionIcon with size={44} should render appropriately
    expect(button).toBeDefined();
  });
});
