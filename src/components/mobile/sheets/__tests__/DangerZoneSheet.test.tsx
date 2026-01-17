/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DangerZoneSheet } from '../DangerZoneSheet';
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

describe('DangerZoneSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnResetVault = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={false}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={true}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Danger Zone')).toBeDefined();
  });

  it('should show warning alert', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={true}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    expect(screen.getByText('Warning')).toBeDefined();
    expect(
      screen.getByText(/Actions in this section are irreversible/)
    ).toBeDefined();
  });

  it('should show Reset Vault button initially', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={true}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    expect(screen.getByRole('button', { name: /Reset Vault/i })).toBeDefined();
  });

  it('should show confirmation input when Reset Vault is clicked', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={true}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Reset Vault/i }));

    expect(screen.getByPlaceholderText('Type DELETE')).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Permanently Delete Everything/i })
    ).toBeDefined();
  });

  it('should disable delete button until confirmation text matches', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={true}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Reset Vault/i }));

    const deleteButton = screen.getByRole('button', {
      name: /Permanently Delete Everything/i,
    });
    expect(deleteButton).toHaveProperty('disabled', true);
  });

  it('should enable delete button when DELETE is typed', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={true}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Reset Vault/i }));

    const input = screen.getByPlaceholderText('Type DELETE');
    fireEvent.change(input, { target: { value: 'DELETE' } });

    const deleteButton = screen.getByRole('button', {
      name: /Permanently Delete Everything/i,
    });
    expect(deleteButton).toHaveProperty('disabled', false);
  });

  it('should call onResetVault and onClose when delete is confirmed', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={true}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Reset Vault/i }));

    const input = screen.getByPlaceholderText('Type DELETE');
    fireEvent.change(input, { target: { value: 'DELETE' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Permanently Delete Everything/i })
    );

    expect(mockOnResetVault).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should hide confirmation when Cancel is clicked', () => {
    renderWithProvider(
      <DangerZoneSheet
        opened={true}
        onClose={mockOnClose}
        onResetVault={mockOnResetVault}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Reset Vault/i }));
    expect(screen.getByPlaceholderText('Type DELETE')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByPlaceholderText('Type DELETE')).toBeNull();
  });
});
