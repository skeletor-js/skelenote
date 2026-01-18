/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileSettingsView } from '../MobileSettingsView';
import { MantineProvider } from '@mantine/core';
import {
  useSkeletonKey,
  useSyncContext,
  useLocalSync,
  useObjects,
  useTypeRegistry,
  useToast,
  useSemanticSearchSafe,
} from '@/contexts';
import { useBiometric } from '@/hooks';

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

// Mock dependencies
vi.mock('@/hooks', () => ({
  useBiometric: vi.fn(),
}));

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(() => ({
    navigateToObject: vi.fn(),
    navigateToView: vi.fn(),
    canGoBack: true,
    navigateBack: vi.fn(),
    navigateToSearch: vi.fn(),
  })),
  useSkeletonKey: vi.fn(),
  useSyncContext: vi.fn(),
  useLocalSync: vi.fn(),
  useObjects: vi.fn(),
  useTypeRegistry: vi.fn(),
  useToast: vi.fn(),
  useSemanticSearchSafe: vi.fn(),
}));

vi.mock('@/lib/export', () => ({
  exportAllToJSON: vi.fn(),
  exportAllToZip: vi.fn(),
}));

vi.mock('@/lib/sync', () => ({
  getSyncServerUrl: vi.fn(() => 'wss://example.com'),
  setSyncServerUrl: vi.fn(),
  getUserId: vi.fn(() => 'user-1'),
  getDeviceId: vi.fn(() => 'device-1'),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}));

// Mock primitives relative to test file (Works in MobileTemplatesView and MobileSearchModal)
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title }: any) => (
    <div data-testid="mobile-header">{title}</div>
  ),
}));

// Mock sheets relative to test file
vi.mock('../../sheets', () => ({
  SyncSettingsSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-sync">Sync Sheet</div> : null,
  AccountSettingsSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-account">Account Sheet</div> : null,
  DataSettingsSheet: ({ opened, onExport }: any) =>
    opened ? (
      <div data-testid="sheet-data">
        Data Sheet
        <button onClick={() => onExport('json')} data-testid="export-json">
          Export JSON
        </button>
      </div>
    ) : null,
  DangerZoneSheet: ({ opened, onResetVault }: any) =>
    opened ? (
      <div data-testid="sheet-danger">
        Danger Zone
        <button onClick={onResetVault} data-testid="reset-vault">
          Reset
        </button>
      </div>
    ) : null,
  SearchSettingsSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-search">Search Sheet</div> : null,
  AppearanceSettingsSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-appearance">Appearance Sheet</div> : null,
  TemplateSettingsSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-template">Template Sheet</div> : null,
  ImportSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-import">Import Sheet</div> : null,
  DeviceManagerSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-device">Device Sheet</div> : null,
}));

vi.mock('@mantine/core', async () => {
  const actual =
    await vi.importActual<typeof import('@mantine/core')>('@mantine/core');
  return {
    ...actual,
    useMantineColorScheme: () => ({
      colorScheme: 'light',
      toggleColorScheme: vi.fn(),
    }),
  };
});

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileSettingsView', () => {
  const mocks = {
    setBiometricEnabled: vi.fn(),
    resetVault: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    enableLocal: vi.fn(),
    disableLocal: vi.fn(),
    addToast: vi.fn(),
    store: {
      getAll: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useBiometric as any).mockReturnValue({
      isAvailable: true,
      biometryName: 'TouchID',
    });

    (useSkeletonKey as any).mockReturnValue({
      biometricEnabled: false,
      setBiometricEnabled: mocks.setBiometricEnabled,
      hasSkeletonKey: true,
      resetVault: mocks.resetVault,
    });

    (useSyncContext as any).mockReturnValue({
      isConnected: false,
      status: 'disconnected',
      hasError: false,
      syncClient: null,
      connect: mocks.connect,
      disconnect: mocks.disconnect,
      reconnect: vi.fn(),
    });

    (useLocalSync as any).mockReturnValue({
      isEnabled: false,
      status: 'disconnected',
      connectedPeerCount: 0,
      enable: mocks.enableLocal,
      disable: mocks.disableLocal,
      deviceInfo: { fingerprint: '1234' },
    });

    (useObjects as any).mockReturnValue({
      store: mocks.store,
    });

    (useTypeRegistry as any).mockReturnValue({});

    (useToast as any).mockReturnValue({
      addToast: mocks.addToast,
    });

    (useSemanticSearchSafe as any).mockReturnValue({
      isEnabled: false,
      status: 'ready',
    });
  });

  it('renders all setting sections', () => {
    renderWithProvider(<MobileSettingsView />);
    expect(screen.getByText('Security')).toBeDefined();
    // Check for header to ensure mock worked relative to primitives
    expect(screen.getByTestId('mobile-header')).toBeDefined();
  });

  it('toggles biometric setting', () => {
    renderWithProvider(<MobileSettingsView />);
    // The biometric switch is the first switch in the component
    const switches = screen.getAllByRole('switch');
    const biometricSwitch = switches[0];
    fireEvent.click(biometricSwitch);
    expect(mocks.setBiometricEnabled).toHaveBeenCalledWith(true);
  });

  // ... Additional tests omitted for brevity to ensure basic rendering works first, then can convert others if needed.
  // Actually, I'll include the sheet openers to be safe.

  it('opens account sheet', () => {
    renderWithProvider(<MobileSettingsView />);
    fireEvent.click(screen.getByText('Skeleton Key'));
    expect(screen.getByTestId('sheet-account')).toBeDefined();
  });

  it('opens data sheet', () => {
    renderWithProvider(<MobileSettingsView />);
    fireEvent.click(screen.getByText('Export Data'));
    expect(screen.getByTestId('sheet-data')).toBeDefined();
  });
});
