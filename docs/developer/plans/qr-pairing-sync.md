# P2P Sync: QR Pairing + Cached Peers

> **Related:** Local P2P Sync, Cross-Platform Mobile Support
>
> **Status:** Phase 3 Complete ✓ | Phase 4 (Mobile) Pending | Phase 5 (Polish & Migration) Pending
>
> **Last Updated:** 2026-01-12

---

## 🚀 Implementation Status

### Phase 1: Core Infrastructure (Backend) - ✅ COMPLETE

All Rust backend components have been implemented:

- ✅ [cache.rs](../../../src-tauri/src/network/cache.rs) - Paired devices cache with address prioritization
- ✅ [pairing.rs](../../../src-tauri/src/network/pairing.rs) - QR code generation and parsing
- ✅ Tauri commands for pairing and cache management
- ✅ Connection flow modified to support direct IP/port connections

### Phase 2: Frontend UI (Desktop) - ✅ COMPLETE

Desktop UI components have been integrated:

- ✅ LocalSyncContext updated with pairing methods
- ✅ TypeScript bindings for all pairing and cache commands
- ✅ QR code generation API (`generatePairingQr()`)
- ✅ QR parsing API (`parsePairingQr()`)
- ✅ Manual pairing support (`connectViaManualPairing()`)
- ⚠️ UI components pending (PairedDevicesList, modals) - see Phase 5

### Phase 3: Reconnection Logic - ✅ COMPLETE (2026-01-12)

Automatic reconnection on app launch has been fully implemented:

- ✅ `cache_reconnect_all` - Parallel reconnection to all paired devices
- ✅ `cache_reconnect_device` - Reconnect to specific device
- ✅ Cache maintenance - Records success/failure for each connection attempt
- ✅ Connection statistics - Tracks `successCount` and `failCount` per address
- ✅ Address prioritization - Tries most reliable addresses first
- ✅ Cache persistence - Saves updated statistics to disk after reconnections
- ✅ Status events - Emits `paired-device-status` events (connecting/connected/offline)
- ✅ Address pruning - `cache_prune_addresses` removes addresses with >10 consecutive failures
- ✅ Automatic pruning - Triggered after reconnection attempts in LocalSyncContext

**Key Changes:**
- Updated `cache_reconnect_all()` to emit status events and update cache with success/failure stats
- Updated `cache_reconnect_device()` to emit status events and save cache after attempts
- Updated `pairing_connect()` to record initial connection success in cache
- Updated `pairing_connect_manual()` to record initial connection success in cache
- Added `cache_prune_addresses()` command to clean up dead addresses
- Integrated cache pruning into `LocalSyncContext` after reconnection attempts

**Files Modified:**
- [src-tauri/src/lib.rs](../../../src-tauri/src/lib.rs) - Added cache maintenance to reconnection functions
- [src/lib/sync/local/index.ts](../../../src/lib/sync/local/index.ts) - Added `prunePairedDevicesCache()` binding
- [src/contexts/LocalSyncContext.tsx](../../../src/contexts/LocalSyncContext.tsx) - Integrated cache pruning

### Phase 4: Mobile Support - 🔲 PENDING

iOS and Android QR scanning needs to be implemented.

**Blockers:**
- Requires Tauri mobile build setup
- Needs QR scanner plugin evaluation

### Phase 5: Polish & Migration - 🔲 PENDING

Production readiness and mDNS deprecation needs to be completed.

**Pending Tasks:**
- Build paired devices UI components (PairedDevicesList, modals)
- Error handling polish and user feedback
- Migration guide for existing mDNS users
- Remove mDNS code after migration period

---

## Next Steps

### Immediate: Complete Phase 5 (Desktop Polish)

1. **Build UI Components**
   - Create `PairedDevicesList` component ([src/components/sync/PairedDevicesList.tsx](../../../src/components/sync/))
   - Create `ShowPairingCodeModal` component
   - Create `PairNewDeviceModal` component (with QR scanner and manual entry)
   - Create `DeviceStatusIndicator` component
   - Wire up status events (`paired-device-status`) to update UI in real-time

2. **Integrate into Settings**
   - Add "Local Sync" section to Settings page
   - Display paired devices list with status indicators
   - Add "Show Pairing Code" button
   - Add "Pair New Device" button
   - Add device context menu (reconnect, details, unpair, revoke)

3. **Test End-to-End**
   - Fresh pairing between two devices
   - Reconnection after app restart
   - Reconnection after IP change
   - Sync data transfer after reconnection
   - Unpair and re-pair workflow

### Later: Mobile Support (Phase 4)

1. Evaluate Tauri mobile QR scanner plugins
2. Test local IP enumeration on iOS/Android
3. Handle mobile-specific quirks (camera permissions, foreground-only sync)
4. Build mobile-optimized UI

### Future: Migration (Phase 5 Final)

1. Detect upgrade from mDNS version
2. Show migration notice to users
3. Remove mDNS code and dependencies
4. Write user documentation

---

## Executive Summary

Replace mDNS-based automatic device discovery with explicit QR code pairing and a cached peer list. This provides:

- **Universal platform support** (iOS, Android, macOS, Windows, Linux)
- **Instant connections** (no 15-30 second discovery delay)
- **Consistent UX** across all platforms
- **Simpler codebase** (single discovery mechanism)
- **Familiar mental model** (like Bluetooth pairing, WhatsApp Web, Signal Desktop)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Proposed Architecture](#2-proposed-architecture)
3. [QR Code Specification](#3-qr-code-specification)
4. [Paired Devices Cache](#4-paired-devices-cache)
5. [Connection Flow](#5-connection-flow)
6. [UI/UX Design](#6-uiux-design)
7. [Edge Cases & Error Handling](#7-edge-cases--error-handling)
8. [Security Considerations](#8-security-considerations)
9. [Platform-Specific Implementation](#9-platform-specific-implementation)
10. [Migration & Deprecation](#10-migration--deprecation)
11. [Testing Strategy](#11-testing-strategy)
12. [Implementation Phases](#12-implementation-phases)
13. [Open Questions](#13-open-questions)

---

## 1. Current State Analysis

### What Exists Today

**mDNS Discovery (`src-tauri/src/network/mdns.rs`):**

- Broadcasts `_skelenote._tcp.local.` service via Bonjour/Avahi
- Discovers peers by browsing for same service type
- Filters by fingerprint (only same-user devices visible)
- Filters by blocklist (revoked devices rejected)
- Returns `DiscoveredPeer` with IPs, port, fingerprint, device info

**TCP Connection Layer (reusable):**

- `server.rs` - Accepts incoming TCP connections
- `client.rs` - Initiates outgoing TCP connections
- `protocol.rs` - Binary message encoding (HELLO, UPDATE, PING, etc.)
- `state.rs` - Manages connected peers, write streams
- `blocklist.rs` - Device revocation list

**Frontend Integration (`src/lib/sync/local/`):**

- Tauri command wrappers for network operations
- Event listeners for peer discovery/connection/sync
- `LocalSyncContext` manages sync state

### What Changes

| Component | Current | Proposed |
|-----------|---------|----------|
| Discovery | mDNS broadcast/browse | QR scan + cached peers |
| Peer list | Dynamically discovered | Explicitly paired + cached |
| First connection | Automatic after ~15-30s | Instant after QR scan |
| Reconnection | Re-discover via mDNS | Try cached IPs |
| Platform support | Desktop only | Universal |

### What Stays the Same

- TCP server/client connection logic
- Handshake protocol (HELLO + fingerprint verification)
- Sync message protocol (UPDATE, SNAPSHOT, etc.)
- Loro CRDT merge
- Device blocklist/revocation
- Encryption (XChaCha20-Poly1305)

---

## 2. Proposed Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAIRING (One-time)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Device A                          Device B                     │
│  ─────────                         ─────────                    │
│  1. Start TCP server               1. Tap "Pair New Device"     │
│  2. Show QR code with:             2. Scan QR code              │
│     - Local IPs                    3. Parse pairing info        │
│     - Port                         4. Connect to Device A       │
│     - Fingerprint                  5. Verify fingerprint        │
│     - Device ID/Name               6. Exchange device info      │
│  3. Accept connection              7. Save A to paired cache    │
│  4. Verify fingerprint             8. Connection established    │
│  5. Save B to paired cache                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    RECONNECTION (Automatic)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  On App Launch:                                                 │
│  1. Load paired devices from cache                              │
│  2. Start TCP server                                            │
│  3. For each paired device (in parallel):                       │
│     a. Try each cached IP address                               │
│     b. If connected: verify fingerprint, mark online            │
│     c. If failed: mark offline, continue to next                │
│  4. Show connection status in UI                                │
│  5. Accept incoming connections from paired devices             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ QR Display  │  │ QR Scanner  │  │ Paired Devices List     │ │
│  │ Component   │  │ Component   │  │ (online/offline status) │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │ LocalSync   │                               │
│                   │ Context     │                               │
│                   └──────┬──────┘                               │
└──────────────────────────┼──────────────────────────────────────┘
                           │ Tauri IPC
┌──────────────────────────┼──────────────────────────────────────┐
│                          │         Rust Backend                  │
├──────────────────────────┼──────────────────────────────────────┤
│                   ┌──────▼──────┐                               │
│                   │ Commands    │                               │
│                   │ (lib.rs)    │                               │
│                   └──────┬──────┘                               │
│                          │                                      │
│    ┌─────────────────────┼─────────────────────┐               │
│    │                     │                     │               │
│    ▼                     ▼                     ▼               │
│ ┌──────────┐      ┌──────────┐          ┌──────────┐          │
│ │ Pairing  │      │ Cache    │          │ Network  │          │
│ │ (NEW)    │      │ (NEW)    │          │ (existing)│          │
│ │          │      │          │          │          │          │
│ │ - QR gen │      │ - Load   │          │ - Server │          │
│ │ - QR parse│     │ - Save   │          │ - Client │          │
│ │          │      │ - Update │          │ - Protocol│         │
│ └──────────┘      └──────────┘          └──────────┘          │
│                          │                     │               │
│                          └──────────┬──────────┘               │
│                                     │                          │
│                              ┌──────▼──────┐                   │
│                              │ paired.json │                   │
│                              │ (data dir)  │                   │
│                              └─────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. QR Code Specification

### Payload Format

Use a URL scheme for future extensibility and easy parsing:

```
skelenote://pair?v=1&d=PAYLOAD
```

Where `PAYLOAD` is base64url-encoded JSON:

```json
{
  "v": 1,
  "ips": ["192.168.1.50", "10.0.0.15"],
  "port": 54321,
  "fp": "a1b2c3d4",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "MacBook Pro"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | number | Yes | Protocol version (start at 1) |
| `ips` | string[] | Yes | All local IPv4 addresses |
| `port` | number | Yes | TCP server port |
| `fp` | string | Yes | 8-char fingerprint (first 8 of SHA256(userId)) |
| `id` | string | Yes | Device UUID |
| `name` | string | Yes | Human-readable device name |

### QR Code Properties

- **Error Correction:** Level M (15% recovery) - balance size vs. reliability
- **Size:** Dynamic based on content, minimum 200x200 pixels
- **Format:** PNG for display, camera scan for reading
- **Refresh:** Regenerate if server port changes

### Example Encoded Payload

```
skelenote://pair?v=1&d=eyJ2IjoxLCJpcHMiOlsiMTkyLjE2OC4xLjUwIiwiMTAuMC4wLjE1Il0sInBvcnQiOjU0MzIxLCJmcCI6ImExYjJjM2Q0IiwiaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJuYW1lIjoiTWFjQm9vayBQcm8ifQ
```

---

## 4. Paired Devices Cache

### Storage Location

```
{APP_DATA}/paired_devices.json
```

Platform paths:

- **macOS:** `~/Library/Application Support/com.skelenote.app/paired_devices.json`
- **Windows:** `%APPDATA%\com.skelenote.app\paired_devices.json`
- **Linux:** `~/.local/share/com.skelenote.app/paired_devices.json`
- **iOS:** App sandbox documents directory
- **Android:** App internal storage

### Schema

```typescript
interface PairedDevicesCache {
  version: 1;
  thisDevice: {
    id: string;
    name: string;
    fingerprint: string;
  };
  devices: PairedDevice[];
}

interface PairedDevice {
  id: string;                    // Device UUID (immutable identifier)
  name: string;                  // Human-readable name (can change)
  fingerprint: string;           // For verification (should match ours)
  knownAddresses: KnownAddress[];
  pairedAt: number;              // Unix timestamp
  lastConnected: number | null;  // Unix timestamp or null if never
  lastSeen: number | null;       // Last successful connection
}

interface KnownAddress {
  ip: string;
  port: number;
  lastUsed: number;              // Unix timestamp
  successCount: number;          // Times successfully connected
  failCount: number;             // Consecutive failures
}
```

### Cache Operations

```rust
// Rust API (new module: src-tauri/src/network/cache.rs)

/// Load paired devices from disk
fn load_paired_devices() -> Result<PairedDevicesCache, Error>

/// Save paired devices to disk
fn save_paired_devices(cache: &PairedDevicesCache) -> Result<(), Error>

/// Add a newly paired device
fn add_paired_device(device: PairedDevice) -> Result<(), Error>

/// Update device info (name change, new IP discovered)
fn update_paired_device(device_id: &str, updates: DeviceUpdates) -> Result<(), Error>

/// Remove a paired device (user-initiated unpair)
fn remove_paired_device(device_id: &str) -> Result<(), Error>

/// Record successful connection (update lastConnected, address stats)
fn record_connection_success(device_id: &str, address: &str) -> Result<(), Error>

/// Record failed connection attempt
fn record_connection_failure(device_id: &str, address: &str) -> Result<(), Error>
```

### Address Prioritization

When reconnecting, try addresses in this order:

1. **Last successful address** - Most likely to work
2. **Highest success rate** - `successCount / (successCount + failCount)`
3. **Most recently used** - Recent IPs more likely valid
4. **All others** - Try remaining addresses

### Cache Cleanup

- Remove addresses with >10 consecutive failures
- Keep maximum 5 addresses per device (prune oldest unused)
- Don't prune devices automatically (user must explicitly unpair)

---

## 5. Connection Flow

### 5.1 Initial Pairing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Device A (Displaying QR)                                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. User taps "Show Pairing Code"                                │
│ 2. Ensure TCP server is running (start if needed)               │
│ 3. Get local IP addresses from all network interfaces           │
│ 4. Generate QR payload with {ips, port, fingerprint, id, name}  │
│ 5. Display QR code                                              │
│ 6. Show fingerprint visually: "Your code: A1B2-C3D4"           │
│ 7. Wait for incoming connection...                              │
│                                                                 │
│ [On connection from Device B]:                                  │
│ 8. Receive HELLO with Device B's info                          │
│ 9. Verify fingerprint matches (same Skeleton Key)              │
│ 10. Send HELLO + ACK                                           │
│ 11. Add Device B to paired cache                               │
│ 12. Show success: "Paired with iPhone 15"                      │
│ 13. Close QR modal                                             │
│ 14. Begin sync                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Device B (Scanning QR)                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. User taps "Pair New Device"                                  │
│ 2. Open camera/QR scanner                                       │
│ 3. Scan QR code from Device A                                   │
│ 4. Parse payload, extract {ips, port, fingerprint, id, name}   │
│ 5. Show confirmation: "Pair with MacBook Pro? Code: A1B2-C3D4" │
│ 6. User confirms                                                │
│ 7. Verify fingerprint matches our own                          │
│    - If mismatch: "Different account - cannot pair"            │
│ 8. Try connecting to each IP until one succeeds                │
│ 9. Send HELLO with our info                                    │
│ 10. Receive HELLO + ACK from Device A                          │
│ 11. Add Device A to paired cache                               │
│ 12. Show success: "Paired with MacBook Pro"                    │
│ 13. Close scanner modal                                        │
│ 14. Begin sync                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Reconnection Flow (App Launch)

```
┌─────────────────────────────────────────────────────────────────┐
│ On App Launch / Resume                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Load paired devices cache                                    │
│ 2. Start TCP server (if not already running)                   │
│ 3. Update UI: Show all paired devices as "Connecting..."       │
│                                                                 │
│ 4. For each paired device (parallel, with concurrency limit):  │
│    a. Get prioritized address list                             │
│    b. For each address (sequential):                           │
│       i.  Attempt TCP connection (3 second timeout)            │
│       ii. If connected:                                        │
│           - Send HELLO                                         │
│           - Verify fingerprint                                 │
│           - Record success in cache                            │
│           - Update UI: "Connected"                             │
│           - Break address loop                                 │
│       iii. If failed:                                          │
│           - Record failure in cache                            │
│           - Try next address                                   │
│    c. If all addresses failed:                                 │
│       - Update UI: "Offline"                                   │
│       - Keep in list (don't remove)                           │
│                                                                 │
│ 5. Accept incoming connections from paired devices             │
│    - Verify device ID is in paired cache                       │
│    - Verify fingerprint matches                                │
│    - If valid: accept and sync                                 │
│    - If unknown device: reject (must pair first)              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Connection Acceptance (Server Side)

```
┌─────────────────────────────────────────────────────────────────┐
│ When TCP Server Receives Connection                             │
├─────────────────────────────────────────────────────────────────┤
│ 1. Read HELLO message                                          │
│ 2. Extract device_id, fingerprint                              │
│                                                                 │
│ 3. Check: Is device_id in paired cache?                        │
│    - No: Send REJECT "Unknown device - pair first"             │
│          Close connection                                      │
│          Return                                                │
│                                                                 │
│ 4. Check: Is fingerprint correct?                              │
│    - No: Send REJECT "Fingerprint mismatch"                    │
│          Close connection                                      │
│          Return                                                │
│                                                                 │
│ 5. Check: Is device in blocklist?                              │
│    - Yes: Send REJECT "Device revoked"                         │
│           Close connection                                     │
│           Return                                               │
│                                                                 │
│ 6. Send HELLO + ACK                                            │
│ 7. Update cache: record connection, update IP if new           │
│ 8. Add to connected peers                                      │
│ 9. Begin sync                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. UI/UX Design

### 6.1 Paired Devices Panel

Location: Settings → Sync → Local Sync (or dedicated sync panel)

```
┌─────────────────────────────────────────────────────────────────┐
│  Local Sync                                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Sync your vault across devices on the same network.           │
│  All data stays local - no cloud required.                     │
│                                                                 │
│  Paired Devices                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ● MacBook Pro                                          │   │
│  │    Connected · Last synced 2 minutes ago                │   │
│  │                                        [···]            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ○ iPhone 15                                            │   │
│  │    Offline · Last seen yesterday                        │   │
│  │                                        [···]            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ● Windows Desktop                                      │   │
│  │    Connected · Syncing...                               │   │
│  │                                        [···]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Pair New Device]                                           │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  This Device                                                    │
│  Name: MacBook Pro                              [Edit]          │
│  Device ID: a1b2c3d4                                           │
│                                                                 │
│  [Show Pairing Code]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Device Context Menu ([···])

```
┌─────────────────────┐
│ Reconnect           │
│ View Details        │
│ ─────────────────── │
│ Unpair Device       │
│ ─────────────────── │
│ Revoke Device       │  ← Red, destructive
└─────────────────────┘
```

### 6.3 Show Pairing Code Modal

```
┌─────────────────────────────────────────────────────────────────┐
│                                                          [×]    │
│                                                                 │
│                    Pair Another Device                          │
│                                                                 │
│              ┌─────────────────────────────┐                   │
│              │                             │                   │
│              │         [QR CODE]           │                   │
│              │                             │                   │
│              │                             │                   │
│              └─────────────────────────────┘                   │
│                                                                 │
│                    Your code: A1B2-C3D4                        │
│                                                                 │
│  On your other device:                                         │
│  1. Open Skelenote                                             │
│  2. Go to Settings → Sync → Local Sync                         │
│  3. Tap "Pair New Device"                                      │
│  4. Scan this code                                             │
│                                                                 │
│  Make sure both devices are on the same network                │
│  and using the same Skeleton Key.                              │
│                                                                 │
│                      [Cancel]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Scan to Pair Modal (Mobile)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                              Pair New Device            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                                                         │   │
│  │                    [CAMERA VIEWFINDER]                  │   │
│  │                                                         │   │
│  │              ┌─────────────────────┐                   │   │
│  │              │    Scan QR Code     │                   │   │
│  │              └─────────────────────┘                   │   │
│  │                                                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Point your camera at the QR code shown on your other device.  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Enter IP Address Manually]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.5 Scan to Pair Modal (Desktop)

Desktop devices may not have cameras. Options:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                          [×]    │
│                                                                 │
│                      Pair New Device                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Option 1: Scan with Camera                             │   │
│  │  [Open Camera]                                          │   │
│  │  (Requires webcam)                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Option 2: Enter Connection Details                     │   │
│  │                                                         │   │
│  │  IP Address: [192.168.1.____]                          │   │
│  │  Port:       [54321_________]                          │   │
│  │  Device Code: [A1B2-C3D4____]                          │   │
│  │                                                         │   │
│  │  [Connect]                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Tip: Show the pairing code on your other device first,        │
│  then enter the details shown below the QR code.               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.6 Pairing Confirmation

After scanning, before connecting:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                          [×]    │
│                                                                 │
│                      Confirm Pairing                            │
│                                                                 │
│                         📱                                      │
│                                                                 │
│                    MacBook Pro                                  │
│                    Code: A1B2-C3D4                             │
│                                                                 │
│  Verify this code matches what's shown on the other device.    │
│                                                                 │
│            [Cancel]              [Pair Device]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.7 Status Indicators

| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| Connected | ● (filled circle) | Sage (#5E8C61) | Active connection, syncing |
| Connecting | ◐ (half circle, animated) | Ember (#B85C50) | Attempting to connect |
| Offline | ○ (empty circle) | Stone (#9CA3AF) | Cannot reach device |
| Syncing | ● with spinner | Sage | Actively transferring data |
| Error | ● with ! | Brick (#9B3D3D) | Connection error |

### 6.8 Connection Status Toast

When a device connects/disconnects, show subtle toast:

```
┌───────────────────────────────────┐
│ ● MacBook Pro connected           │
└───────────────────────────────────┘
```

```
┌───────────────────────────────────┐
│ ○ iPhone 15 disconnected          │
└───────────────────────────────────┘
```

---

## 7. Edge Cases & Error Handling

### 7.1 IP Address Changes

**Scenario:** Device's IP changes due to DHCP lease renewal or network switch.

**Solution:**

- Store multiple IPs per device in cache
- When connection succeeds from new IP, add it to cache
- When connection fails, try other cached IPs
- Last resort: Re-pair via QR

**UI:** Show "Reconnect" option in device menu. If all IPs fail, show "Offline - may need to re-pair"

### 7.2 Different Networks

**Scenario:** Devices are on different WiFi networks (e.g., 2.4GHz vs 5GHz, or different subnets).

**Solution:**

- Include all local IPs in QR code (multiple interfaces)
- Try all IPs during connection
- If none work, show clear error: "Cannot reach device. Make sure both devices are on the same network."

### 7.3 Firewall Blocking

**Scenario:** Local firewall blocks incoming connections.

**Solution:**

- Documentation: Explain that local sync requires incoming connections
- Error message: "Connection refused - check firewall settings"
- Future: Could implement hole-punching or relay fallback

### 7.4 Port Changes

**Scenario:** TCP server gets different port on restart.

**Solution:**

- Cache port with IP address
- Update cache when successful connection reveals new port
- QR code always shows current port
- Protocol: HELLO response includes current port, update cache if different

### 7.5 Fingerprint Mismatch

**Scenario:** QR code scanned from device with different Skeleton Key.

**Solution:**

- Check fingerprint BEFORE attempting connection
- Error: "This device is using a different Skeleton Key. You can only sync between devices with the same key."

### 7.6 Device Revoked

**Scenario:** Previously paired device has been revoked.

**Solution:**

- Keep device in paired list but mark as revoked
- Reject connections from revoked devices
- Show in UI: "This device has been revoked"
- Allow un-revoking from the revoking device

### 7.7 Same Device Scanned Twice

**Scenario:** User scans same device's QR code again.

**Solution:**

- Check if device ID already in cache
- If yes: Update connection info (IPs, port) instead of adding duplicate
- Show: "Updated connection info for MacBook Pro"

### 7.8 Stale Cache

**Scenario:** Cache has many old IPs that no longer work.

**Solution:**

- Track consecutive failures per address
- After 10 consecutive failures, remove address from cache
- Keep at least one address (the most recent successful one)
- Never auto-remove devices, only addresses

### 7.9 App Killed During Pairing

**Scenario:** App crashes or is killed mid-pairing.

**Solution:**

- Don't add to cache until handshake complete
- On next launch, device won't be in paired list
- User can simply pair again

### 7.10 Multiple Devices Same Name

**Scenario:** User has two devices both named "iPhone".

**Solution:**

- Device ID is the unique identifier, not name
- Show device ID suffix in UI if names collide: "iPhone (a1b2)" and "iPhone (c3d4)"

---

## 8. Security Considerations

### 8.1 QR Code Security

**Threat:** Malicious QR code could point to attacker's device.

**Mitigations:**

- Fingerprint verification before connecting (must match our Skeleton Key)
- Visual confirmation step showing fingerprint
- No automatic connection - user must confirm

**Threat:** QR code photographed by attacker.

**Mitigations:**

- QR contains only local IPs (not routable from internet)
- Fingerprint verification prevents connection from wrong Skeleton Key
- Server rejects connections from non-paired devices after initial setup
- Recommend: Don't share screenshots of pairing QR

### 8.2 Cache Security

**Threat:** Attacker reads paired_devices.json to learn about user's devices.

**Mitigations:**

- File contains only local network info (IPs, device names)
- No secrets stored in cache (fingerprint is public-derivable from Skeleton Key)
- Cache file permissions: user-only read/write
- Future: Could encrypt cache with derived key

### 8.3 Connection Security

**Existing mitigations (unchanged):**

- All sync data encrypted with XChaCha20-Poly1305
- Fingerprint verification on every connection
- Device blocklist for revocation
- No unencrypted data transmitted

### 8.4 Pairing Security

**Threat:** Man-in-the-middle during pairing.

**Mitigations:**

- Both devices verify fingerprint matches
- Fingerprint derived from Skeleton Key (attacker would need your key)
- Visual confirmation: user verifies code matches on both screens

### 8.5 Unpair vs Revoke

**Unpair:** Remove device from local paired list. Device can re-pair by scanning QR again.

**Revoke:** Add device to blocklist. Device cannot connect even with valid fingerprint. Revocation syncs to other devices.

Make this distinction clear in UI.

---

## 9. Platform-Specific Implementation

### 9.1 Desktop (macOS, Windows, Linux)

**QR Display:**

- Use `qrcode` Rust crate to generate QR as PNG
- Display in Tauri webview via data URL or temp file

**QR Scanning:**

- Optional: Use webcam via browser APIs (`getUserMedia`)
- Primary: Manual IP entry (desktops often lack cameras)
- Could use `nokhwa` Rust crate for native camera access

**Local IPs:**

- Use `local-ip-address` or `get_if_addrs` Rust crate
- Filter to private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)

### 9.2 iOS

**QR Scanning:**

- Native camera APIs via Tauri plugin or web view
- `tauri-plugin-barcode-scanner` (if available for mobile)
- Fallback: Manual entry

**QR Display:**

- Same as desktop - generate PNG, display in web view

**Local IPs:**

- iOS restricts access to network interfaces
- May need to use `getifaddrs` via Rust FFI
- Or enumerate via `NWPathMonitor` (needs native Swift bridge)

**Background Behavior:**

- iOS aggressively kills background network connections
- On app foreground: Trigger reconnection to all paired devices
- Cannot maintain persistent connections in background

**Camera Permissions:**

- Must request camera permission for QR scanning
- Add `NSCameraUsageDescription` to Info.plist

### 9.3 Android

**QR Scanning:**

- Use `tauri-plugin-barcode-scanner` or ML Kit
- Camera permission required

**QR Display:**

- Same as desktop

**Local IPs:**

- Use `NetworkInterface.getNetworkInterfaces()` via JNI
- Or Rust `get_if_addrs` (should work on Android)

**Background Behavior:**

- More permissive than iOS but still restricted
- Could use foreground service for persistent sync
- For MVP: Reconnect on app foreground

### 9.4 Tauri Mobile Considerations

```toml
# src-tauri/Cargo.toml additions for mobile

[target.'cfg(target_os = "ios")'.dependencies]
# iOS-specific network crates if needed

[target.'cfg(target_os = "android")'.dependencies]
# Android-specific network crates if needed
```

**Tauri mobile plugins to evaluate:**

- `tauri-plugin-barcode-scanner` - QR code scanning
- `tauri-plugin-camera` - Camera access (alternative)

---

## 10. Migration & Deprecation

### 10.1 mDNS Removal

**Phase 1: Add QR pairing alongside mDNS**

- Both discovery methods available
- mDNS auto-discovery still works on desktop
- QR pairing works everywhere

**Phase 2: Deprecate mDNS**

- Remove mDNS from UI
- Keep code but don't initialize
- Log deprecation warnings

**Phase 3: Remove mDNS code**

- Delete `src-tauri/src/network/mdns.rs`
- Remove `mdns_sd` dependency
- Clean up related Tauri commands

### 10.2 Breaking Changes

**For existing users:**

- Devices currently "discovered" via mDNS will need to re-pair via QR
- One-time action per device pair
- No data loss - just need to re-establish connections

**Migration UX:**

- On upgrade, show notice: "Local sync has been improved! You'll need to re-pair your devices."
- Link to help article explaining the change

### 10.3 Version Compatibility

**Protocol version in QR:** `v: 1`

If we need to change QR format later:

- Increment version
- New devices can read old QR codes (backwards compatible)
- Old devices show error for new QR codes: "Please update Skelenote to pair with this device"

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Cache module (`cache.rs`):**

- Load/save paired devices
- Add/remove/update devices
- Address prioritization algorithm
- Cache cleanup logic

**QR module:**

- Payload encoding/decoding
- URL scheme parsing
- Edge cases (special characters in device name, IPv6)

### 11.2 Integration Tests

**Pairing flow:**

- Generate QR → Parse QR → Connect → Verify → Cache updated
- Fingerprint mismatch rejection
- Duplicate device handling
- Error cases (invalid QR, network unreachable)

**Reconnection flow:**

- Load cache → Try addresses → Connect
- Address prioritization
- Failure recording
- Cache updates after connection

### 11.3 E2E Tests

**Two-device scenarios (manual or automated with VMs):**

- Fresh pair between two devices
- Reconnection after app restart
- Reconnection after IP change
- Sync after reconnection
- Unpair and re-pair
- Revoke and attempt reconnection

### 11.4 Platform Testing Matrix

| Scenario | macOS | Windows | Linux | iOS | Android |
|----------|-------|---------|-------|-----|---------|
| Display QR | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scan QR (camera) | ✓ | ✓ | ○ | ✓ | ✓ |
| Manual IP entry | ✓ | ✓ | ✓ | ✓ | ✓ |
| Get local IPs | ✓ | ✓ | ✓ | ? | ? |
| TCP server | ✓ | ✓ | ✓ | ✓ | ✓ |
| TCP client | ✓ | ✓ | ✓ | ✓ | ✓ |
| Background reconnect | ✓ | ✓ | ✓ | ○ | ○ |

✓ = Works, ○ = Limited/Needs testing, ? = Needs investigation

---

## 12. Testing & Validation

### Phase 3 Testing Checklist

To validate the reconnection logic implementation, test the following scenarios:

#### Cache Maintenance
- [ ] Connection success updates `successCount` and resets `failCount`
- [ ] Connection failure increments `failCount`
- [ ] Cache is persisted to disk after reconnection attempts
- [ ] `lastConnected` and `lastSeen` timestamps are updated correctly
- [ ] Address prioritization sorts by success rate and recency

#### Reconnection Flow
- [ ] `cache_reconnect_all()` tries all paired devices in parallel
- [ ] Concurrency is limited to 3 devices at once
- [ ] Status events are emitted: `connecting` → `connected` or `offline`
- [ ] Failed addresses are tried in priority order
- [ ] Successful connection stops trying remaining addresses
- [ ] Cache is saved after all reconnection attempts complete

#### Address Pruning
- [ ] Addresses with >10 consecutive failures are removed
- [ ] Each device is limited to 5 addresses maximum
- [ ] Pruning is triggered after `enable()` and `reconnectDevice()`
- [ ] At least one address is retained per device

#### Pairing Flow
- [ ] Initial pairing records connection success in cache
- [ ] Manual pairing records connection success in cache
- [ ] Multiple IPs from QR code are all tried until one succeeds
- [ ] Successful pairing saves device to cache with address stats

### Manual Testing Procedure

1. **Fresh Pairing**
   - Start two Skelenote instances on different devices
   - Generate QR code on Device A
   - Scan/parse QR on Device B
   - Verify connection established
   - Check `paired_devices.json` has correct device info
   - Verify `successCount=1, failCount=0` for connected address

2. **Reconnection After Restart**
   - Close Device B
   - Reopen Device B
   - Verify automatic reconnection to Device A
   - Check cache updated with new `lastConnected` timestamp
   - Verify `successCount` incremented

3. **IP Address Change Simulation**
   - Modify cached IP address to invalid value in `paired_devices.json`
   - Add valid IP as second address
   - Restart app
   - Verify it tries invalid IP first (fails), then tries valid IP (succeeds)
   - Check `failCount=1` for invalid address, `successCount` incremented for valid

4. **Address Pruning**
   - Manually set an address to `failCount=11` in cache
   - Trigger reconnection
   - Verify pruned address is removed from cache after reconnection

5. **Status Events**
   - Monitor `paired-device-status` events in browser console
   - Trigger reconnection via `reconnectDevice()`
   - Verify events: `{status: "connecting"}` → `{status: "connected"}` or `{status: "offline"}`

### Automated Testing (Future)

For robust validation, consider adding:
- Rust unit tests for cache prioritization logic
- Integration tests for reconnection flow with mock peers
- E2E tests with two Tauri instances on same machine

---

## 12. Implementation Phases

### Phase 1: Core Infrastructure (Backend)

**Goal:** Implement cache and QR generation in Rust

**Tasks:**

1. Create `src-tauri/src/network/cache.rs`
   - `PairedDevicesCache` struct and serialization
   - Load/save functions
   - CRUD operations for paired devices
   - Address prioritization logic

2. Create `src-tauri/src/network/pairing.rs`
   - QR payload struct and encoding
   - Local IP enumeration
   - QR code generation (PNG bytes)

3. Add Tauri commands in `lib.rs`
   - `pairing_generate_qr() -> QrCodeData`
   - `pairing_parse_qr(payload: String) -> PairingInfo`
   - `pairing_connect(pairing_info: PairingInfo) -> Result`
   - `cache_get_paired_devices() -> Vec<PairedDevice>`
   - `cache_add_paired_device(device: PairedDevice)`
   - `cache_remove_paired_device(device_id: String)`
   - `cache_update_paired_device(device_id: String, updates: ...)`

4. Modify connection flow
   - `network_connect_to_peer` accepts direct IP/port (not just device_id from mDNS)
   - Server validates against paired cache (not just fingerprint)
   - Update cache on successful connection

**Deliverable:** Rust backend supports QR-based pairing and cached reconnection

### Phase 2: Frontend UI (Desktop)

**Goal:** Build pairing UI for desktop

**Tasks:**

1. Create `PairedDevicesList` component
   - List view with status indicators
   - Context menu (reconnect, details, unpair, revoke)
   - Real-time status updates via Tauri events

2. Create `ShowPairingCodeModal` component
   - Display QR code image
   - Show fingerprint for verification
   - Instructions text

3. Create `PairNewDeviceModal` component
   - Manual IP/port/code entry form
   - Optional: Webcam QR scanner
   - Confirmation step with fingerprint display

4. Update `LocalSyncContext`
   - Load paired devices on mount
   - Trigger reconnection on mount
   - Handle pairing events

5. Update Settings page
   - Add "Local Sync" section
   - Integrate new components

**Deliverable:** Desktop users can pair and manage devices via UI

### Phase 3: Reconnection Logic

**Goal:** Automatic reconnection on app launch

**Tasks:**

1. Implement reconnection service
   - On app start: Load cache, start server, try all paired devices
   - Parallel connection attempts with concurrency limit (3)
   - Exponential backoff for retries (optional)

2. Connection status management
   - Track per-device status (connecting, connected, offline, error)
   - Emit events for UI updates
   - Handle incoming connections from paired devices

3. Cache maintenance
   - Update lastConnected on success
   - Record failures
   - Prune dead addresses

**Deliverable:** App automatically reconnects to paired devices

### Phase 4: Mobile Support

**Goal:** QR scanning on iOS/Android

**Tasks:**

1. Evaluate and integrate QR scanner plugin
   - Test `tauri-plugin-barcode-scanner` on mobile
   - Fallback to manual entry if needed

2. Handle mobile-specific quirks
   - Local IP enumeration on iOS/Android
   - Camera permissions
   - Foreground reconnection (no background)

3. Mobile UI adaptations
   - Full-screen camera viewfinder
   - Touch-friendly paired devices list
   - Mobile-appropriate modals

**Deliverable:** iOS and Android can scan QR codes and pair

### Phase 5: Polish & Migration

**Goal:** Production-ready, deprecate mDNS

**Tasks:**

1. Error handling polish
   - Clear error messages for all failure cases
   - Retry logic with user feedback
   - Help links for common issues

2. Migration experience
   - Detect upgrade from mDNS version
   - Show migration notice
   - Guide users to re-pair

3. Remove mDNS
   - Remove from UI
   - Remove Rust code
   - Remove dependency

4. Documentation
   - User guide for local sync
   - Troubleshooting guide

**Deliverable:** v1.0 of QR-based local sync

---

## 13. Open Questions

### Technical

1. **QR scanning on desktop:** Is webcam-based scanning worth implementing, or is manual entry sufficient?
   - Recommendation: Start with manual entry, add webcam later if users request

2. **Local IP enumeration on iOS:** Does `getifaddrs` work in iOS sandbox? Need to test.
   - Fallback: Use Tauri's network APIs if available

3. **Background sync on mobile:** Should we attempt any background connectivity?
   - Recommendation: No for MVP. Sync on foreground only.

4. **IPv6 support:** Should we include IPv6 addresses in QR?
   - Recommendation: IPv4 only for MVP. Most local networks still use IPv4.

### UX

1. **Auto-reconnect frequency:** How often should we retry offline devices?
   - Recommendation: On app launch only. User can manually trigger "Reconnect"

2. **Pairing without camera:** For devices without cameras, is manual entry user-friendly enough?
   - Recommendation: Yes, show IP/port/code clearly below QR

3. **Multiple vaults:** If user has multiple Skeleton Keys, how to handle?
   - Current behavior: Fingerprint mismatch prevents pairing. Clear error message.

### Product

1. **Keep mDNS as power-user option?** Some users might prefer auto-discovery.
   - Recommendation: Remove completely for simplicity. One way to do things.

2. **Cloud relay for discovery?** Future option if QR proves too manual?
   - Recommendation: Out of scope for this plan. Evaluate based on user feedback.

---

## Appendix A: File Changes Summary

### New Files

```
src-tauri/src/network/cache.rs      # Paired devices cache management
src-tauri/src/network/pairing.rs    # QR generation and parsing
src/components/sync/PairedDevicesList.tsx
src/components/sync/ShowPairingCodeModal.tsx
src/components/sync/PairNewDeviceModal.tsx
src/components/sync/DeviceStatusIndicator.tsx
```

### Modified Files

```
src-tauri/src/network/mod.rs        # Export new modules
src-tauri/src/network/server.rs     # Validate against paired cache
src-tauri/src/network/client.rs     # Accept direct IP/port
src-tauri/src/lib.rs                # New Tauri commands
src-tauri/Cargo.toml                # Add qrcode, image crates
src/lib/sync/local/index.ts         # New TypeScript bindings
src/contexts/LocalSyncContext.tsx   # Paired devices state
src/pages/Settings.tsx              # Local sync UI section
```

### Deleted Files (Phase 5)

```
src-tauri/src/network/mdns.rs       # mDNS discovery (remove)
```

### Dependencies

```toml
# Add to Cargo.toml
qrcode = "0.13"           # QR code generation
image = "0.24"            # PNG encoding
base64 = "0.21"           # URL-safe base64
```

---

## Appendix B: Tauri Command Reference

### New Commands

```rust
/// Generate QR code for pairing
/// Returns: { png_base64: String, payload: String, fingerprint: String }
#[tauri::command]
async fn pairing_generate_qr(state: State<...>) -> Result<QrCodeResponse, String>

/// Parse QR payload and validate
/// Returns: { device_id, device_name, ips, port, fingerprint, fingerprint_match }
#[tauri::command]
fn pairing_parse_qr(payload: String, state: State<...>) -> Result<PairingInfo, String>

/// Connect to device using pairing info (direct IP, not mDNS lookup)
#[tauri::command]
async fn pairing_connect(info: PairingInfo, state: State<...>) -> Result<(), String>

/// Get all paired devices with current status
#[tauri::command]
async fn cache_get_paired_devices(state: State<...>) -> Result<Vec<PairedDeviceWithStatus>, String>

/// Remove device from paired list
#[tauri::command]
async fn cache_remove_paired_device(device_id: String, state: State<...>) -> Result<(), String>

/// Trigger reconnection to all paired devices
#[tauri::command]
async fn cache_reconnect_all(state: State<...>) -> Result<(), String>

/// Trigger reconnection to specific device
#[tauri::command]
async fn cache_reconnect_device(device_id: String, state: State<...>) -> Result<(), String>
```

### Modified Commands

```rust
/// Now accepts either device_id (for cached peers) or direct connection info
#[tauri::command]
async fn network_connect_to_peer(
    device_id: Option<String>,
    ip: Option<String>,
    port: Option<u16>,
    state: State<...>
) -> Result<(), String>
```

---

## Appendix C: Event Reference

### New Events

```typescript
// Emitted when paired device status changes
interface PairedDeviceStatusEvent {
  deviceId: string;
  status: 'connecting' | 'connected' | 'offline' | 'error';
  error?: string;
}
app.emit('paired-device-status', event)

// Emitted when a new device is successfully paired
interface DevicePairedEvent {
  device: PairedDevice;
}
app.emit('device-paired', event)

// Emitted when device is removed from paired list
interface DeviceUnpairedEvent {
  deviceId: string;
}
app.emit('device-unpaired', event)
```

### Existing Events (unchanged)

```typescript
'local-peer-connected'    // Peer TCP connection established
'local-peer-disconnected' // Peer TCP connection lost
'local-sync-message'      // Loro update received from peer
```
