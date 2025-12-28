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
