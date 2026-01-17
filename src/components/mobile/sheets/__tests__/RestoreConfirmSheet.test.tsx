/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RestoreConfirmSheet } from '../RestoreConfirmSheet';
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

describe('RestoreConfirmSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={false}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Restore Version')).toBeDefined();
  });

  it('should show version name', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Yesterday, 10:00 AM"
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Yesterday, 10:00 AM')).toBeDefined();
  });

  it('should show object name if provided', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        objectName="My Important Note"
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('My Important Note')).toBeDefined();
  });

  it('should show warning about CRDT merge', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('About restoring versions')).toBeDefined();
    expect(screen.getByText(/Skelenote uses CRDT/)).toBeDefined();
  });

  it('should show Cancel and Restore buttons', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeDefined();
  });

  it('should call onConfirm with single scope by default', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));

    expect(mockOnConfirm).toHaveBeenCalledWith('single');
  });

  it('should call onClose when Cancel is clicked', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show restore all option when showRestoreAllOption is true', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        showRestoreAllOption={true}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('What to restore')).toBeDefined();
    expect(screen.getByText('Restore this object only')).toBeDefined();
    expect(screen.getByText('Restore all objects')).toBeDefined();
  });

  it('should disable Cancel button when restoring', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        onConfirm={mockOnConfirm}
        isRestoring={true}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toHaveProperty('disabled', true);
  });

  it('should not close when restoring', () => {
    renderWithProvider(
      <RestoreConfirmSheet
        opened={true}
        onClose={mockOnClose}
        versionName="Today, 2:30 PM"
        onConfirm={mockOnConfirm}
        isRestoring={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
