# Hearth: Local Network Sync

**Physical proximity is the ultimate encryption.** Hearth lets devices sync directly over your local network—no internet, no cloud, no interception possible.

---

## What is Hearth?

Hearth is Skelenote's local network sync system. When enabled:

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

## Setting Up Hearth

### Prerequisites

- Two or more devices with Skelenote installed
- Same Skeleton Key configured on all devices
- Devices on the same local network (WiFi, LAN, or VPN)

### Steps

1. Open **Settings > Sync > Hearth**
2. Toggle **Enable Hearth** on
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

## QR Code Pairing

### Why QR Pairing?

While mDNS discovery works automatically on most networks, some environments make it difficult:

- **Mobile devices** may not support mDNS reliably
- **Corporate networks** often block multicast traffic
- **VPN configurations** can interfere with local discovery
- **Complex network setups** with multiple subnets or VLANs

QR code pairing solves these problems by encoding connection information directly. Point, scan, connect—no network configuration required.

### Generating a QR Code (Desktop)

1. Open **Settings > Devices**
2. Click **Show Pairing QR**
3. A QR code appears on screen
4. The QR code remains valid for 5 minutes

The QR code contains your device's connection information, encrypted so that only devices with your Skeleton Key can read it.

### Scanning a QR Code (Mobile)

1. Open **Settings > Devices** on your mobile device
2. Tap the **QR scanner icon** (camera icon next to "Add Device")
3. Point your camera at the QR code on the other device
4. Connection establishes automatically

Once paired, devices remember each other and reconnect automatically when on the same network.

### What the QR Contains

The QR code encodes:

| Field | Purpose |
|-------|---------|
| Device IP address | Where to connect |
| TCP port | Which port to use |
| Device ID | Unique identifier |
| Device name | Human-readable name |
| Protocol version | Ensures compatibility |

**All fields are encrypted** with a key derived from your Skeleton Key. The QR code is useless to anyone who does not have your Skeleton Key.

### QR Security

QR pairing maintains Skelenote's zero-knowledge security model:

- **Encrypted payload:** QR data is encrypted with XChaCha20-Poly1305
- **Key-bound:** Only devices with your Skeleton Key can decrypt the QR
- **Time-limited:** QR codes expire after 5 minutes
- **No secrets exposed:** Even if photographed, the QR reveals nothing without your Skeleton Key

**Scenario:** You display a pairing QR at a coffee shop. Someone photographs it. They cannot extract any useful information—the encrypted payload requires your Skeleton Key to decrypt.

### QR Pairing Troubleshooting

**Camera not working:**

- Check that Skelenote has camera permissions in your device settings
- On iOS: Settings > Skelenote > Camera
- On Android: Settings > Apps > Skelenote > Permissions > Camera

**QR code not scanning:**

- Ensure adequate lighting on the QR code
- Hold the camera steady at reading distance (6-12 inches)
- Clean your camera lens
- Try regenerating the QR code on the source device

**"QR Expired" error:**

- QR codes are valid for 5 minutes
- Generate a fresh QR code and try again

**"Connection Failed" after scanning:**

- Verify both devices are on the same network
- Check that the source device is still running Skelenote
- Ensure no firewall is blocking the connection
- Try disabling VPN on both devices temporarily

**"Invalid QR Code" error:**

- Ensure you are scanning a Skelenote pairing QR, not another app's QR
- Verify both devices have the same Skeleton Key configured

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

When you sync via Hearth:

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

**Scenario:** You're at a conference with your laptop and phone on the hotel WiFi. Hearth syncs your devices directly. Even if the hotel network is compromised, your data is encrypted end-to-end and never leaves the local network.

---

## Troubleshooting

### Devices Not Discovering Each Other

1. **Verify same Skeleton Key** on all devices
2. **Check network:** Devices must be on the same subnet
3. **Firewall:** Ensure mDNS (UDP 5353) and Skelenote TCP port are allowed
4. **Try toggling:** Turn Hearth off and on
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

## Hearth vs Courier

| Aspect | Hearth | Courier |
|--------|--------|---------|
| **Internet required** | No | Yes |
| **Data leaves network** | No | Yes (encrypted) |
| **Works globally** | No | Yes |
| **Maximum security** | Yes | Very high |
| **Requires relay server** | No | Yes |
| **Sync speed** | Fast (local) | Depends on internet |
| **Setup complexity** | None | Minimal |

**Choose Hearth when:**

- Security is paramount
- Devices are physically proximate
- You don't want any data on the internet

**Choose Courier when:**

- You need sync across cities/countries
- Devices are rarely on the same network
- Convenience outweighs maximum security

You can use both: Hearth for local sync when available, Courier for remote devices.

---

## Further Reading

- [Security & Privacy Deep Dive](security-privacy.md) — Full encryption architecture
- [Courier Setup](courier-guide.md) — Configure relay server sync
