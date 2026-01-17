/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from '../BottomSheet';
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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('BottomSheet', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render content when not opened', () => {
    renderWithProvider(
      <BottomSheet opened={false} onClose={mockOnClose}>
        <div>Sheet content</div>
      </BottomSheet>
    );

    expect(screen.queryByText('Sheet content')).toBeNull();
  });

  it('should render content when opened', () => {
    renderWithProvider(
      <BottomSheet opened={true} onClose={mockOnClose}>
        <div>Sheet content</div>
      </BottomSheet>
    );

    expect(screen.getByText('Sheet content')).toBeDefined();
  });

  it('should render title when provided', () => {
    renderWithProvider(
      <BottomSheet opened={true} onClose={mockOnClose} title="Settings">
        <div>Sheet content</div>
      </BottomSheet>
    );

    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('should render close button when title is present and withCloseButton is true', () => {
    renderWithProvider(
      <BottomSheet
        opened={true}
        onClose={mockOnClose}
        title="Settings"
        withCloseButton={true}
      >
        <div>Sheet content</div>
      </BottomSheet>
    );

    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
  });

  it('should call onClose when close button is clicked', () => {
    renderWithProvider(
      <BottomSheet
        opened={true}
        onClose={mockOnClose}
        title="Settings"
        withCloseButton={true}
      >
        <div>Sheet content</div>
      </BottomSheet>
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not render close button when withCloseButton is false', () => {
    renderWithProvider(
      <BottomSheet
        opened={true}
        onClose={mockOnClose}
        title="Settings"
        withCloseButton={false}
      >
        <div>Sheet content</div>
      </BottomSheet>
    );

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('should render with different sizes', () => {
    const { rerender } = renderWithProvider(
      <BottomSheet opened={true} onClose={mockOnClose} size="sm">
        <div>Small sheet</div>
      </BottomSheet>
    );

    expect(screen.getByText('Small sheet')).toBeDefined();

    rerender(
      <MantineProvider>
        <BottomSheet opened={true} onClose={mockOnClose} size="lg">
          <div>Large sheet</div>
        </BottomSheet>
      </MantineProvider>
    );

    expect(screen.getByText('Large sheet')).toBeDefined();
  });

  it('should render without handle when withHandle is false', () => {
    renderWithProvider(
      <BottomSheet opened={true} onClose={mockOnClose} withHandle={false}>
        <div>No handle</div>
      </BottomSheet>
    );

    // Content should still render
    expect(screen.getByText('No handle')).toBeDefined();
  });
});
