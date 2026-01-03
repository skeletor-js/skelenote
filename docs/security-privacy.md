# Security & Privacy Architecture

Skelenote is built on a simple principle: **your data belongs to you, and only you.**

---

## Why Local-First Matters

### The Problem with Cloud-First

Traditional note-taking apps follow a dangerous pattern: your thoughts live on servers you don't control. Even with "encryption at rest," the service provider holds the keys. This means:

- **Data breaches expose your private thoughts.** When the company gets hacked, your notes are in the breach.
- **Subpoenas access your content.** Government requests can compel disclosure without your knowledge.
- **Acquisitions change the rules.** The privacy policy you agreed to can vanish when the company is sold.
- **Shutdown means data loss.** When the service ends, your archive may become inaccessible.

### The Local-First Promise

Skelenote inverts this model:

1. **Data lives on your device first.** Your vault exists as files on your computer, not as rows in someone else's database.
2. **Sync is optional and user-initiated.** You control when and how data moves between devices.
3. **No account required.** Use Skelenote indefinitely without ever creating an account or connecting to our servers.
4. **Encryption keys never leave your device.** We cannot decrypt your data because we never have your keys.

---

## The Skeleton Key

Your **Skeleton Key** is a 24-word recovery phrase (BIP39 mnemonic) that serves as the root of all encryption in Skelenote.

```
example: abandon ability able about above absent absorb abstract absurd abuse access accident ...
```

### How It Works

1. **Generated locally.** The phrase is created on your device using cryptographically secure randomness. It is never transmitted anywhere.
2. **You control the backup.** Write it down, store it in a password manager, or memorize it. We cannot recover it for you—that's the point.
3. **Derives all other keys.** Your Skeleton Key generates the encryption keys, sync keys, and device identities through deterministic key derivation.

### Key Derivation (HKDF-SHA256)

From your Skeleton Key, we derive purpose-specific keys using HKDF with domain separation:

| Derived Key | Purpose | Domain Separator |
|-------------|---------|------------------|
| **Master Key** | Root encryption key | `skelenote-master` |
| **Sync Key** | Encrypts data in transit | `skelenote-sync` |
| **User ID** | Identifies your vault (for room matching) | `skelenote-userid` |
| **Signing Key** | Device revocation signatures | `skelenote-signing` |

This ensures that compromising one derived key does not compromise others.

---

## Encryption Algorithm: XChaCha20-Poly1305

Skelenote uses **XChaCha20-Poly1305** for all encryption. This is an Authenticated Encryption with Associated Data (AEAD) algorithm.

### Why XChaCha20-Poly1305?

| Property | Benefit |
|----------|---------|
| **256-bit key** | Quantum-resistant key size |
| **192-bit nonce** | Safe random generation without coordination |
| **AEAD** | Detects tampering, not just eavesdropping |
| **Modern & audited** | Used by Signal, WireGuard, and other security-critical software |
| **Fast in software** | No special CPU instructions required |

### Data Flow

```
[Your Edit] → [Loro CRDT Update] → [XChaCha20 Encrypt] → [Transmit]
[Receive] → [XChaCha20 Decrypt] → [Loro Merge] → [Your View]
```

All data is encrypted before leaving your device and decrypted only after arriving on your device.

---

## Threat Model

### What We Protect Against

| Threat | Protection |
|--------|------------|
| **Server compromise** | Zero-knowledge—servers only see encrypted blobs |
| **Man-in-the-middle** | End-to-end encryption with authenticated encryption |
| **Device theft** | Skeleton Key required for decryption |
| **Network eavesdropping** | All sync traffic encrypted |
| **Insider threat (us)** | We never have your keys |
| **Metadata analysis** | User ID is derived from key, not email/identity |

### What We Do NOT Protect Against

| Threat | Why |
|--------|-----|
| **Compromised device** | If malware controls your running app, encryption cannot help |
| **Lost Skeleton Key** | We cannot recover your data without it |
| **Coerced disclosure** | Encryption cannot protect against physical coercion |
| **Screen capture** | Data is decrypted while you view it |

### The Honest Truth

Encryption is not magic. It protects data at rest and in transit. It cannot protect data while you're actively using it on a compromised device. Your security posture depends on:

1. Keeping your Skeleton Key safe and backed up
2. Keeping your devices free of malware
3. Using strong device passwords/biometrics

---

## Zero-Knowledge Philosophy

"Zero-knowledge" means we cannot read your data even if we wanted to.

### How It Works

1. **Your Skeleton Key generates all encryption keys locally.** The key never leaves your device.
2. **We never receive your key or any derivative of it.** Our servers have no mechanism to decrypt.
3. **Sync servers (if used) only see encrypted blobs.** The relay is a dumb pipe.
4. **User ID is not your identity.** It's a cryptographic hash that lets devices find each other without revealing who you are.

### Verification

You don't have to trust our claims:

- **Open-source client code.** Inspect exactly what data is sent and how it's encrypted.
- **Encryption happens before network layer.** Trace the code—plaintext never touches network APIs.
- **Inspect traffic yourself.** Use Wireshark or Charles Proxy—you'll see gibberish.

---

## Data Sovereignty

### You Own Your Data

Your vault is stored in standard locations on your filesystem:

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/com.skelenote.app/` |
| Linux | `~/.local/share/skelenote/` |
| Windows | `%APPDATA%\skelenote\` |

The data format is documented Loro CRDT. You can:

- **Back up your vault** by copying these files
- **Export to Markdown** at any time from within the app
- **Move between devices** by transferring your Skeleton Key
- **Never be locked in** to our ecosystem

### Device Management

You control which devices can access your vault:

1. **Register devices** by entering your Skeleton Key on each device
2. **View connected devices** in Settings with last-seen timestamps
3. **Revoke devices** cryptographically—revoked devices are permanently blocked from sync
4. **Revocation is signed** with your Signing Key, preventing forgery

---

## Further Reading

- [Campfire Mode Guide](./campfire-guide.md) — Local network sync with air-gap security
- [Cloud Sync Setup](./cloud-sync-guide.md) — Optional relay server configuration
