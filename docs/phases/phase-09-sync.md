# Phase 9: Sync Architecture

## Objective
Implement cross-device sync using Cloudflare Workers and Durable Objects as a stateful WebSocket relay, with offline support and automatic reconnection.

## Dependencies
- Phase 1: Loro CRDT integration
- Phase 2: Object storage in Loro documents
- All previous phases (sync operates on complete data model)

## Key Deliverables
- [ ] Cloudflare Worker deployment
- [ ] Durable Object for stateful relay
- [ ] WebSocket connection from Tauri app
- [ ] Loro update broadcasting
- [ ] Offline queue for pending changes
- [ ] Automatic reconnection
- [ ] Offline indicator in UI
- [ ] Device authentication

## Technical Notes

### Architecture (from PRD)
```
┌──────────┐     WebSocket     ┌─────────────────────┐     WebSocket     ┌──────────┐
│ Device A │ ←───────────────→ │ Cloudflare Durable  │ ←───────────────→ │ Device B │
│          │                   │      Object         │                   │          │
│  Loro    │                   │                     │                   │  Loro    │
│  Doc     │                   │  (stateful relay)   │                   │  Doc     │
└──────────┘                   └─────────────────────┘                   └──────────┘
```

### How It Works
1. Each device maintains full local Loro document
2. On change, device sends Loro update bytes to Durable Object
3. Durable Object broadcasts to other connected devices
4. Receiving devices apply updates via Loro merge
5. CRDT guarantees convergence—no conflict resolution needed

### Cloudflare Worker Setup
```typescript
// worker.ts
export default {
  async fetch(request, env) {
    const id = env.SYNC_ROOM.idFromName("user-room");
    const stub = env.SYNC_ROOM.get(id);
    return stub.fetch(request);
  }
}

// Durable Object
export class SyncRoom {
  sessions: WebSocket[] = [];

  async fetch(request: Request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      return this.handleWebSocket(request);
    }
    return new Response("Expected WebSocket", { status: 400 });
  }

  handleWebSocket(request: Request) {
    const pair = new WebSocketPair();
    this.sessions.push(pair[1]);
    pair[1].accept();

    pair[1].addEventListener("message", (event) => {
      // Broadcast to all other sessions
      this.broadcast(event.data, pair[1]);
    });

    pair[1].addEventListener("close", () => {
      this.sessions = this.sessions.filter(s => s !== pair[1]);
    });

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  broadcast(data: ArrayBuffer, exclude: WebSocket) {
    for (const session of this.sessions) {
      if (session !== exclude && session.readyState === WebSocket.OPEN) {
        session.send(data);
      }
    }
  }
}
```

### Client-Side Sync
```typescript
// In Tauri/React
class SyncClient {
  private ws: WebSocket | null = null;
  private pendingUpdates: Uint8Array[] = [];
  private doc: LoroDoc;

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // Send any pending updates
      this.flushPending();
    };

    this.ws.onmessage = (event) => {
      // Apply incoming Loro update
      const update = new Uint8Array(event.data);
      this.doc.import(update);
    };

    this.ws.onclose = () => {
      // Reconnect with backoff
      this.scheduleReconnect();
    };
  }

  sendUpdate(update: Uint8Array) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(update);
    } else {
      this.pendingUpdates.push(update);
    }
  }
}
```

### Offline Behavior
- App works fully offline
- Changes queue locally in `pendingUpdates`
- On reconnect, flush pending updates
- Loro CRDT handles merge automatically

### Offline Indicator
- Show status in UI (connected/disconnected)
- Could use colored dot or icon
- Show "Syncing..." during active sync
- Show "Offline" when disconnected

### Authentication
For v1, simple approach:
- Generate unique user/device ID
- Include in WebSocket URL or headers
- Durable Object room per user

Future: OAuth or API key authentication.

### Reconnection Strategy
- Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Reset backoff on successful connection
- User can manually trigger reconnect

## Files to Create/Modify
- `workers/sync-worker/src/index.ts` - Cloudflare Worker entry
- `workers/sync-worker/src/sync-room.ts` - Durable Object class
- `workers/sync-worker/wrangler.toml` - Cloudflare config
- `src/lib/sync/client.ts` - WebSocket sync client
- `src/lib/sync/queue.ts` - Offline update queue
- `src/lib/sync/connection.ts` - Connection management
- `src/hooks/useSync.ts` - Sync state hook
- `src/hooks/useConnectionStatus.ts` - Online/offline status
- `src/components/ui/SyncIndicator.tsx` - Status indicator
- Update `src/lib/loro/store.ts` - Integrate sync on changes

## Acceptance Criteria
- [ ] Cloudflare Worker deployed and accessible
- [ ] Durable Object handles WebSocket connections
- [ ] App connects to sync server on launch
- [ ] Local changes broadcast to server
- [ ] Remote changes received and merged
- [ ] Data converges across devices
- [ ] Offline changes queue locally
- [ ] Pending changes sync on reconnect
- [ ] Offline indicator shows connection status
- [ ] Automatic reconnection with backoff
- [ ] No data loss during offline/online transitions
