/**
 * Local Network Sync Module
 *
 * TypeScript bindings for the Rust local network sync backend.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// Types

export interface ServerInfo {
  running: boolean;
  port: number | null;
}

export interface ConnectedPeer {
  deviceId: string;
  deviceName: string;
  address: string;
  connectedAt: number;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  fingerprint: string | null;
  server: ServerInfo;
}

export interface PeerConnectedEvent {
  deviceId: string;
  deviceName: string;
  address: string;
}

export interface PeerDisconnectedEvent {
  deviceId: string;
}

export interface SyncMessageEvent {
  deviceId: string;
  msgType: number;
  payload: number[];
}

export interface SyncErrorEvent {
  message: string;
}

// Discovery types

export interface DiscoveredPeer {
  deviceId: string;
  deviceName: string;
  addresses: string[];
  port: number;
  fingerprint: string;
  lastSeen?: number;
}

export interface PeerDiscoveredEvent {
  deviceId: string;
  deviceName: string;
  addresses: string[];
  port: number;
  fingerprint: string;
}

export interface PeerLostEvent {
  deviceId: string;
}

export interface DiscoveryErrorEvent {
  message: string;
}

// Commands

/**
 * Start the local sync TCP server.
 * @returns The port number the server is listening on.
 */
export async function startServer(): Promise<number> {
  return invoke<number>('network_start_server');
}

/**
 * Stop the local sync TCP server.
 */
export async function stopServer(): Promise<void> {
  return invoke('network_stop_server');
}

/**
 * Get server info (running status and port).
 */
export async function getServerInfo(): Promise<ServerInfo> {
  return invoke<ServerInfo>('network_get_server_info');
}

/**
 * Get list of connected peers.
 */
export async function getConnectedPeers(): Promise<ConnectedPeer[]> {
  return invoke<ConnectedPeer[]>('network_get_connected_peers');
}

/**
 * Get this device's info.
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  return invoke<DeviceInfo>('network_get_device_info');
}

// Discovery commands

/**
 * Start mDNS discovery and advertising.
 * Advertises this device on the local network and starts browsing for peers.
 * Requires the server to be running first.
 */
export async function startDiscovery(): Promise<void> {
  return invoke('network_start_discovery');
}

/**
 * Stop mDNS discovery and advertising.
 */
export async function stopDiscovery(): Promise<void> {
  return invoke('network_stop_discovery');
}

/**
 * Get list of discovered peers on the local network.
 */
export async function getDiscoveredPeers(): Promise<DiscoveredPeer[]> {
  return invoke<DiscoveredPeer[]>('network_get_discovered_peers');
}

/**
 * Check if mDNS discovery is running.
 */
export async function isDiscoveryRunning(): Promise<boolean> {
  return invoke<boolean>('network_is_discovery_running');
}

// Peer connection commands

/**
 * Connect to a discovered peer by device ID.
 * @param deviceId The device ID of the peer to connect to.
 */
export async function connectToPeer(deviceId: string): Promise<void> {
  return invoke('network_connect_to_peer', { deviceId });
}

// Pairing types

export interface ManualPairingDetails {
  ips: string[];
  port: number;
  code: string; // Formatted fingerprint like "A1B2-C3D4"
  deviceName: string;
}

export interface QrCodeResponse {
  pngBase64: string;
  payload: string;
  fingerprint: string;
  manualDetails: ManualPairingDetails;
}

export interface PairingInfo {
  deviceId: string;
  deviceName: string;
  ips: string[];
  port: number;
  fingerprint: string;
  fingerprintMatch: boolean;
}

export interface KnownAddress {
  ip: string;
  port: number;
  lastUsed: number;
  successCount: number;
  failCount: number;
}

export interface PairedDevice {
  id: string;
  name: string;
  fingerprint: string;
  knownAddresses: KnownAddress[];
  pairedAt: number;
  lastConnected: number | null;
  lastSeen: number | null;
}

export interface PairedDeviceWithStatus {
  id: string;
  name: string;
  fingerprint: string;
  knownAddresses: KnownAddress[];
  pairedAt: number;
  lastConnected: number | null;
  lastSeen: number | null;
  connected: boolean;
}

// Pairing commands

/**
 * Generate a QR code for pairing this device.
 * Returns the QR code as base64 PNG and manual connection details.
 * Server must be started before calling this.
 */
export async function generatePairingQr(): Promise<QrCodeResponse> {
  return invoke<QrCodeResponse>('pairing_generate_qr');
}

/**
 * Parse a QR code payload from another device.
 * Validates the fingerprint to ensure devices use the same Skeleton Key.
 * @param payload The QR code payload (skelenote://pair?v=1&d=...)
 */
export async function parsePairingQr(payload: string): Promise<PairingInfo> {
  return invoke<PairingInfo>('pairing_parse_qr', { payload });
}

/**
 * Connect to a device using pairing info from a scanned QR code.
 * Tries all IP addresses until one succeeds.
 * @param info The pairing info from parsePairingQr
 */
export async function connectViaPairing(info: PairingInfo): Promise<void> {
  return invoke('pairing_connect', { info });
}

/**
 * Connect to a device using manually entered connection details.
 * For devices without cameras - user types IP, port, and code.
 * @param ip The IP address to connect to
 * @param port The TCP port
 * @param code The device code (fingerprint, can be formatted like A1B2-C3D4)
 */
export async function connectViaManualPairing(
  ip: string,
  port: number,
  code: string
): Promise<void> {
  return invoke('pairing_connect_manual', { ip, port, code });
}

// Cache commands

/**
 * Get all paired devices with their current connection status.
 */
export async function getPairedDevices(): Promise<PairedDeviceWithStatus[]> {
  return invoke<PairedDeviceWithStatus[]>('cache_get_paired_devices');
}

/**
 * Remove a device from the paired devices list.
 * Device will need to be paired again to reconnect.
 * @param deviceId The device ID to unpair
 */
export async function removePairedDevice(deviceId: string): Promise<void> {
  return invoke('cache_remove_paired_device', { deviceId });
}

/**
 * Prune dead addresses from all paired devices.
 * Removes addresses with >10 consecutive failures and limits each device to 5 addresses.
 * Should be called periodically after reconnection attempts.
 */
export async function prunePairedDevicesCache(): Promise<void> {
  return invoke('cache_prune_addresses');
}

/**
 * Attempt to reconnect to all paired devices.
 * Tries cached IP addresses in priority order.
 */
export async function reconnectAllPairedDevices(): Promise<void> {
  return invoke('cache_reconnect_all');
}

/**
 * Attempt to reconnect to a specific paired device.
 * Tries all known IP addresses in priority order.
 * @param deviceId The device ID to reconnect to
 */
export async function reconnectPairedDevice(deviceId: string): Promise<void> {
  return invoke('cache_reconnect_device', { deviceId });
}

// Event listeners

/**
 * Listen for peer connection events.
 */
export function onPeerConnected(
  callback: (event: PeerConnectedEvent) => void
): Promise<UnlistenFn> {
  return listen<PeerConnectedEvent>('local-peer-connected', (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for peer disconnection events.
 */
export function onPeerDisconnected(
  callback: (event: PeerDisconnectedEvent) => void
): Promise<UnlistenFn> {
  return listen<PeerDisconnectedEvent>('local-peer-disconnected', (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for sync messages from peers.
 */
export function onSyncMessage(
  callback: (event: SyncMessageEvent) => void
): Promise<UnlistenFn> {
  return listen<SyncMessageEvent>('local-sync-message', (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for sync errors.
 */
export function onSyncError(
  callback: (event: SyncErrorEvent) => void
): Promise<UnlistenFn> {
  return listen<SyncErrorEvent>('local-sync-error', (event) => {
    callback(event.payload);
  });
}

// Discovery event listeners

/**
 * Listen for peer discovery events.
 */
export function onPeerDiscovered(
  callback: (event: PeerDiscoveredEvent) => void
): Promise<UnlistenFn> {
  return listen<PeerDiscoveredEvent>('local-peer-discovered', (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for peer lost events.
 */
export function onPeerLost(
  callback: (event: PeerLostEvent) => void
): Promise<UnlistenFn> {
  return listen<PeerLostEvent>('local-peer-lost', (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for discovery errors.
 */
export function onDiscoveryError(
  callback: (event: DiscoveryErrorEvent) => void
): Promise<UnlistenFn> {
  return listen<DiscoveryErrorEvent>('local-discovery-error', (event) => {
    callback(event.payload);
  });
}

// Sync relay commands

/**
 * Broadcast sync data to all connected local peers.
 * @param data The encrypted Loro update bytes.
 * @returns The number of peers the data was sent to.
 */
export async function broadcastSync(data: Uint8Array): Promise<number> {
  // Convert Uint8Array to number[] for Tauri
  return invoke<number>('network_broadcast_sync', {
    data: Array.from(data),
  });
}

/**
 * Get the number of connected peers for sync.
 */
export async function getPeerCount(): Promise<number> {
  return invoke<number>('network_peer_count');
}

// Device registry sync commands

/**
 * Broadcast device registry to all connected local peers.
 * @param data The Loro snapshot bytes of the device registry.
 * @returns The number of peers the data was sent to.
 */
export async function broadcastDeviceRegistry(
  data: Uint8Array
): Promise<number> {
  return invoke<number>('network_broadcast_device_registry', {
    data: Array.from(data),
  });
}

/**
 * Broadcast device revocation to all connected local peers.
 * @param payload JSON-stringified DeviceRevokePayload.
 * @returns The number of peers the message was sent to.
 */
export async function broadcastDeviceRevoke(payload: string): Promise<number> {
  return invoke<number>('network_broadcast_device_revoke', {
    payload,
  });
}

/**
 * Broadcast device rename to all connected local peers.
 * @param payload JSON-stringified DeviceRenamePayload.
 * @returns The number of peers the message was sent to.
 */
export async function broadcastDeviceRename(payload: string): Promise<number> {
  return invoke<number>('network_broadcast_device_rename', {
    payload,
  });
}
