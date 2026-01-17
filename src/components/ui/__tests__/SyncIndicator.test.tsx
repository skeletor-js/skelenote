/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncIndicator } from '../SyncIndicator';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import * as contexts from '@/contexts';

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

// Mock contexts
vi.mock('@/contexts', () => ({
  useSyncContextSafe: vi.fn(),
  useLocalSyncSafe: vi.fn(),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('SyncIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks

    (contexts.useSyncContextSafe as any).mockReturnValue({
      status: 'disconnected',
      pendingCount: 0,
      hasError: false,
      reconnect: vi.fn(),
    });

    (contexts.useLocalSyncSafe as any).mockReturnValue({
      isEnabled: true,
      connectedPeerCount: 0,
    });
  });

  it('should render "Offline" when disconnected', () => {
    (contexts.useSyncContextSafe as any).mockReturnValue({
      status: 'disconnected',
      pendingCount: 0,
      hasError: false,
      reconnect: vi.fn(),
    });

    renderWithProvider(<SyncIndicator />);
    expect(screen.getByText('Offline')).toBeDefined();
  });

  it('should render "Synced" when connected', () => {
    (contexts.useSyncContextSafe as any).mockReturnValue({
      status: 'connected',
      pendingCount: 0,
      hasError: false,
      reconnect: vi.fn(),
    });

    renderWithProvider(<SyncIndicator />);
    expect(screen.getByText('Synced')).toBeDefined();
  });

  it('should render local sync status', () => {
    (contexts.useLocalSyncSafe as any).mockReturnValue({
      isEnabled: true,
      connectedPeerCount: 3,
    });

    renderWithProvider(<SyncIndicator />);
    expect(screen.getByText('Local (3)')).toBeDefined();
  });

  it('should render mixed status (Cloud + Local)', () => {
    (contexts.useSyncContextSafe as any).mockReturnValue({
      status: 'connected',
      pendingCount: 0,
      hasError: false,
      reconnect: vi.fn(),
    });

    (contexts.useLocalSyncSafe as any).mockReturnValue({
      isEnabled: true,
      connectedPeerCount: 2,
    });

    renderWithProvider(<SyncIndicator />);
    expect(screen.getByText('Synced +2 local')).toBeDefined();
  });

  it('should render "Local only" when provider missing', () => {
    (contexts.useSyncContextSafe as any).mockReturnValue(null);

    renderWithProvider(<SyncIndicator />);
    expect(screen.getByText('Local only')).toBeDefined();
  });

  it('should render error state', () => {
    (contexts.useSyncContextSafe as any).mockReturnValue({
      status: 'disconnected',
      hasError: true,
      reconnect: vi.fn(),
    });

    renderWithProvider(<SyncIndicator />);
    expect(screen.getByText('Sync error')).toBeDefined();
  });

  it('should call reconnect on click when allowed', () => {
    const reconnect = vi.fn();

    (contexts.useSyncContextSafe as any).mockReturnValue({
      status: 'disconnected',
      reconnect,
    });

    renderWithProvider(<SyncIndicator />);

    // Offline status is clickable
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(reconnect).toHaveBeenCalled();
  });

  it('should show pending count', () => {
    (contexts.useSyncContextSafe as any).mockReturnValue({
      status: 'connected',
      pendingCount: 5,
    });

    renderWithProvider(<SyncIndicator />);
    expect(screen.getByText('(5)')).toBeDefined();
  });
});
