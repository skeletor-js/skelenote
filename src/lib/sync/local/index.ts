/**
 * Local Network Sync Module
 *
 * TypeScript bindings for the Rust local network sync backend.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

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
  return invoke<number>("network_start_server");
}

/**
 * Stop the local sync TCP server.
 */
export async function stopServer(): Promise<void> {
  return invoke("network_stop_server");
}

/**
 * Get server info (running status and port).
 */
export async function getServerInfo(): Promise<ServerInfo> {
  return invoke<ServerInfo>("network_get_server_info");
}

/**
 * Get list of connected peers.
 */
export async function getConnectedPeers(): Promise<ConnectedPeer[]> {
  return invoke<ConnectedPeer[]>("network_get_connected_peers");
}

/**
 * Get this device's info.
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  return invoke<DeviceInfo>("network_get_device_info");
}

// Discovery commands

/**
 * Start mDNS discovery and advertising.
 * Advertises this device on the local network and starts browsing for peers.
 * Requires the server to be running first.
 */
export async function startDiscovery(): Promise<void> {
  return invoke("network_start_discovery");
}

/**
 * Stop mDNS discovery and advertising.
 */
export async function stopDiscovery(): Promise<void> {
  return invoke("network_stop_discovery");
}

/**
 * Get list of discovered peers on the local network.
 */
export async function getDiscoveredPeers(): Promise<DiscoveredPeer[]> {
  return invoke<DiscoveredPeer[]>("network_get_discovered_peers");
}

/**
 * Check if mDNS discovery is running.
 */
export async function isDiscoveryRunning(): Promise<boolean> {
  return invoke<boolean>("network_is_discovery_running");
}

// Event listeners

/**
 * Listen for peer connection events.
 */
export function onPeerConnected(
  callback: (event: PeerConnectedEvent) => void
): Promise<UnlistenFn> {
  return listen<PeerConnectedEvent>("local-peer-connected", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for peer disconnection events.
 */
export function onPeerDisconnected(
  callback: (event: PeerDisconnectedEvent) => void
): Promise<UnlistenFn> {
  return listen<PeerDisconnectedEvent>("local-peer-disconnected", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for sync messages from peers.
 */
export function onSyncMessage(
  callback: (event: SyncMessageEvent) => void
): Promise<UnlistenFn> {
  return listen<SyncMessageEvent>("local-sync-message", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for sync errors.
 */
export function onSyncError(
  callback: (event: SyncErrorEvent) => void
): Promise<UnlistenFn> {
  return listen<SyncErrorEvent>("local-sync-error", (event) => {
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
  return listen<PeerDiscoveredEvent>("local-peer-discovered", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for peer lost events.
 */
export function onPeerLost(
  callback: (event: PeerLostEvent) => void
): Promise<UnlistenFn> {
  return listen<PeerLostEvent>("local-peer-lost", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for discovery errors.
 */
export function onDiscoveryError(
  callback: (event: DiscoveryErrorEvent) => void
): Promise<UnlistenFn> {
  return listen<DiscoveryErrorEvent>("local-discovery-error", (event) => {
    callback(event.payload);
  });
}
