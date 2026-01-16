/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { DeviceRegistryProvider, useDeviceRegistry } from '../DeviceRegistryContext';
import * as devicesLib from '@/lib/devices';


// Mock SyncContext
const mockSyncClient = {
    onDeviceRegistry: vi.fn(),
    onDeviceRegistryUpdate: vi.fn(),
    onDeviceRevokeReceived: vi.fn(),
    onDeviceRenameReceived: vi.fn(),
    onDeviceRevoked: vi.fn(),
    sendDeviceRename: vi.fn(),
    sendDeviceRevoke: vi.fn(),
    sendDeviceRegistryUpdate: vi.fn(),
};

vi.mock('../SyncContext', () => ({
    useSyncContextSafe: () => ({
        syncClient: mockSyncClient,
    }),
}));

const mockAddToast = vi.fn();
vi.mock('../ToastContext', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock libraries
vi.mock('@/lib/sync', () => ({
    getDeviceId: vi.fn().mockReturnValue('current-device'),
}));

vi.mock('@/lib/sync/local', () => ({
    broadcastDeviceRegistry: vi.fn(),
    broadcastDeviceRevoke: vi.fn(),
}));

const mockRegistryStore = {
    isInitialized: vi.fn(),
    initialize: vi.fn(),
    getAllDevices: vi.fn(),
    getRevokedDeviceIds: vi.fn(),
    onRegistryChange: vi.fn(),
    setBroadcastCallback: vi.fn(),
    registerCurrentDevice: vi.fn(),
    getDevice: vi.fn(),
    renameDevice: vi.fn(),
    revokeDevice: vi.fn(),
    handleSyncUpdate: vi.fn(),
};

vi.mock('@/lib/devices', () => ({
    getDeviceRegistryStore: vi.fn(() => mockRegistryStore),
    getSigningPublicKey: vi.fn(),
    createSignedRevocation: vi.fn(),
    verifyRevocation: vi.fn(),
    blockDevice: vi.fn(),
}));

describe('DeviceRegistryContext', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DeviceRegistryProvider>{children}</DeviceRegistryProvider>
    );

    const device1 = { deviceId: 'current-device', name: 'Device 1', lastSeen: 100 };
    const device2 = { deviceId: 'other-device', name: 'Device 2', lastSeen: 200 };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        mockRegistryStore.isInitialized.mockReturnValue(true);
        mockRegistryStore.getAllDevices.mockReturnValue([device1, device2]);
        mockRegistryStore.getRevokedDeviceIds.mockReturnValue([]);
        mockRegistryStore.onRegistryChange.mockReturnValue(() => { });
        mockRegistryStore.getDevice.mockImplementation((id) =>
            id === 'current-device' ? device1 : id === 'other-device' ? device2 : undefined
        );

        vi.mocked(devicesLib.getSigningPublicKey).mockResolvedValue('pub-key');
        vi.mocked(devicesLib.verifyRevocation).mockResolvedValue(true);
    });

    it('should initialize and load devices', async () => {
        const { result } = renderHook(() => useDeviceRegistry(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Current device should be first
        expect(result.current.devices).toHaveLength(2);
        expect(result.current.devices[0].deviceId).toBe('current-device');
        expect(result.current.currentDeviceId).toBe('current-device');
    });

    it('should register current device', async () => {
        const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.registerCurrentDevice();
        });

        expect(mockRegistryStore.registerCurrentDevice).toHaveBeenCalled();
        expect(devicesLib.getSigningPublicKey).toHaveBeenCalled();
    });

    it('should rename device', async () => {
        const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.renameDevice('other-device', 'New Name');
        });

        expect(mockRegistryStore.renameDevice).toHaveBeenCalledWith('other-device', 'New Name');
        expect(mockSyncClient.sendDeviceRename).toHaveBeenCalled();
    });

    it('should revoke device', async () => {
        const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const revocation = {
            deviceId: 'other-device',
            revokedBy: 'current-device',
            revokedAt: 123,
            reason: 'lost',
            signature: 'sig',
        };
        vi.mocked(devicesLib.createSignedRevocation).mockResolvedValue(revocation);

        await act(async () => {
            await result.current.revokeDevice('other-device', 'lost');
        });

        expect(devicesLib.createSignedRevocation).toHaveBeenCalledWith('other-device', 'current-device', 'lost');
        expect(mockRegistryStore.revokeDevice).toHaveBeenCalledWith(revocation);
        expect(devicesLib.blockDevice).toHaveBeenCalledWith('other-device');
        expect(mockSyncClient.sendDeviceRevoke).toHaveBeenCalled();
    });

    it('should handle incoming registry sync', async () => {
        // We need to capture the callback passed to syncClient
        const { result } = renderHook(() => useDeviceRegistry(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Force effect to run by ensuring deps are ready
        // The effect runs when syncClient is available.

        // Verify wiring
        expect(mockSyncClient.onDeviceRegistry).toHaveBeenCalled();

        // Simulate incoming sync
        const handler = mockSyncClient.onDeviceRegistry.mock.calls[0][0];
        const data = new Uint8Array([1, 2, 3]);

        act(() => {
            handler(data);
        });

        expect(mockRegistryStore.handleSyncUpdate).toHaveBeenCalledWith(data);
    });
});
