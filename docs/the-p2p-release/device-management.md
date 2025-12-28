# Device Management

> View connected devices, revoke access, and manage device security across your Skelenote P2P sync network.

---

## 1. Overview

Enable users to view, manage, and control devices that sync with their Skelenote vault. This feature integrates with **Local Network Sync** (see `true-p2p-sync.md`) to provide fully decentralized device management—no central server, all data stays on your local network.

**User Value:**
- See all devices that have synced with your vault at a glance
- Identify unknown or old devices that may still have access
- Quickly revoke access if a device is lost, stolen, or no longer needed
- Rename devices for easy identification across your device ecosystem

**Security Benefits:**
- Audit trail of connected devices with last-seen timestamps
- Immediate revocation prevents compromised devices from syncing on your network
- Cryptographically signed revocations prevent forgery
- Transparency into which devices hold copies of your encrypted data
- Key rotation option for maximum security after revoking a device

**Privacy Benefits:**
- Device registry synced via Loro CRDT—no central server stores your device list
- All device management happens on your local network
- Same zero-knowledge encryption as the rest of Skelenote

---

## 2. Goals

### Primary Goals
- Display a list of all devices that have synced with the user's vault
- Show real-time status indicators (connected/discovered/offline) and last-seen timestamps
- Enable device renaming for easier identification
- Provide device revocation that blocks future P2P sync connections
- Persist device registry locally as a Loro CRDT document, synced between peers

### Success Criteria
- Device list updates within 5 seconds when a new peer connects on local network
- Revoked devices are immediately blocked on the revoking device
- Revocation propagates to other online peers within 10 seconds
- Device metadata (name, platform, version) displays accurately
- Current device is clearly identified in the list
- Device registry persists across app restarts and syncs between devices

### Non-Goals
- Remote wipe of device data (out of scope for v1)
- Device-to-device direct messaging or notifications
- Limiting the number of connected devices
- Device approval workflow before first sync
- Cross-network device management (only works on same local network)

---

## 3. User Stories

**As a security-conscious user**, I want to see all devices connected to my vault so that I can verify only my devices have access.

**As a multi-device user**, I want to rename my devices so that I can easily distinguish between "Work Laptop" and "Home Desktop".

**As a user who lost a device**, I want to revoke its access immediately so that my data remains secure even if someone gains physical access.

**As a user setting up a new device**, I want to see my new device appear in the list so that I can confirm sync is working correctly.

**As a user reviewing security**, I want to see when each device last synced so that I can identify dormant or suspicious connections.

---

## 4. Technical Approach

### Architecture

This feature integrates with the Local Network Sync feature (see `true-p2p-sync.md`) to provide fully decentralized device management. There is no central server—device registry data is synced via Loro CRDT between peers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DeviceManager.tsx (Settings UI)                                             │
│  ├── Device list with status indicators                                     │
│  ├── Rename device dialog                                                   │
│  └── Revoke device confirmation (with key rotation advisory)                │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │ Context API
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SyncContext                                                                 │
│  ├── deviceRegistry: DeviceRegistryDoc (Loro CRDT)                          │
│  ├── localPeers: EphemeralPeerState[]                                       │
│  └── revocations: Map<deviceId, RevocationRecord>                           │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │ Tauri Commands
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Rust Backend (src-tauri/src/network/)                                       │
│  ├── PeerManager: connection state, blocklist                               │
│  ├── mDNS: discovery with deviceId in TXT record                            │
│  └── TCP: encrypted P2P sync messages                                       │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │ Direct TCP (encrypted)
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Other Devices on Local Network                                              │
│  └── Same architecture, bidirectional sync                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Device Registry Storage

The device registry is stored as a **separate Loro CRDT document** (`devices.loro`) that syncs alongside the main data document.

**Why separate from main document:**
- Device metadata changes frequently (lastSeen updates)
- Allows faster sync of just device state
- Can be pruned/compacted independently
- Security isolation (device data vs. user content)

**Storage location:**
```
~/.local/share/skelenote/data/
  store.loro         # Main data (existing)
  devices.loro       # Device registry (NEW)
  blocklist.json     # Local-only revocation cache (NEW)
```

**Registry CRDT structure:**
```typescript
interface DeviceRegistryDoc {
  // Map<deviceId, DeviceRecord>
  devices: LoroMap<string, DeviceRecord>;

  // Map<deviceId, RevocationRecord>
  revocations: LoroMap<string, RevocationRecord>;

  // Registry metadata
  meta: {
    version: number;
    createdAt: number;
  };
}
```

### Device Discovery Integration

Device discovery leverages the mDNS infrastructure from Local Network Sync (see `true-p2p-sync.md`):

1. **mDNS TXT record extended** with deviceId for quick revocation pre-check:
   ```
   TXT Record:
     - fp=a1b2c3d4        (fingerprint - same user)
     - v=1                 (protocol version)
     - did=<deviceId>      (for revocation pre-check)
   ```

2. **Discovery flow:**
   - On mDNS discovery, check if `did` is in local blocklist → ignore if revoked
   - Initiate TCP connection only to non-revoked peers
   - Exchange full device metadata in HELLO handshake

### Device Registration Flow

1. **App startup**: Load local DeviceRegistryDoc from `devices.loro`
2. **mDNS discovery**: Find peer on local network
3. **TCP connect**: Establish encrypted connection
4. **Extended HELLO handshake**:
   ```typescript
   interface HelloPayload {
     deviceId: string;
     protocolVersion: number;
     encrypted: boolean;
     lastSequence?: number;
     // Device metadata
     deviceName: string;
     platform: 'macos' | 'windows' | 'linux' | 'ios' | 'android';
     appVersion: string;
     // Registry sync
     registryVersion: string;       // Loro version vector
     knownRevocations: string[];    // deviceIds this device knows are revoked
   }
   ```
5. **Registry sync**: Exchange device registry updates via Loro CRDT
6. **Update lastSeen**: Record connection in registry

### Revocation Mechanism

Without a central server, revocation uses a multi-layer approach:

**Layer 1: Local Blocklist (Immediate)**
- Each device maintains a local blocklist enforced independently
- Revocation takes effect immediately on the revoking device
- Stored in `blocklist.json` for persistence

**Layer 2: CRDT-Synced Revocations (Eventually Consistent)**
- RevocationRecord added to `devices.loro`
- Syncs to all connected peers via normal CRDT merge
- Eventually propagates to all devices in the network

**Layer 3: Signed Revocations (Forgery Prevention)**
- Revocation records are cryptographically signed
- Signature uses Ed25519 key derived from Skeleton Key via HKDF
- Prevents malicious devices from forging revocations

**Layer 4: Key Rotation Advisory (Ultimate Security)**
- UI recommends Skeleton Key rotation for high-security scenarios
- Only complete solution if device is compromised

**Revocation flow:**
```
Device A (revoking)                    Device C (online peer)
────────────────────                   ──────────────────────

1. User taps "Revoke Device B"

2. Add B to local blocklist (immediate)

3. Create signed RevocationRecord in CRDT:
   {
     deviceId: "B",
     revokedAt: Date.now(),
     revokedBy: "A",
     signature: <Ed25519 signature>
   }

4. If B is connected: close TCP connection

5. Sync CRDT update
                    ─────────────────►
                                       6. Verify signature

                                       7. Add B to local blocklist

                                       8. If B connected: close connection
```

**Enforcement points:**
- mDNS discovery filter (check `did` in TXT record against blocklist)
- TCP handshake validation (verify deviceId not in blocklist)
- HELLO message rejection (check knownRevocations)

### Connection Status Model

In P2P, status reflects local network reachability:

```typescript
type LocalPeerStatus =
  | 'connected'      // Active TCP connection, syncing
  | 'discovered'     // Found via mDNS, not yet connected
  | 'connecting'     // TCP connection in progress
  | 'disconnected'   // Was connected, connection lost
  | 'offline';       // Not seen on network
```

Status is determined from ephemeral state (not persisted in CRDT):
- Active TCP connection → `connected`
- Recently discovered via mDNS (< 30s) → `discovered`
- Recently connected but gone (< 60s) → `disconnected`
- Otherwise → `offline`

### Data Models

**DeviceRecord** (stored in CRDT, synced between peers):
```typescript
interface DeviceRecord {
  deviceId: string;
  deviceName: string;
  platform: 'macos' | 'windows' | 'linux' | 'ios' | 'android';
  appVersion: string;
  protocolVersion: number;
  firstSeen: number;          // Unix timestamp
  lastSeen: number;           // Unix timestamp
  lastSeenBy: string;         // deviceId that recorded lastSeen
}
```

**RevocationRecord** (stored in CRDT, synced between peers):
```typescript
interface RevocationRecord {
  deviceId: string;
  revokedAt: number;
  revokedBy: string;
  reason?: string;
  signature: Uint8Array;      // Ed25519 signature for forgery prevention
}
```

**EphemeralPeerState** (in memory only, not synced):
```typescript
interface EphemeralPeerState {
  deviceId: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastConnectedIp?: string;
  lastConnectedPort?: number;
  lastConnectedAt?: number;
  discoveredViaMdns: boolean;
  mdnsServiceName?: string;
}
```

**DeviceInfo** (combined view for UI):
```typescript
interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'macos' | 'windows' | 'linux' | 'ios' | 'android';
  appVersion: string;
  isCurrentDevice: boolean;
  status: LocalPeerStatus;
  lastSeen: number;
  firstSeen: number;
}
```

### Encryption Consistency

All device management data uses the same encryption as the rest of Skelenote:
- Device registry CRDT (`devices.loro`) encrypted with XChaCha20-Poly1305
- Key derived from Skeleton Key via HKDF
- Revocation signatures use Ed25519 derived from Skeleton Key
- All device management messages over TCP are encrypted
- Fingerprint validation uses same userId hash as mDNS discovery

### Protocol Messages

These extend the TCP protocol from Local Network Sync (see `true-p2p-sync.md`):

| Type | Value | Direction | Payload |
|------|-------|-----------|---------|
| `DEVICE_REGISTRY` | `0x10` | Bidirectional | Loro snapshot (encrypted) |
| `DEVICE_UPDATE` | `0x11` | Bidirectional | Loro update bytes (encrypted) |
| `REVOKE` | `0x12` | Bidirectional | `{ deviceId, revokedAt, revokedBy, signature }` |
| `REVOKE_ACK` | `0x13` | Bidirectional | `{ deviceId, acknowledgedBy }` |
| `RENAME` | `0x14` | Bidirectional | `{ deviceId, newName, renamedAt }` |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/sync/local/peer-registry.ts` | Device registry CRDT management |
| `src/lib/sync/local/peer-state.ts` | Ephemeral peer connection state |
| `src/lib/sync/local/revocation.ts` | Revocation logic and local blocklist |
| `src/lib/sync/devices.ts` | Device-related types and utilities |
| `src/components/settings/DeviceManager.tsx` | Device list UI component |
| `src/components/settings/DeviceManager.css` | Component styles |
| `src-tauri/src/network/peer_manager.rs` | Rust peer connection and state management |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/sync/protocol.ts` | Add device management message types |
| `src/lib/sync/types.ts` | Add DeviceInfo, RevocationRecord, PeerConnectionState types |
| `src/lib/sync/device.ts` | Add platform detection, device name storage |
| `src/lib/loro/store.ts` | Add device registry document handling |
| `src/contexts/SyncContext.tsx` | Add device list, peer state, revocation methods |
| `src/components/settings/SettingsView.tsx` | Add DeviceManager section |
| `src-tauri/src/network/mdns.rs` | Add `did` to TXT record, blocklist filtering |
| `src-tauri/src/network/protocol.rs` | Add device management message types |

---

## 5. Implementation Steps

1. **Extend protocol with device messages** (`src/lib/sync/protocol.ts`, `src-tauri/src/network/protocol.rs`)
   - Add DEVICE_REGISTRY, DEVICE_UPDATE, REVOKE, REVOKE_ACK, RENAME message types
   - Define payload interfaces for each
   - Extend HELLO payload with device metadata and registry version

2. **Add device utilities** (`src/lib/sync/devices.ts`, `src/lib/sync/device.ts`)
   - Platform detection function (Tauri API)
   - Device name storage in localStorage with default generation
   - DeviceInfo, DeviceRecord, RevocationRecord type definitions

3. **Create device registry CRDT storage** (`src/lib/sync/local/peer-registry.ts`, `src/lib/loro/store.ts`)
   - Initialize `devices.loro` document alongside `store.loro`
   - Implement DeviceRegistryDoc structure with Loro maps
   - Add methods for device upsert, query, and update

4. **Implement local blocklist** (`src/lib/sync/local/revocation.ts`)
   - Persist blocklist to `blocklist.json`
   - Load blocklist on app startup
   - Provide methods to add/check/remove from blocklist

5. **Extend HELLO handshake** (`src/lib/sync/local/discovery.ts`)
   - Include deviceName, platform, appVersion in HELLO payload
   - Include registryVersion and knownRevocations
   - Verify peer not in local blocklist before connecting

6. **Implement registry sync on peer connect** (`src/lib/sync/local/peer-registry.ts`)
   - Compare registry versions on HELLO exchange
   - Send/receive DEVICE_UPDATE messages for incremental sync
   - Merge updates via Loro CRDT
   - Update lastSeen for connected peer

7. **Implement rename flow** (`src/lib/sync/local/peer-registry.ts`)
   - Update DeviceRecord in local CRDT
   - CRDT automatically syncs to connected peers
   - Update local device name storage if renaming self

8. **Implement revoke flow** (`src/lib/sync/local/revocation.ts`)
   - Add to local blocklist (immediate enforcement)
   - Create signed RevocationRecord in CRDT
   - Close TCP connection to revoked device if connected
   - CRDT syncs revocation to other peers
   - Other peers verify signature and add to their blocklists

9. **Integrate with mDNS discovery** (`src-tauri/src/network/mdns.rs`)
   - Add `did=<deviceId>` to mDNS TXT record
   - Filter discovered peers against local blocklist
   - Skip connection attempts to revoked devices

10. **Build DeviceManager UI** (`src/components/settings/DeviceManager.tsx`)
    - Device list with P2P status indicators (connected/discovered/offline)
    - Current device badge
    - Rename action with inline editing or dialog
    - Revoke action with confirmation dialog and key rotation advisory

11. **Integrate into Settings** (`src/components/settings/SettingsView.tsx`)
    - Add DeviceManager section
    - Ensure proper styling and spacing

12. **Update SyncContext** (`src/contexts/SyncContext.tsx`)
    - Expose deviceRegistry, localPeers, and revocation methods
    - Subscribe to registry CRDT changes
    - Track ephemeral peer connection state

---

## 6. UI/UX Considerations

### Device List in Settings

```
┌─────────────────────────────────────────────────────────────┐
│  Connected Devices                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● MacBook Pro (This Device)                         │   │
│  │   macOS · v1.2.0 · Online now                       │   │
│  │                                      [Rename]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ iPhone 15                                         │   │
│  │   iOS · v1.2.0 · Last seen 2 hours ago              │   │
│  │                              [Rename]  [Revoke]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Windows Desktop                                   │   │
│  │   Windows · v1.1.0 · Last seen 3 days ago           │   │
│  │                              [Rename]  [Revoke]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Device Card with Status

```
┌───────────────────────────────────────────────────────────┐
│ ● MacBook Pro (This Device)                               │
│   ┌────────────────────────────────────────────────────┐  │
│   │ Platform:    macOS                                 │  │
│   │ App Version: v1.2.0                                │  │
│   │ Status:      ● Connected                           │  │
│   │ First seen:  Dec 15, 2024                          │  │
│   │ Last sync:   Just now                              │  │
│   └────────────────────────────────────────────────────┘  │
│                                                           │
│   [Rename Device]                                         │
└───────────────────────────────────────────────────────────┘

Legend (P2P Status):
● Green dot  = Connected (active TCP connection on local network)
◐ Yellow dot = Discovered (found via mDNS, connecting...)
○ Gray dot   = Offline (not seen on local network)
```

### Rename Device Dialog

```
┌─────────────────────────────────────────────────────────┐
│  Rename Device                                     [X]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Current name: MacBook Pro                              │
│                                                         │
│  New name:                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Work Laptop                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │      Cancel         │  │        Rename           │  │
│  └─────────────────────┘  └─────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Revoke Confirmation Dialog

```
┌─────────────────────────────────────────────────────────┐
│  Revoke Device Access                              [X]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚠️ Are you sure you want to revoke access for:         │
│                                                         │
│     "iPhone 15"                                         │
│                                                         │
│  This device will be immediately disconnected and       │
│  blocked from syncing on your local network.            │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │      Cancel         │  │   Revoke Access         │  │
│  └─────────────────────┘  └─────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Rotation Advisory Dialog

After successful revocation, this dialog is shown for high-security scenarios:

```
┌─────────────────────────────────────────────────────────┐
│  Device Revoked                                    [X]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ "iPhone 15" has been revoked and can no longer      │
│    sync with your other devices.                        │
│                                                         │
│  ⚠️ Security Recommendation                             │
│  ───────────────────────────────────────────────────── │
│  The revoked device may still have a copy of your      │
│  data. For maximum security, you can rotate your       │
│  Skeleton Key.                                          │
│                                                         │
│  This will:                                             │
│  • Generate a new Skeleton Key                          │
│  • Require re-pairing all devices                       │
│  • Re-encrypt all synced data                           │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │   Done              │  │   Rotate Skeleton Key   │  │
│  └─────────────────────┘  └─────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Settings | `Cmd+,` (existing) |
| Navigate device list | `Arrow Up/Down` |
| Rename selected device | `Enter` or `R` |
| Cancel dialog | `Escape` |
| Confirm dialog | `Enter` (when focused on confirm button) |

### Accessibility Requirements

- Device list must be keyboard navigable with clear focus indicators
- Status indicators (online/offline) must have text labels for screen readers
- "This Device" badge announced to screen readers
- Revoke confirmation dialog traps focus
- Dialog close button accessible via keyboard
- Time-relative labels ("2 hours ago") should include full timestamp in tooltip/aria-label
- Color-blind safe status indicators (use icons in addition to color)

---

## 7. Testing Checklist

### Unit Tests
- [ ] Platform detection returns correct values for each OS
- [ ] Device name generation creates reasonable defaults
- [ ] Device name storage/retrieval works correctly
- [ ] DEVICE_REGISTRY message encoding/decoding
- [ ] DEVICE_UPDATE message encoding/decoding
- [ ] REVOKE message encoding/decoding
- [ ] DeviceRecord and RevocationRecord type validation
- [ ] Ed25519 signature generation for revocations
- [ ] Ed25519 signature verification for received revocations
- [ ] Local blocklist persistence (blocklist.json)
- [ ] Loro CRDT merge for device registry

### Integration Tests
- [ ] Device registered in CRDT on first P2P connect
- [ ] Device lastSeen updates on sync activity
- [ ] Device registry syncs between two peers
- [ ] Device registry syncs to third peer when it connects
- [ ] Rename updates propagate via CRDT to all peers
- [ ] Revoke immediately blocks device on revoking peer
- [ ] Revoke propagates to other online peers via CRDT
- [ ] Revoked device blocked on reconnect attempt
- [ ] Revoked device filtered at mDNS discovery level
- [ ] Device registry persists across app restart
- [ ] Signature verification rejects forged revocations

### Manual QA Checklist
- [ ] Device list shows all known devices
- [ ] Current device clearly identified
- [ ] P2P status indicators update correctly (connected/discovered/offline)
- [ ] Last seen timestamps display correctly
- [ ] Rename dialog opens and closes properly
- [ ] Rename updates device list immediately
- [ ] Renamed device name persists after app restart
- [ ] Rename syncs to other devices
- [ ] Revoke confirmation dialog shows device name
- [ ] Revoke removes device from list
- [ ] Revoked device cannot reconnect
- [ ] Key rotation advisory dialog appears after revocation
- [ ] Empty state displayed when only current device
- [ ] List scrolls properly with many devices

### P2P-Specific Tests
- [ ] mDNS TXT record includes deviceId (`did=`)
- [ ] Discovered peer with revoked deviceId is ignored
- [ ] TCP handshake rejected for revoked device
- [ ] Offline device catches up on revocations when it reconnects
- [ ] New device receives full revocation history on pairing
- [ ] Multiple devices can be revoked in sequence
- [ ] Revocation works without internet (local network only)

### Edge Cases
- [ ] Device with very long name (truncation/wrapping)
- [ ] Multiple devices connecting simultaneously
- [ ] Revoking device that is currently syncing
- [ ] Network disconnect during rename operation
- [ ] Network disconnect during revoke operation
- [ ] Device reconnecting after being offline for extended period
- [ ] Duplicate device names (should be allowed)
- [ ] Unicode characters in device names
- [ ] Revoke all other devices scenario
- [ ] Current device cannot revoke itself
- [ ] Handle empty device registry (fresh install)
- [ ] Handle malformed CRDT data gracefully
- [ ] Conflicting lastSeen updates from multiple devices (CRDT merge)
- [ ] Device that was offline during revocation tries to sync

---

## 8. Future Considerations

### Potential Enhancements
- **Remote wipe**: Request data deletion on specific device (requires cooperation from target device)
- **Device approval**: Require approval from existing device before new device can sync
- **Device limits**: Configurable maximum number of devices
- **Activity log**: Detailed sync history per device stored in CRDT
- **Bluetooth discovery**: Find nearby devices without WiFi using Bluetooth LE
- **Device groups**: Organize devices into work/personal categories

### Security Enhancements
- **Skeleton Key rotation workflow**: Guided process to rotate key and re-pair all devices
- **Trusted device designation**: Only certain devices can revoke others
- **Anomaly detection**: Alert on unusual sync patterns (many rapid connections, etc.)
- **Biometric re-verification**: Require Face ID/Touch ID for revocation actions

### Cross-Network Sync (Future)

If cross-network sync is needed later (devices on different networks), options include:
- **Self-hosted relay server**: Docker image users can deploy
- **VPN-based connectivity**: Tailscale/WireGuard integration
- **Manual port forwarding**: Setup guide for advanced users

These are explicitly out of scope for v1 to maintain the zero-external-dependency goal.

### UX Improvements
- **Device icons**: Visual icons for each platform (macOS, Windows, iOS, etc.)
- **Drag to reorder**: Prioritize important devices in the list
- **Quick actions**: Swipe gestures on mobile for rename/revoke
- **Connection quality**: Show sync speed/reliability per device
- **Sync progress**: Show data transfer progress for large syncs

### P2P-Specific Considerations
- **Revocation propagation delay**: UI indicator when revocation is still propagating
- **Conflict resolution UI**: Handle rare edge cases where CRDT merge needs user input
- **Network diagnostics**: Help users troubleshoot mDNS/TCP connection issues
- **Offline revocation queue**: Queue revocations made while offline for later propagation
