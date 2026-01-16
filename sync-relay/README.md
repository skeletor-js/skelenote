# Skelenote Sync Relay - Self-Hosted

A self-hosted sync relay server for Skelenote, providing protocol-compatible functionality with the Cloudflare Worker. Run your own sync infrastructure for privacy, compliance, or air-gapped deployments.

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
cd sync-relay
docker-compose up -d
```

Your relay is now running at `ws://localhost:8787/sync/:userId`

### Option 2: Docker Run

```bash
# Build the image
docker build -t skelenote-sync-relay .

# Run with persistent data
docker run -d \
  --name skelenote-sync-relay \
  -p 8787:8787 \
  -v $(pwd)/data:/data \
  skelenote-sync-relay
```

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Or build and run production
npm run build
npm start
```

## Connecting Skelenote

In Skelenote settings, configure the sync server URL:

| Deployment | URL |
|------------|-----|
| Local | `ws://localhost:8787` |
| LAN | `ws://192.168.x.x:8787` |
| Remote (with HTTPS proxy) | `wss://sync.yourdomain.com` |

> **Note:** For production deployments, we recommend placing the relay behind a reverse proxy (nginx, Caddy) with TLS termination.

## Configuration

Configure via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8787` | HTTP/WebSocket server port |
| `DATA_DIR` | `./data` | Directory for SQLite database files |
| `ROOM_IDLE_TIMEOUT` | `300000` | Milliseconds before cleaning up empty rooms (5 min) |

### docker-compose.yml Example

```yaml
services:
  sync-relay:
    image: skelenote-sync-relay:latest
    ports:
      - "8787:8787"
    volumes:
      - /path/to/persistent/data:/data
    environment:
      - PORT=8787
      - ROOM_IDLE_TIMEOUT=600000  # 10 minutes
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (returns "OK") |
| `/status` | GET | JSON with room/connection counts |
| `/sync/:userId` | WS | WebSocket sync endpoint |
| `/sync/:userId/reset` | DELETE | Clear all data for a user (admin) |

## Data Storage

Each user gets their own SQLite database file:

```
data/
├── user_abc123.db
├── user_def456.db
└── ...
```

**What's stored:**

- Encrypted CRDT updates (the relay never sees plaintext data)
- Device registry updates
- Device revocation records

**Backup:** Simply copy the `data/` directory.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Skelenote Sync Relay               │
├─────────────────────────────────────────────────┤
│  HTTP Server (health, status, reset)            │
│  WebSocket Server (sync protocol)               │
├─────────────┬───────────────────────────────────┤
│  SyncRoom   │  SyncRoom   │  SyncRoom   │  ...  │
│  (user A)   │  (user B)   │  (user C)   │       │
├─────────────┴───────────────────────────────────┤
│  SQLite Storage (one DB per user)               │
└─────────────────────────────────────────────────┘
```

## Comparison: Self-Hosted vs Cloudflare Worker

| Aspect | Cloudflare Worker | Self-Hosted Docker |
|--------|-------------------|-------------------|
| **Scaling** | Automatic edge | Manual (single instance) |
| **Location** | Global CDN | Your infrastructure |
| **Persistence** | Durable Objects | SQLite on volume |
| **Cost** | Pay-per-use | Self-hosted infra |
| **Privacy** | Zero-knowledge* | Full control |
| **Latency** | Optimal (edge) | Depends on location |

*Both options are zero-knowledge: the relay never decrypts your data.

## Production Deployment

### With nginx (TLS termination)

```nginx
server {
    listen 443 ssl http2;
    server_name sync.yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;  # 24 hours for WebSocket
    }
}
```

### With Caddy (automatic TLS)

```
sync.yourdomain.com {
    reverse_proxy localhost:8787
}
```

## Security Considerations

1. **Zero-Knowledge**: All sync data is encrypted client-side. The relay only sees ciphertext.

2. **Authentication**: The relay uses userId as a room identifier. Consider:
   - Using the deterministic User ID derived from the Skeleton Key
   - Adding a reverse proxy with authentication for admin endpoints

3. **Network**: Always use TLS (wss://) in production.

4. **Container**: Runs as non-root user `skelenote` (UID 1001).

## Troubleshooting

### Check if the server is running

```bash
curl http://localhost:8787/health
# Should return: OK
```

### View server status

```bash
curl http://localhost:8787/status
# Returns: {"rooms":2,"connections":5}
```

### View logs

```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f skelenote-sync-relay

# Local
# Logs go to stdout
```

### Reset a user's data

```bash
curl -X DELETE http://localhost:8787/sync/USER_ID/reset
```

## Development

```bash
# Install dependencies
npm install

# Run with hot reload
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## License

Same license as Skelenote main project.
