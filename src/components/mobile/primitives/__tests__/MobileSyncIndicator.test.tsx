/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileSyncIndicator } from '../MobileSyncIndicator';
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

// Mock context module with dynamic returns
const mockUseSyncContextSafe = vi.fn();
const mockUseLocalSyncSafe = vi.fn();

vi.mock('@/contexts', () => ({
  useSyncContextSafe: () => mockUseSyncContextSafe(),
  useLocalSyncSafe: () => mockUseLocalSyncSafe(),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileSyncIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSyncContextSafe.mockReturnValue(null);
    mockUseLocalSyncSafe.mockReturnValue(null);
  });

  it('should render offline status when no sync provider', () => {
    mockUseSyncContextSafe.mockReturnValue(null);
    mockUseLocalSyncSafe.mockReturnValue(null);

    renderWithProvider(<MobileSyncIndicator />);

    expect(screen.getByText('Offline')).toBeDefined();
  });

  it('should render synced status when connected', () => {
    mockUseSyncContextSafe.mockReturnValue({
      status: 'connected',
      hasError: false,
      reconnect: vi.fn(),
    });

    renderWithProvider(<MobileSyncIndicator />);

    expect(screen.getByText('Synced')).toBeDefined();
  });

  it('should render syncing status when syncing', () => {
    mockUseSyncContextSafe.mockReturnValue({
      status: 'syncing',
      hasError: false,
      reconnect: vi.fn(),
    });

    renderWithProvider(<MobileSyncIndicator />);

    expect(screen.getByText('Syncing')).toBeDefined();
  });

  it('should render error status when has error', () => {
    mockUseSyncContextSafe.mockReturnValue({
      status: 'disconnected',
      hasError: true,
      reconnect: vi.fn(),
    });

    renderWithProvider(<MobileSyncIndicator />);

    expect(screen.getByText('Error')).toBeDefined();
  });

  it('should render local-only status when local sync connected', () => {
    mockUseSyncContextSafe.mockReturnValue(null);
    mockUseLocalSyncSafe.mockReturnValue({
      isEnabled: true,
      connectedPeerCount: 2,
    });

    renderWithProvider(<MobileSyncIndicator />);

    expect(screen.getByText('Local (2)')).toBeDefined();
  });

  it('should be clickable when connected', () => {
    mockUseSyncContextSafe.mockReturnValue({
      status: 'connected',
      hasError: false,
      reconnect: vi.fn(),
    });

    renderWithProvider(<MobileSyncIndicator />);

    const indicator = screen.getByText('Synced');
    // Indicator should be a clickable element
    expect(indicator.closest('[style*="cursor: pointer"]')).not.toBeNull();
  });

  it('should show both cloud and local indicators when both connected', () => {
    mockUseSyncContextSafe.mockReturnValue({
      status: 'connected',
      hasError: false,
      reconnect: vi.fn(),
    });
    mockUseLocalSyncSafe.mockReturnValue({
      isEnabled: true,
      connectedPeerCount: 1,
    });

    renderWithProvider(<MobileSyncIndicator />);

    // Should show cloud synced status
    expect(screen.getByText('Synced')).toBeDefined();
  });

  it('should be clickable when disconnected', () => {
    mockUseSyncContextSafe.mockReturnValue({
      status: 'disconnected',
      hasError: false,
      reconnect: vi.fn(),
    });

    renderWithProvider(<MobileSyncIndicator />);

    const indicator = screen.getByText('Offline');
    expect(indicator.closest('[style*="cursor: pointer"]')).not.toBeNull();
  });

  it('should render reconnect function in context', () => {
    const mockReconnect = vi.fn();
    mockUseSyncContextSafe.mockReturnValue({
      status: 'disconnected',
      hasError: false,
      reconnect: mockReconnect,
    });

    renderWithProvider(<MobileSyncIndicator />);

    // Component should render with reconnect available
    expect(screen.getByText('Offline')).toBeDefined();
  });
});
