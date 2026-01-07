# Secure Device Linking

> **Status:** Future — Context for mobile app development  
> **Philosophy:** Same Skeleton Key, new device, zero trust in the network.

---

## Problem Statement

When a user wants to add a new device (e.g., phone) to their vault, they need to transfer their 24-word Skeleton Key. The current approach requires manual entry or displaying a QR code containing the raw mnemonic—both have significant security risks.

**Risks of raw mnemonic transfer:**
- Shoulder surfing (photo of QR = permanent vault access)
- No expiration (QR valid forever)
- No verification (can't confirm receiving device is legitimate)

---

## Solution: Ephemeral Key Exchange

A one-time, time-bound, visually-verified handshake between devices.

### Protocol Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  SOURCE DEVICE                    TARGET DEVICE                 │
│  (has Skeleton Key)               (new device)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. "Add Device" → Generate:                                    │
│     • Ephemeral X25519 keypair                                  │
│     • Session ID (UUID)                                         │
│     • Timestamp                                                 │
│           ↓                                                     │
│  2. Display QR code:              3. Scan QR code               │
│     session://skelenote/v2/       4. Generate own keypair       │
│     <pubkey>/<session>/<ts>       5. Derive shared secret       │
│           ↓                              ↓                      │
│  6. Wait for connection ←──LAN──→ 7. Connect via mDNS/TCP       │
│           ↓                              ↓                      │
│  8. Exchange encrypted hello      (both derive same secret)     │
│           ↓                              ↓                      │
│  9. Display 4-digit code          10. Display same code         │
│           ↓                              ↓                      │
│  11. User confirms match          (visual MITM protection)      │
│           ↓                                                     │
│  12. Encrypt & send Skeleton Key ─────→ 13. Decrypt & store     │
│           ↓                              ↓                      │
│  14. Invalidate session           15. Vault unlocked            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Properties

| Property | How Achieved |
|----------|--------------|
| **One-time use** | Session ID invalidated after single use or timeout |
| **Time-bound** | 5-minute expiration from QR generation |
| **Forward secrecy** | Ephemeral X25519 keypairs per session |
| **MITM protection** | 4-digit visual verification code |
| **Local-only** | mDNS discovery, no internet required |
| **Zero-knowledge** | Relay servers (if used) see only encrypted blobs |

---

## QR Code Format

**Deprecated (v1):**
```
skelenote:v1:<mnemonic>
```

**New (v2):**
```
skelenote:v2/<base64_pubkey>/<session_uuid>/<unix_timestamp>
```

The v2 format contains **no secrets**—only a public key and session identifier.

---

## Implementation Considerations

### Desktop-to-Desktop (Phase 1)
- Both devices on same LAN
- Discovery via existing mDNS infrastructure
- TCP connection for key exchange
- Fallback: manual mnemonic entry (always available)

### Desktop-to-Mobile (Phase 2 — Mobile App)
- Mobile scans QR with camera
- Same protocol over local network
- Consider Bluetooth as transport alternative
- Handle mobile backgrounding during pairing

### Edge Cases

| Scenario | Handling |
|----------|----------|
| QR expires | "Session expired. Generate new QR code." |
| Network disconnected | Fallback to manual entry |
| Verification code mismatch | Abort immediately, warn of possible attack |
| User cancels mid-flow | Invalidate session on both sides |
| App closed during pairing | Session auto-expires |

---

## UI Sketches

### Source Device: "Add Device"

```
┌─────────────────────────────────────────────────────────────────┐
│  Add New Device                                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scan this QR code with your other device                       │
│                                                                 │
│                    ┌───────────────┐                            │
│                    │   [QR CODE]   │                            │
│                    │               │                            │
│                    └───────────────┘                            │
│                                                                 │
│  Expires in 4:32                                                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Can't scan? Enter your Skeleton Key manually on the            │
│  other device.                      [Show Skeleton Key]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Verification Step

```
┌─────────────────────────────────────────────────────────────────┐
│  Verify Connection                                         [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Confirm this code matches on your other device:                │
│                                                                 │
│                         ┌─────────┐                             │
│                         │  7 2 4 9│                             │
│                         └─────────┘                             │
│                                                                 │
│  ⚠️ If the codes don't match, tap "Cancel" immediately.        │
│                                                                 │
│                                                                 │
│           [Cancel]                      [Codes Match]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify (Future)

| File | Purpose |
|------|---------|
| `src-tauri/src/crypto/device_linking.rs` | Rust protocol implementation |
| `src/lib/device-linking/` | Frontend handshake logic |
| `src/components/settings/AddDeviceModal.tsx` | QR display & verification UI |
| `src/components/setup/ScanQRStep.tsx` | Camera-based QR scanner (mobile) |

---

## Open Questions for Mobile Development

1. **Camera permissions:** How to handle gracefully if denied?
2. **Background handling:** What if user switches apps mid-pairing?
3. **Bluetooth transport:** Worth implementing as LAN fallback?
4. **Multi-device limit:** Should we cap connected devices?

---

## Related Documents

- [03-skeleton-key-docs.md](./03-skeleton-key-docs.md) — User guides and UX
- Architecture: [`docs/developer/architecture.md`](../../docs/developer/architecture.md)
- Existing P2P sync: [`src/lib/sync/`](../../src/lib/sync/)
