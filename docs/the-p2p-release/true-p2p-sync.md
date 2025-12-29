# Local Network Sync

> **Status: IMPLEMENTED**

> Direct device-to-device sync on your local network with zero external dependencies. Your data never leaves your WiFi.

---

## 1. Overview

Enable direct peer-to-peer synchronization between Skelenote devices on the same local network. Unlike cloud-based sync, this approach uses mDNS for device discovery and direct TCP connections for data transfer—no external servers, no relay, no data leaving your network.

**User Value:**
- Instant sync when devices are on the same WiFi
- Works completely offline (no internet required)
- Maximum privacy—data stays on your local network
- Simple one-time pairing via QR code

**Privacy Benefits:**
- Zero data transmitted to external servers
- No relay servers involved in any way
- All traffic stays within your local network
- End-to-end encryption maintained (Skeleton Key)

---

## 2. Goals

### Primary Goals
- Automatic device discovery via mDNS/Bonjour on local network
- Direct TCP connections for sync message exchange
- QR code pairing as fallback when mDNS is blocked
- Seamless reconnection when devices rejoin the network

### Success Criteria
- Device discovery within 3 seconds on same network
- 95%+ success rate for LAN connections
- Sync latency under 100ms for small updates
- Auto-reconnect when device returns to network
- User can pair devices in under 20 seconds

### Non-Goals
- Cross-network sync (different WiFi networks)
- Sync over cellular/mobile data
- Cloud relay or fallback servers
- Complex NAT traversal (STUN/TURN)

### Explicit Limitations
This feature only works when devices are on the **same local network**. The following scenarios are NOT supported:

| Scenario | Supported? |
|----------|------------|
| Laptop + phone on home WiFi | Yes |
| Desktop + laptop at office | Yes |
| Phone on cellular, laptop at home | No |
| Laptop at coffee shop, desktop at home | No |

---

## 3. User Stories

**As a home user**, I want my laptop and phone to sync automatically when they're on my home WiFi, without any cloud services involved.

**As a privacy-focused user**, I want complete assurance that my notes never leave my local network, with no external servers in the sync chain.

**As an offline user**, I want sync to work even when my internet is down, as long as my devices are on the same WiFi.

**As a new user**, I want a simple QR code scan to pair my devices, then have sync "just work" automatically.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Device A (e.g., MacBook)                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Local Sync Service                                          │    │
│  │  ├── TCP Server (listens on dynamic port)                   │    │
│  │  ├── mDNS Advertiser (_skelenote._tcp.local)               │    │
│  │  └── Peer Manager (tracks connected devices)                │    │
│  └────────────────────────┬────────────────────────────────────┘    │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │   Local Network (WiFi/LAN)     │
            │   - mDNS discovery             │
            │   - Direct TCP connections     │
            │   - No external traffic        │
            └───────────────┬───────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────┐
│  Device B (e.g., iPhone)  │                                          │
│  ┌────────────────────────┴────────────────────────────────────┐    │
│  │  Local Sync Service                                          │    │
│  │  ├── TCP Client (connects to discovered peers)              │    │
│  │  ├── mDNS Browser (discovers _skelenote._tcp.local)        │    │
│  │  └── Peer Manager                                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Discovery: mDNS/Bonjour

Devices advertise and discover each other using mDNS (multicast DNS), the same protocol used by AirDrop, Chromecast, and printer discovery.

**Service Advertisement:**
```
Service: _skelenote._tcp.local
Instance: <device-name>._skelenote._tcp.local
Port: <dynamic-port>
TXT Record:
  - fp=<key-fingerprint>  (first 8 chars of userId hash)
  - v=1                    (protocol version)
```

**Discovery Flow:**
1. On sync enable, start advertising `_skelenote._tcp.local`
2. Simultaneously browse for other `_skelenote._tcp.local` services
3. Filter discovered services by matching `fp` (same Skeleton Key = same user)
4. Automatically connect to matching peers

### Connection: Direct TCP

Once peers are discovered, devices establish direct TCP connections for sync traffic.

**Connection Protocol:**
1. Device A discovers Device B via mDNS
2. Device A opens TCP connection to Device B's advertised port
3. Handshake: exchange device IDs, verify fingerprint match
4. Channel ready for encrypted Loro sync messages

**Message Format:**
```
[type: 1 byte][length: 4 bytes LE][payload: N bytes]

Types:
  0x01 HELLO      - Handshake with device info
  0x02 UPDATE     - Loro CRDT update (encrypted)
  0x03 SYNC_REQ   - Request full sync
  0x04 SYNC_RESP  - Full snapshot response
  0x05 PING       - Keep-alive
  0x06 PONG       - Keep-alive response
```

### Fallback: QR Code Pairing

When mDNS is blocked (some corporate networks, guest WiFi), users can manually pair via QR code.

**QR Code Contents:**
```
skelenote://pair?ip=192.168.1.50&port=8765&fp=a1b2c3d4&token=xyz123
```

**Pairing Flow:**
```
Device A                                    Device B
────────                                    ────────
1. User taps "Pair Device"

2. App generates QR with:
   - Local IP address
   - TCP server port
   - Key fingerprint
   - One-time token

3. QR displayed on screen

                            ──────────────►
                            (User scans QR)

                                           4. Parses QR, extracts info

                                           5. Connects to IP:port

                                           6. Verifies fingerprint
                                              matches local Skeleton Key

◄──────────────────────────────────────────
             (TCP connection established)

7. Both devices save peer info
   for future auto-reconnect
```

### Encryption

All sync traffic is encrypted using the existing Skeleton Key infrastructure:

1. Loro updates are encrypted with XChaCha20-Poly1305
2. Key derived from Skeleton Key via HKDF
3. Each message uses a unique random nonce
4. Same encryption as relay sync—just different transport

### Catch-Up After Offline

When a device reconnects after being offline:

1. On connect, exchange "last update sequence" numbers
2. Device with newer updates sends incremental changes
3. Loro CRDT merges automatically (no conflicts)
4. All updates stored locally in IndexedDB for history

---

## 5. Files to Create

| File | Purpose |
|------|---------|
| `src-tauri/src/network/mod.rs` | Network module exports |
| `src-tauri/src/network/server.rs` | TCP server for incoming peer connections |
| `src-tauri/src/network/client.rs` | TCP client for connecting to peers |
| `src-tauri/src/network/protocol.rs` | Binary message encoding/decoding |
| `src-tauri/src/network/mdns.rs` | mDNS service advertisement and browsing |
| `src/lib/sync/local/index.ts` | Local sync module exports |
| `src/lib/sync/local/discovery.ts` | Tauri command wrappers for mDNS |
| `src/lib/sync/local/pairing.ts` | QR code generation and parsing |
| `src/lib/sync/local/peer-registry.ts` | Persistent storage for paired peers |
| `src/lib/sync/local/auto-connect.ts` | Background reconnection logic |
| `src/lib/sync/local/catchup.ts` | History exchange and catch-up protocol |
| `src/components/sync/PairDeviceModal.tsx` | QR code display and scanning UI |
| `src/components/sync/LocalPeersList.tsx` | Connected/nearby devices list |

## 6. Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/Cargo.toml` | Add `tokio`, `mdns-sd` dependencies |
| `src-tauri/src/lib.rs` | Register new Tauri commands for local sync |
| `src/lib/sync/client.ts` | Add local transport mode alongside relay |
| `src/lib/sync/types.ts` | Add local peer types and connection states |
| `src/lib/loro/store.ts` | Add local update history persistence |
| `src/contexts/SyncContext.tsx` | Add local sync mode and peer state |
| `src/components/settings/SyncSettings.tsx` | Add "Local Sync" settings section |

---

## 7. Implementation Steps

1. **Create TCP server/client in Rust** (`src-tauri/src/network/`)
   - Async TCP listener on dynamic port
   - Connection manager for multiple peers
   - Binary protocol encoding/decoding
   - Tauri commands to start/stop server

2. **Implement mDNS discovery** (`src-tauri/src/network/mdns.rs`)
   - Service advertisement with fingerprint
   - Service browsing and filtering
   - Event emission for peer discovery
   - Handle network interface changes

3. **Build QR pairing flow** (`src/lib/sync/local/pairing.ts`)
   - Generate pairing QR data
   - Parse scanned QR codes
   - Validate fingerprint matches
   - Leverage existing `qr.rs` for generation

4. **Create peer registry** (`src/lib/sync/local/peer-registry.ts`)
   - IndexedDB storage for paired peers
   - Track last known IP/port
   - Store trust status
   - Prune stale entries

5. **Implement catch-up protocol** (`src/lib/sync/local/catchup.ts`)
   - Local update history in IndexedDB
   - Sequence number tracking
   - Incremental sync on reconnect
   - Leverage Loro CRDT merge

6. **Integrate with SyncContext** (`src/contexts/SyncContext.tsx`)
   - Add local sync mode
   - Expose peer connection state
   - Handle mode switching
   - Emit sync events

7. **Build settings UI** (`src/components/settings/SyncSettings.tsx`)
   - Local sync toggle
   - Paired devices list
   - "Pair New Device" button
   - Connection status indicators

---

## 8. UI/UX Considerations

### Sync Settings Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Sync Settings                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Local Network Sync                                    [Toggle]  │
│  ────────────────────────────────────────────────────────────── │
│  Sync directly with devices on your WiFi network.               │
│  Your data never leaves your local network.                      │
│                                                                  │
│  Nearby Devices                                    [ Pair New ]  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  MacBook Pro                                                │ │
│  │  ● Connected                                   [Disconnect] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  iPhone                                                      │ │
│  │  ○ Last seen 5 min ago                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Note: Devices must be on the same WiFi network to sync.        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pair Device Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Pair New Device                                          [ X ] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scan this QR code with your other device:                       │
│                                                                  │
│        ┌───────────────────────────────────────┐                │
│        │                                       │                │
│        │          [QR CODE]                    │                │
│        │                                       │                │
│        └───────────────────────────────────────┘                │
│                                                                  │
│  Both devices must be on the same WiFi network.                  │
│                                                                  │
│  ─────────────────── or ───────────────────────                  │
│                                                                  │
│  [ I want to scan a code instead ]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Connection Status Indicators

```
Status Icons (in header or settings):

● Connected (green)     - Actively syncing with peer(s)
○ Searching (gray)      - Looking for peers on network
◌ Offline (dim)         - Local sync disabled or no network

Tooltip on hover:
┌─────────────────────────────────────────┐
│  Local Sync: Connected                   │
│  ─────────────────────────────────────   │
│  2 devices on network                    │
│  ● MacBook Pro - connected               │
│  ● iPhone - connected                    │
│  Last sync: Just now                     │
└─────────────────────────────────────────┘
```

### Accessibility Requirements

- All connection status indicators have text alternatives
- Status changes announced to screen readers
- QR code has manual code alternative
- Keyboard navigation for all pairing flow steps
- Focus management during modal flow

---

## 9. Testing Checklist

### Unit Tests
- [ ] TCP server starts and accepts connections
- [ ] Binary protocol encodes/decodes correctly
- [ ] mDNS service advertises correctly
- [ ] mDNS browser discovers services
- [ ] Fingerprint filtering works
- [ ] QR code generation produces valid data
- [ ] QR code parsing extracts correct fields
- [ ] Peer registry stores and retrieves peers
- [ ] Encryption/decryption roundtrip succeeds

### Integration Tests
- [ ] Two devices discover each other via mDNS
- [ ] TCP connection established after discovery
- [ ] Loro update sent and received correctly
- [ ] QR pairing establishes connection
- [ ] Offline device catches up on reconnect
- [ ] Multiple simultaneous peer connections
- [ ] Connection survives network interface changes

### Manual QA Checklist
- [ ] Enable local sync in settings
- [ ] Two devices on same WiFi auto-discover
- [ ] Connection indicator shows "Connected"
- [ ] Create note on device A, appears on device B
- [ ] Edit note on device B, syncs to device A
- [ ] Put device B to sleep, make edits on A
- [ ] Wake device B, verify it catches up
- [ ] QR pairing works when mDNS blocked
- [ ] Paired device list shows correct status
- [ ] "Disconnect" removes peer connection
- [ ] Works with WiFi but no internet

### Edge Cases
- [ ] Both devices start simultaneously
- [ ] One device goes offline during sync
- [ ] Network interface changes mid-connection
- [ ] Very large Loro update (>1MB)
- [ ] Rapid connect/disconnect cycles
- [ ] Maximum peer limit (5 devices)
- [ ] mDNS blocked by firewall
- [ ] Multiple network interfaces (WiFi + Ethernet)
- [ ] Same device reconnects with different IP

---

## 10. Security Considerations

1. **Fingerprint Validation**
   - Only connect to devices with matching Skeleton Key fingerprint
   - Prevents connecting to wrong user's devices
   - Fingerprint is first 8 chars of userId hash (not secret)

2. **Encryption**
   - All sync messages encrypted with Skeleton Key
   - Same XChaCha20-Poly1305 as relay sync
   - Transport security via encryption, not TLS (local network)

3. **Pairing Tokens**
   - One-time tokens in QR codes prevent replay
   - Tokens expire after 5 minutes
   - Used only for initial pairing

4. **Local Network Only**
   - No exposure to internet reduces attack surface
   - Only devices on same network can connect
   - Firewall-friendly (no incoming internet connections)

---

## 11. Future Considerations

### Potential Enhancements
- Bluetooth discovery for nearby devices without WiFi
- Conflict resolution UI for rare edge cases
- Sync progress indicator for large updates
- Bandwidth limiting for metered networks
- Connection quality diagnostics

### If Cross-Network Needed Later
If users need cross-network sync in the future, options include:
- Self-hosted relay server (Docker image)
- VPN-based connectivity (Tailscale/WireGuard)
- Manual port forwarding setup guide

These are explicitly out of scope for v1 to maintain the zero-external-dependency goal.
