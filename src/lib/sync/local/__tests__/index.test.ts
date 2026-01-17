/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as localSync from '../index';

const mockInvoke = vi.fn();
const mockListen = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

describe('Local Sync Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Server Commands', () => {
    it('startServer calls network_start_server', async () => {
      mockInvoke.mockResolvedValue(1234);
      expect(await localSync.startServer()).toBe(1234);
      expect(mockInvoke).toHaveBeenCalledWith('network_start_server');
    });

    it('stopServer calls network_stop_server', async () => {
      await localSync.stopServer();
      expect(mockInvoke).toHaveBeenCalledWith('network_stop_server');
    });

    it('getServerInfo', async () => {
      const info = { running: true, port: 8080 };
      mockInvoke.mockResolvedValue(info);
      expect(await localSync.getServerInfo()).toEqual(info);
      expect(mockInvoke).toHaveBeenCalledWith('network_get_server_info');
    });
  });

  describe('Discovery Commands', () => {
    it('startDiscovery calls network_start_discovery', async () => {
      await localSync.startDiscovery();
      expect(mockInvoke).toHaveBeenCalledWith('network_start_discovery');
    });

    it('getDiscoveredPeers', async () => {
      const peers = [{ deviceId: '1' }];
      mockInvoke.mockResolvedValue(peers);
      expect(await localSync.getDiscoveredPeers()).toEqual(peers);
    });
  });

  describe('Pairing', () => {
    it('generatePairingQr', async () => {
      const res = { pngBase64: 'png' };
      mockInvoke.mockResolvedValue(res);
      expect(await localSync.generatePairingQr()).toEqual(res);
      expect(mockInvoke).toHaveBeenCalledWith('pairing_generate_qr');
    });

    it('connectViaManualPairing', async () => {
      await localSync.connectViaManualPairing('ip', 80, 'code');
      expect(mockInvoke).toHaveBeenCalledWith('pairing_connect_manual', {
        ip: 'ip',
        port: 80,
        code: 'code',
      });
    });
  });

  describe('Sync Relay', () => {
    it('broadcastSync', async () => {
      const data = new Uint8Array([1, 2]);
      mockInvoke.mockResolvedValue(5);
      expect(await localSync.broadcastSync(data)).toBe(5);
      expect(mockInvoke).toHaveBeenCalledWith('network_broadcast_sync', {
        data: [1, 2],
      });
    });
  });

  describe('Events', () => {
    it('onPeerConnected subscribes to list', async () => {
      const cb = vi.fn();
      const unlisten = vi.fn();
      mockListen.mockResolvedValue(unlisten);

      await localSync.onPeerConnected(cb);

      expect(mockListen).toHaveBeenCalledWith(
        'local-peer-connected',
        expect.any(Function)
      );

      // Simulate event
      const handler = mockListen.mock.calls[0][1];
      handler({ payload: { deviceId: '1' } });
      expect(cb).toHaveBeenCalledWith({ deviceId: '1' });
    });
  });
});
