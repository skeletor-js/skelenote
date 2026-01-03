# Campfire Mode: Local Network Sync

**Physical proximity is the ultimate encryption.** Campfire Mode lets devices sync directly over your local network—no internet, no cloud, no interception possible.

---

## What is Campfire Mode?

Campfire is Skelenote's local P2P sync system. When enabled:

1. Your device advertises itself on the local network
2. Other Skelenote devices with the same Skeleton Key are discovered
3. Data syncs directly between devices over TCP
4. All traffic stays on your local network

**No internet required. No relay servers. No data exposure.**

This is the **Privacy Air-Gap**: the only way to share data that nobody can intercept is to never send it over the internet at all.

---

## How Discovery Works

### mDNS/Bonjour

Skelenote uses mDNS (multicast DNS) to advertise and discover peers on your local network:

- **Service type:** `_skelenote._tcp.local.`
- **Automatic discovery:** Devices appear within seconds of joining the network
- **No configuration needed:** Works on any local network (WiFi, Ethernet, VPN)

### TXT Record Metadata

Each device advertises:

| Field | Description |
|-------|-------------|
| `fp` | Key fingerprint (for peer filtering) |
| `id` | Device ID |
| `name` | Human-readable device name |
| `v` | Protocol version |

### Peer Filtering

Only devices with matching key fingerprints can discover each other:

- Fingerprint is derived from your Skeleton Key
- Different keys = different fingerprints = invisible to each other
- Revoked devices are blocked even with matching fingerprints

This means a coffee shop full of Skelenote users won't see each other's devices—only devices sharing the same Skeleton Key appear.

---

## Setting Up Campfire Sync

### Prerequisites

- Two or more devices with Skelenote installed
- Same Skeleton Key configured on all devices
- Devices on the same local network (WiFi, LAN, or VPN)

### Steps

1. Open **Settings > Sync > Local Sync**
2. Toggle **Enable Local Sync** on
3. Your device will appear in the "Discovered Devices" list on other devices
4. Sync happens automatically when devices connect

### Verifying Connection

| Indicator | Meaning |
|-----------|---------|
| Green dot | Connected and syncing |
| Yellow dot | Discovered, connecting |
| Device list | Shows last sync time for each device |

Changes propagate within seconds on a typical local network.

---

## Security Guarantees

### Why Proximity = Security

| Layer | Protection |
|-------|------------|
| **Physical** | Data never leaves your building/network |
| **Discovery** | Only matching Skeleton Keys can discover each other |
| **Transport** | XChaCha20-Poly1305 encryption on all data |
| **Authentication** | Key fingerprint verification |
| **Revocation** | Cryptographically signed device blocklist |

### The Air-Gap Advantage

When you sync via Campfire:

- No DNS lookups to external servers
- No TCP connections outside your network
- No possibility of internet interception
- Traffic is encrypted even locally (defense in depth)

Even if someone is monitoring your local network, they see only encrypted packets that they cannot decrypt without your Skeleton Key.

---

## Use Cases

### Team Meetings

Sync meeting notes with everyone in the room. When the meeting ends, everyone has the complete record—without ever touching a cloud server.

**Scenario:** Your team gathers for a strategy session. One person takes notes in Skelenote. By the end of the meeting, everyone's devices have the notes. No cloud, no shared drives, no permissions to configure.

### Shared Workspaces

Offices, co-working spaces, or studios can maintain shared knowledge bases that never leave the building.

**Scenario:** A law firm keeps case research in Skelenote. Attorneys sync their devices over the office network. Client-privileged information never traverses the internet.

### Sensitive Environments

Legal offices, medical facilities, or any environment where data must not leave the premises.

**Scenario:** A hospital uses Skelenote for internal documentation. HIPAA compliance is simplified because PHI never leaves the hospital network.

### Untrusted Networks

Hotel WiFi, conference networks, or any public network becomes safer because data only syncs locally.

**Scenario:** You're at a conference with your laptop and phone on the hotel WiFi. Campfire syncs your devices directly. Even if the hotel network is compromised, your data is encrypted end-to-end and never leaves the local network.

---

## Troubleshooting

### Devices Not Discovering Each Other

1. **Verify same Skeleton Key** on all devices
2. **Check network:** Devices must be on the same subnet
3. **Firewall:** Ensure mDNS (UDP 5353) and Skelenote TCP port are allowed
4. **Try toggling:** Turn Local Sync off and on
5. **VPN interference:** Some VPNs block local network traffic

### Sync Not Working

1. **Check device status** in Settings > Devices—ensure device is not revoked
2. **Verify encryption key matches** (same Skeleton Key on both devices)
3. **Network restrictions:** Some corporate networks block peer-to-peer traffic
4. **Restart devices:** Close and reopen Skelenote on both devices

### Slow Sync

1. **Large vault:** Initial sync of a large vault takes longer
2. **Network congestion:** Other traffic on the network may slow sync
3. **WiFi quality:** Poor signal strength affects sync speed

---

## Campfire vs Cloud Sync

| Aspect | Campfire | Cloud Relay |
|--------|----------|-------------|
| **Internet required** | No | Yes |
| **Data leaves network** | No | Yes (encrypted) |
| **Works globally** | No | Yes |
| **Maximum security** | Yes | Very high |
| **Requires relay server** | No | Yes |
| **Sync speed** | Fast (local) | Depends on internet |
| **Setup complexity** | None | Minimal |

**Choose Campfire when:**
- Security is paramount
- Devices are physically proximate
- You don't want any data on the internet

**Choose Cloud Relay when:**
- You need sync across cities/countries
- Devices are rarely on the same network
- Convenience outweighs maximum security

You can use both: Campfire for local sync when available, Cloud Relay for remote devices.

---

## Further Reading

- [Security & Privacy Deep Dive](./security-privacy.md) — Full encryption architecture
- [Cloud Sync Setup](./cloud-sync-guide.md) — Configure relay server sync
