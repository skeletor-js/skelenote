/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';
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
      onClick,
      role,
      ...props
    }: React.PropsWithChildren<{
      onClick?: (e: React.MouseEvent) => void;
      role?: string;
    }>) => (
      <div onClick={onClick} role={role} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock hooks
const mockNotification = vi.fn();
vi.mock('@/hooks', () => ({
  useHaptics: vi.fn(() => ({
    impact: vi.fn(),
    notification: mockNotification,
    selection: vi.fn(),
  })),
  useReducedMotion: vi.fn(() => false),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ConfirmDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotification.mockResolvedValue(undefined);
  });

  it('should not render when not opened', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
      />
    );

    expect(screen.queryByText('Delete item?')).toBeNull();
  });

  it('should render title and message when opened', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
      />
    );

    expect(screen.getByText('Delete item?')).toBeDefined();
    expect(screen.getByText('This action cannot be undone.')).toBeDefined();
  });

  it('should render default button labels', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
      />
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });

  it('should render custom button labels', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeDefined();
  });

  it('should call onClose when cancel button is clicked', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('should trigger warning haptic when opened with destructive', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
        destructive={true}
      />
    );

    expect(mockNotification).toHaveBeenCalledWith('warning');
  });

  it('should close on escape key', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not close on escape when loading', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Deleting..."
        message="Please wait."
        loading={true}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should have proper alertdialog role', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete item?"
        message="This action cannot be undone."
      />
    );

    expect(screen.getByRole('alertdialog')).toBeDefined();
  });

  it('should disable buttons when loading', () => {
    renderWithProvider(
      <ConfirmDialog
        opened={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Deleting..."
        message="Please wait."
        loading={true}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toHaveProperty('disabled', true);
  });
});
