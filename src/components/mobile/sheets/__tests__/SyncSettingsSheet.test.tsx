/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { SyncSettingsSheet } from '../SyncSettingsSheet';
import { setupSheetMocks, renderWithProvider } from './test-utils';

setupSheetMocks();

// Mock BottomSheet (must be inline due to vi.mock hoisting)
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

describe('SyncSettingsSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnCloudEnabledChange = vi.fn();
  const mockOnCloudRelayUrlChange = vi.fn();
  const mockOnReconnect = vi.fn();
  const mockOnLocalSyncEnabledChange = vi.fn();
  const mockOnOpenDeviceManager = vi.fn();

  const defaultProps = {
    opened: true,
    onClose: mockOnClose,
    cloudEnabled: true,
    cloudRelayUrl: 'wss://relay.example.com',
    cloudStatus: 'connected' as const,
    onCloudEnabledChange: mockOnCloudEnabledChange,
    onCloudRelayUrlChange: mockOnCloudRelayUrlChange,
    onReconnect: mockOnReconnect,
    localSyncEnabled: true,
    localSyncStatus: 'connected' as const,
    localPeersCount: 2,
    onLocalSyncEnabledChange: mockOnLocalSyncEnabledChange,
    onOpenDeviceManager: mockOnOpenDeviceManager,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(<SyncSettingsSheet {...defaultProps} opened={false} />);

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(<SyncSettingsSheet {...defaultProps} />);

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Sync Settings')).toBeDefined();
  });

  it('should show cloud sync section', () => {
    renderWithProvider(<SyncSettingsSheet {...defaultProps} />);

    expect(screen.getByText('Cloud Sync')).toBeDefined();
  });

  it('should show connected badges when syncs are connected', () => {
    renderWithProvider(<SyncSettingsSheet {...defaultProps} />);

    // Both cloud and local sync show Connected badges
    const connectedBadges = screen.getAllByText('Connected');
    expect(connectedBadges.length).toBe(2);
  });

  it('should show local sync section', () => {
    renderWithProvider(<SyncSettingsSheet {...defaultProps} />);

    expect(screen.getByText('Local Sync')).toBeDefined();
  });

  it('should show peers count when local sync is enabled', () => {
    renderWithProvider(<SyncSettingsSheet {...defaultProps} />);

    expect(screen.getByText('2 devices found')).toBeDefined();
  });

  it('should show device manager link', () => {
    renderWithProvider(<SyncSettingsSheet {...defaultProps} />);

    expect(screen.getByText('Device Manager')).toBeDefined();
    expect(screen.getByText('View and manage paired devices')).toBeDefined();
  });

  it('should show relay server URL when cloud is enabled', () => {
    renderWithProvider(<SyncSettingsSheet {...defaultProps} />);

    expect(screen.getByText('Relay Server')).toBeDefined();
    expect(screen.getByText('wss://relay.example.com')).toBeDefined();
  });

  it('should show reconnect button when disconnected', () => {
    renderWithProvider(
      <SyncSettingsSheet {...defaultProps} cloudStatus="disconnected" />
    );

    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeDefined();
  });

  it('should call onReconnect when reconnect is clicked', () => {
    renderWithProvider(
      <SyncSettingsSheet {...defaultProps} cloudStatus="disconnected" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(mockOnReconnect).toHaveBeenCalledTimes(1);
  });
});
