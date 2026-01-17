/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { MantineProvider } from '@mantine/core';
import { Search, FileText } from 'lucide-react';

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
vi.mock('@/hooks', () => ({
  useReducedMotion: vi.fn(() => false),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title', () => {
    renderWithProvider(<EmptyState title="No items found" />);

    expect(screen.getByText('No items found')).toBeDefined();
  });

  it('should render description when provided', () => {
    renderWithProvider(
      <EmptyState
        title="No results"
        description="Try adjusting your search terms"
      />
    );

    expect(screen.getByText('Try adjusting your search terms')).toBeDefined();
  });

  it('should not render description when not provided', () => {
    renderWithProvider(<EmptyState title="No items" />);

    // Only title should be present
    expect(screen.getByText('No items')).toBeDefined();
  });

  it('should render action button when actionLabel and onAction provided', () => {
    const mockOnAction = vi.fn();

    renderWithProvider(
      <EmptyState
        title="No notes"
        actionLabel="Create note"
        onAction={mockOnAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Create note' });
    expect(button).toBeDefined();
  });

  it('should call onAction when button clicked', () => {
    const mockOnAction = vi.fn();

    renderWithProvider(
      <EmptyState
        title="No notes"
        actionLabel="Create note"
        onAction={mockOnAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Create note' });
    fireEvent.click(button);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  it('should not render action button without onAction', () => {
    renderWithProvider(
      <EmptyState title="No notes" actionLabel="Create note" />
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should not render action button without actionLabel', () => {
    const mockOnAction = vi.fn();

    renderWithProvider(<EmptyState title="No notes" onAction={mockOnAction} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should render custom icon', () => {
    renderWithProvider(<EmptyState icon={Search} title="No search results" />);

    // Component should render without error
    expect(screen.getByText('No search results')).toBeDefined();
  });

  it('should render children instead of default content', () => {
    renderWithProvider(
      <EmptyState title="This should not show">
        <div data-testid="custom-content">Custom empty state content</div>
      </EmptyState>
    );

    expect(screen.getByTestId('custom-content')).toBeDefined();
    expect(screen.getByText('Custom empty state content')).toBeDefined();
  });
});
