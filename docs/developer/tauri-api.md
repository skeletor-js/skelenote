# Tauri API Reference

This document describes all Tauri commands exposed to the frontend via `invoke()`.

## Overview

Skelenote's Rust backend provides commands in these categories:
- **Crypto** - Encryption, key management, Skeleton Key operations
- **Network** - Local P2P server and mDNS discovery
- **Device** - Device management and revocation

## Usage

From TypeScript/React, call commands using Tauri's `invoke`:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Example: Check if Skeleton Key exists
const hasKey = await invoke<boolean>('crypto_has_key');
```

---

## Crypto Commands

Commands for managing the Skeleton Key and encryption operations.

### `crypto_init`

Initialize the crypto subsystem. Must be called on app startup.

```typescript
const hasExistingKey = await invoke<boolean>('crypto_init');
```

**Returns:** `boolean` - `true` if a Skeleton Key already exists

**Notes:** Guards against double-initialization (safe to call from React StrictMode)

---

### `crypto_generate_key`

Generate a new Skeleton Key (BIP39 mnemonic).

```typescript
const mnemonic = await invoke<string>('crypto_generate_key');
// Returns: "word1 word2 word3 ... word24"
```

**Returns:** `string` - 24-word mnemonic phrase

**Notes:** This does NOT store the key. Call `crypto_import_key` to store it.

---

### `crypto_import_key`

Import and store a Skeleton Key from mnemonic.

```typescript
await invoke('crypto_import_key', { mnemonic: 'word1 word2 ...' });
```

**Parameters:**
- `mnemonic: string` - 24-word BIP39 mnemonic

**Notes:** Validates the mnemonic before storing. Derives and caches sync key.

---

### `crypto_has_key`

Check if a Skeleton Key exists in secure storage.

```typescript
const hasKey = await invoke<boolean>('crypto_has_key');
```

**Returns:** `boolean` - `true` if key exists

---

### `crypto_encrypt`

Encrypt data for sync transmission using XChaCha20-Poly1305.

```typescript
const encrypted = await invoke<number[]>('crypto_encrypt', { data: [...bytes] });
```

**Parameters:**
- `data: number[]` - Plaintext bytes to encrypt

**Returns:** `number[]` - Encrypted bytes (includes nonce)

---

### `crypto_decrypt`

Decrypt data received from sync.

```typescript
const plaintext = await invoke<number[]>('crypto_decrypt', { data: [...encryptedBytes] });
```

**Parameters:**
- `data: number[]` - Encrypted bytes (with nonce)

**Returns:** `number[]` - Decrypted plaintext bytes

---

### `crypto_generate_qr`

Generate a QR code for the Skeleton Key.

```typescript
const dataUri = await invoke<string>('crypto_generate_qr', { mnemonic: '...' });
// Returns: "data:image/svg+xml;base64,..."
```

**Parameters:**
- `mnemonic: string` - The mnemonic to encode

**Returns:** `string` - SVG as base64 data URI for `<img src>`

---

### `crypto_parse_qr`

Parse a QR code payload to extract the mnemonic.

```typescript
const mnemonic = await invoke<string>('crypto_parse_qr', { payload: '...' });
```

**Parameters:**
- `payload: string` - Raw QR code content

**Returns:** `string` - Extracted mnemonic

---

### `crypto_validate_mnemonic`

Validate a mnemonic phrase.

```typescript
const isValid = await invoke<boolean>('crypto_validate_mnemonic', { mnemonic: '...' });
```

**Parameters:**
- `mnemonic: string` - Phrase to validate

**Returns:** `boolean` - `true` if valid BIP39 phrase

---

### `crypto_get_user_id`

Get the derived user ID from the Skeleton Key.

```typescript
const userId = await invoke<string>('crypto_get_user_id');
```

**Returns:** `string` - Deterministic user ID (same across all devices with same key)

**Notes:** Used for sync room identification. All devices with same Skeleton Key get same user ID.

---

### `crypto_clear_key`

Clear the Skeleton Key and all secrets.

```typescript
await invoke('crypto_clear_key');
```

**Notes:** Removes master key from Stronghold. App will show setup screen on next launch.

---

## Network Commands

Commands for local P2P networking.

### `network_start_server`

Start the local sync TCP server.

```typescript
const port = await invoke<number>('network_start_server');
```

**Returns:** `number` - Port the server is listening on

**Events Emitted:**
- `local-peer-connected` - When a peer connects
- `local-peer-disconnected` - When a peer disconnects
- `local-sync-message` - When sync data is received
- `local-sync-error` - On connection errors

---

### `network_stop_server`

Stop the local sync TCP server.

```typescript
await invoke('network_stop_server');
```

---

### `network_get_server_info`

Get server running status and port.

```typescript
const info = await invoke<ServerInfo>('network_get_server_info');
// { running: boolean, port?: number }
```

---

### `network_get_connected_peers`

Get list of currently connected peers.

```typescript
const peers = await invoke<ConnectedPeer[]>('network_get_connected_peers');
// [{ deviceId, deviceName, address, connectedAt }]
```

---

### `network_get_device_info`

Get this device's network info.

```typescript
const info = await invoke<DeviceInfo>('network_get_device_info');
// { deviceId, deviceName, fingerprint, server }
```

---

### `network_get_device_id`

Get this device's unique ID.

```typescript
const deviceId = await invoke<string>('network_get_device_id');
```

---

### `network_sync_device_id`

Synchronize device ID with persistent storage.

```typescript
const deviceId = await invoke<string>('network_sync_device_id');
```

**Notes:** Call after `crypto_init` to ensure device ID persists across restarts.

---

## mDNS Discovery Commands

Commands for discovering peers on the local network.

### `network_start_discovery`

Start mDNS discovery and advertising.

```typescript
await invoke('network_start_discovery');
```

**Notes:** Server must be running first (call `network_start_server` first)

**Events Emitted:**
- `local-peer-discovered` - When a new peer is found
- `local-peer-lost` - When a peer disappears

---

### `network_stop_discovery`

Stop mDNS discovery and advertising.

```typescript
await invoke('network_stop_discovery');
```

---

### `network_get_discovered_peers`

Get list of discovered peers on the local network.

```typescript
const peers = await invoke<DiscoveredPeer[]>('network_get_discovered_peers');
// [{ deviceId, deviceName, addresses, port, fingerprint }]
```

---

### `network_is_discovery_running`

Check if mDNS discovery is running.

```typescript
const running = await invoke<boolean>('network_is_discovery_running');
```

---

## Peer Connection Commands

### `network_connect_to_peer`

Connect to a discovered peer by device ID.

```typescript
await invoke('network_connect_to_peer', { deviceId: 'peer-device-id' });
```

**Parameters:**
- `deviceId: string` - Device ID of the peer to connect to

**Notes:** Peer must be in discovered peers list. Will refuse if device is blocked.

---

## Sync Relay Commands

Commands for broadcasting sync data to connected peers.

### `network_broadcast_sync`

Broadcast sync data to all connected local peers.

```typescript
const peerCount = await invoke<number>('network_broadcast_sync', { data: [...bytes] });
```

**Parameters:**
- `data: number[]` - Encrypted Loro update bytes

**Returns:** `number` - Number of peers data was sent to

---

### `network_peer_count`

Get number of connected peers.

```typescript
const count = await invoke<number>('network_peer_count');
```

---

### `network_broadcast_device_registry`

Broadcast device registry to all connected peers.

```typescript
const count = await invoke<number>('network_broadcast_device_registry', { data: [...bytes] });
```

**Parameters:**
- `data: number[]` - Loro snapshot bytes of device registry

---

### `network_broadcast_device_revoke`

Broadcast device revocation to all connected peers.

```typescript
const count = await invoke<number>('network_broadcast_device_revoke', {
  payload: JSON.stringify({ deviceId, revokedAt, revokedBy, signature })
});
```

---

### `network_broadcast_device_rename`

Broadcast device rename to all connected peers.

```typescript
const count = await invoke<number>('network_broadcast_device_rename', {
  payload: JSON.stringify({ deviceId, deviceName })
});
```

---

## Device Management Commands

Commands for managing device trust and revocation.

### `device_get_signing_public_key`

Get the Ed25519 public signing key for this device.

```typescript
const publicKey = await invoke<string>('device_get_signing_public_key');
// Returns base64-encoded 32-byte public key
```

**Notes:** All devices with same Skeleton Key have same signing keypair.

---

### `device_sign_revocation`

Create a signed device revocation.

```typescript
const signature = await invoke<string>('device_sign_revocation', {
  deviceId: 'device-to-revoke',
  revokedAt: Date.now(),
  revokedBy: 'current-device-id'
});
// Returns base64-encoded Ed25519 signature
```

---

### `device_verify_revocation`

Verify a device revocation signature.

```typescript
const valid = await invoke<boolean>('device_verify_revocation', {
  deviceId: 'device-id',
  revokedAt: timestamp,
  revokedBy: 'revoker-id',
  signature: 'base64-signature',
  publicKey: 'base64-public-key'
});
```

---

### `device_block`

Block a device from P2P connections.

```typescript
await invoke('device_block', { deviceId: 'device-to-block' });
```

**Notes:** Adds to local blocklist. Blocked devices are filtered from mDNS and rejected at TCP handshake.

---

### `device_is_blocked`

Check if a device is blocked.

```typescript
const blocked = await invoke<boolean>('device_is_blocked', { deviceId: '...' });
```

---

### `device_get_blocked`

Get all blocked device IDs.

```typescript
const blockedIds = await invoke<string[]>('device_get_blocked');
```

---

## Events

The Tauri backend emits these events that can be listened to from the frontend:

| Event | Payload | Description |
|-------|---------|-------------|
| `local-peer-connected` | `{ deviceId, deviceName, address }` | A peer connected via TCP |
| `local-peer-disconnected` | `{ deviceId }` | A peer disconnected |
| `local-sync-message` | `{ deviceId, msgType, payload }` | Sync data received from peer |
| `local-sync-error` | `{ message }` | Connection error occurred |
| `local-peer-discovered` | `{ deviceId, deviceName, addresses, port, fingerprint }` | Peer found via mDNS |
| `local-peer-lost` | `{ deviceId }` | Peer no longer visible on network |

### Listening to Events

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('local-peer-connected', (event) => {
  console.log('Peer connected:', event.payload);
});

// Later: unlisten();
```
