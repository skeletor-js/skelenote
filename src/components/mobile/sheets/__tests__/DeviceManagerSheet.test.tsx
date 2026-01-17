/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceManagerSheet } from '../DeviceManagerSheet';
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

// Mock BottomSheet
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

// Mock device registry context
const mockRenameDevice = vi.fn();
const mockRevokeDevice = vi.fn();
const mockRefresh = vi.fn();
const mockDevices = [
  {
    deviceId: 'device-1',
    name: 'My MacBook',
    platform: 'macos' as const,
    lastSeen: Date.now(),
    isCurrentDevice: true,
    isRevoked: false,
  },
  {
    deviceId: 'device-2',
    name: 'Work Laptop',
    platform: 'windows' as const,
    lastSeen: Date.now() - 3600000,
    isCurrentDevice: false,
    isRevoked: false,
  },
  {
    deviceId: 'device-3',
    name: 'Old Phone',
    platform: 'ios' as const,
    lastSeen: Date.now() - 86400000,
    isCurrentDevice: false,
    isRevoked: true,
  },
];

vi.mock('@/contexts/DeviceRegistryContext', () => ({
  useDeviceRegistrySafe: vi.fn(() => ({
    devices: mockDevices,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    renameDevice: mockRenameDevice,
    revokeDevice: mockRevokeDevice,
  })),
}));

// Mock contexts
vi.mock('@/contexts', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock hooks
vi.mock('@/hooks', () => ({
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}));

// Mock device lib
vi.mock('@/lib/devices', () => ({
  formatLastSeen: vi.fn((timestamp) => {
    if (Date.now() - timestamp < 60000) return 'Just now';
    if (Date.now() - timestamp < 3600000) return '1 hour ago';
    return '1 day ago';
  }),
  getPlatformDisplayName: vi.fn((platform) => {
    const names: Record<string, string> = {
      macos: 'macOS',
      windows: 'Windows',
      ios: 'iOS',
      android: 'Android',
      linux: 'Linux',
    };
    return names[platform] || platform;
  }),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('DeviceManagerSheet', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRenameDevice.mockResolvedValue(undefined);
    mockRevokeDevice.mockResolvedValue(undefined);
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Manage Devices')).toBeDefined();
  });

  it('should show devices with vault access text', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Devices with vault access')).toBeDefined();
  });

  it('should show active devices section', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Active Devices')).toBeDefined();
  });

  it('should show current device with badge', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('My MacBook')).toBeDefined();
    expect(screen.getByText('This device')).toBeDefined();
  });

  it('should show other active devices', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Work Laptop')).toBeDefined();
  });

  it('should show revoked devices section', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Revoked Devices')).toBeDefined();
    expect(screen.getByText('Old Phone')).toBeDefined();
    expect(screen.getByText('Revoked')).toBeDefined();
  });

  it('should show rename and revoke buttons for non-current devices', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    // Should have action buttons for Work Laptop (non-current device)
    const renameButtons = screen.getAllByRole('button', {
      name: 'Rename device',
    });
    const revokeButtons = screen.getAllByRole('button', {
      name: 'Revoke device access',
    });

    expect(renameButtons.length).toBeGreaterThanOrEqual(1);
    expect(revokeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should show rename state when rename button clicked', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    const renameButton = screen.getByRole('button', { name: 'Rename device' });
    fireEvent.click(renameButton);

    expect(screen.getByText('Rename Device')).toBeDefined();
    expect(screen.getByText('Enter a new name for this device.')).toBeDefined();
    expect(screen.getByLabelText('Device Name')).toBeDefined();
  });

  it('should show revoke state when revoke button clicked', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    const revokeButton = screen.getByRole('button', {
      name: 'Revoke device access',
    });
    fireEvent.click(revokeButton);

    // Title and button both say "Revoke Access"
    const revokeAccessTexts = screen.getAllByText('Revoke Access');
    expect(revokeAccessTexts.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(/This will permanently revoke access/)
    ).toBeDefined();
  });

  it('should have cancel button in rename state', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    const renameButton = screen.getByRole('button', { name: 'Rename device' });
    fireEvent.click(renameButton);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });

  it('should have cancel button in revoke state', () => {
    renderWithProvider(
      <DeviceManagerSheet opened={true} onClose={mockOnClose} />
    );

    const revokeButton = screen.getByRole('button', {
      name: 'Revoke device access',
    });
    fireEvent.click(revokeButton);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });
});
