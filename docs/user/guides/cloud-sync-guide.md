# Self-Hosted Sync

Sync your vault across the internet through a WebSocket relay that you run yourself.

---

## Overview

There is no hosted Skelenote sync service. To sync devices that aren't on the same network, you run your own relay. It syncs data between your devices anywhere in the world, and all data is end-to-end encrypted, so the relay only sees encrypted blobs and cannot read your content.

**Key Points:**

- Relay cannot decrypt your data (zero-knowledge)
- Optional—Skelenote works fully offline without it
- You host the relay yourself for complete control

Use relay sync when devices aren't on the same network. For local sync, see [Local sync](local-sync-guide.md).

---

## Architecture

```
┌─────────────────┐                              ┌─────────────────┐
│    Device A     │                              │    Device B     │
│   (Home Mac)    │                              │  (Office PC)    │
│                 │                              │                 │
│  ┌───────────┐  │                              │  ┌───────────┐  │
│  │  Encrypt  │──┼──────────────────────────────┼──│  Decrypt  │  │
│  └───────────┘  │                              │  └───────────┘  │
└────────┬────────┘                              └────────▲────────┘
         │                                                │
         │          Encrypted Blobs Only                  │
         │                                                │
         ▼                                                │
┌─────────────────────────────────────────────────────────────────┐
│                        Relay Server                              │
│                                                                  │
│  • Receives encrypted data                                       │
│  • Stores in room by User ID                                     │
│  • Forwards to connected devices                                 │
│  • Cannot decrypt anything                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

The relay is a dumb pipe. It routes encrypted packets between your devices but cannot read, index, or analyze your data.

---

## Encryption Guarantees

Even with relay sync, your data remains private:

| Stage | Protection |
|-------|------------|
| **Before transmission** | Data encrypted with your Sync Key (derived from Skeleton Key) |
| **In transit** | TLS (wss://) + XChaCha20-Poly1305 |
| **At rest on server** | Still encrypted—server has no keys |
| **On receipt** | Decrypted locally with your Sync Key |

The relay never has access to:

- Your Skeleton Key
- Your Sync Key
- Any plaintext data
- Ability to decrypt anything

---

## Running the Relay

The relay lives in [`sync-relay/`](../../../sync-relay/) and ships with a Dockerfile and `docker-compose.yml`.

### Requirements

- Server with public IP or domain
- Docker (recommended) or the Node toolchain
- TLS certificate (Let's Encrypt works)

### Docker Deployment

From the repo:

```bash
cd sync-relay
docker compose up -d
```

The relay stores only encrypted update blobs, a user ID derived from your key (it does not know who you are), device metadata for presence, and update sequence numbers for catch-up sync. It never has your Skeleton Key, your Sync Key, any plaintext, or the ability to decrypt anything.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | WebSocket listen port |
| `RUST_LOG` | info | Log level (debug, info, warn, error) |
| `MAX_ROOM_SIZE` | 50 | Max devices per room |
| `HISTORY_RETENTION` | 7d | How long to keep update history |

### TLS Setup

For production, put the relay behind a reverse proxy (nginx, Caddy) with TLS:

```nginx
server {
    listen 443 ssl;
    server_name relay.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Connecting Clients

1. In Skelenote, go to **Settings > Sync > Relay**
2. Enter your relay URL: `wss://relay.yourdomain.com/`
3. Enable relay sync
4. Verify connection status

---

## When to Use Relay Sync vs Local sync

| Scenario | Recommendation |
|----------|----------------|
| Same building/network | **Local sync** (maximum security) |
| Different cities/countries | **Relay sync** |
| Untrusted network (hotel, conference) | **Local sync only** |
| Solo user, multiple devices at home | Either works |
| Team with remote members | **Relay sync** |
| High-security environment | Local sync + self-hosted relay |

### Using Both

You can enable both Local sync and relay sync simultaneously:

- **Local devices** sync via Local sync (faster, air-gapped)
- **Remote devices** sync via relay

Skelenote automatically uses the fastest available path.

---

## Troubleshooting

### Connection Failed

1. **Verify relay URL** is correct (must start with `ws://` or `wss://`)
2. **Check internet connectivity**
3. **Verify Skeleton Key** is configured
4. **Check firewall** allows WebSocket connections

### Not Syncing

1. **Ensure both devices use the same Skeleton Key**
2. **Check relay sync is enabled** on all devices
3. **Verify devices show as connected** in Settings
4. **Check relay status** in Settings > Sync

### Self-Hosted Relay Issues

1. **Check TLS certificate** is valid and not expired
2. **Verify firewall** allows incoming WebSocket connections
3. **Check server logs** for errors: `docker logs skelenote-relay`
4. **Test WebSocket** with a tool like `wscat`:

   ```bash
   wscat -c wss://relay.yourdomain.com/
   ```

### Sync Conflicts

Loro CRDTs handle conflicts automatically. If you see unexpected content:

1. Check both devices have synced (status shows "Synced")
2. Use Time Machine to view history and restore if needed
3. Conflicts are merged, not overwritten—no data is lost

---

## Privacy Comparison

| Aspect | Typical cloud apps | Skelenote relay sync |
|--------|------------|-------------------|
| Who can read data | Company, hackers, governments | Only you |
| Encryption | At rest (they have keys) | End-to-end (you have keys) |
| Metadata | Full access | User ID only (anonymous) |
| Subpoena response | They hand over data | Encrypted blobs (useless) |
| Self-host option | No | Yes |

---

## Further Reading

- [Security & Privacy Deep Dive](../about/security-privacy.md) — Full encryption architecture
- [Local sync Guide](local-sync-guide.md) — Local network sync
