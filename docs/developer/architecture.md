# Architecture Overview

This document describes Skelenote's system architecture, data flow, and key design decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Skelenote Desktop App                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React Frontend (TypeScript)               │   │
│  │  ┌─────────────────────────────────────────────────────────┐│   │
│  │  │               React Context Providers                    ││   │
│  │  │  ObjectContext │ NavigationContext │ SyncContext │ ...  ││   │
│  │  └─────────────────────────────────────────────────────────┘│   │
│  │  ┌─────────────────────────────────────────────────────────┐│   │
│  │  │                    Core Libraries                        ││   │
│  │  │  LoroDocStore │ ObjectStore │ SyncClient │ CryptoWrapper ││   │
│  │  └─────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │ invoke()                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Tauri Backend (Rust)                        │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │   │
│  │  │   Crypto     │ │   Network    │ │   Device Management  │ │   │
│  │  │  (XChaCha20) │ │ (mDNS + TCP) │ │    (Ed25519 Sigs)    │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
            ┌───────────────┐              ┌───────────────┐
            │   Local Disk   │              │  Local Network │
            │ (Loro + Keys)  │              │  (P2P Peers)   │
            └───────────────┘              └───────────────┘
```

## React Context Hierarchy

Contexts provide shared state and operations across the app:

```
App
├── ThemeContext (MantineProvider)
│   └── ToastContext (notifications)
│       └── SkeletonKeyContext (encryption key state)
│           └── ObjectContext (CRDT data store)
│               └── SyncContext (cloud relay)
│                   └── LocalSyncContext (P2P sync)
│                       └── DeviceRegistryContext (device management)
│                           └── NavigationContext (routing/views)
│                               └── SidebarContext (sidebar state)
│                                   └── KeyboardShortcutsContext (hotkeys)
│                                       └── UndoContext (history)
│                                           └── SemanticSearchContext (vector search)
```

### Context Responsibilities

| Context | Purpose | Key Hook |
|---------|---------|----------|
| **ObjectContext** | CRUD operations on objects, CRDT store | `useObjects()` |
| **NavigationContext** | View state, split pane, routing | `useNavigation()` |
| **SkeletonKeyContext** | Skeleton Key state, init status | `useSkeletonKey()` |
| **SyncContext** | Cloud relay WebSocket sync | `useSync()` |
| **LocalSyncContext** | P2P local network sync | `useLocalSync()` |
| **DeviceRegistryContext** | Device list, revocation | `useDeviceRegistry()` |
| **KeyboardShortcutsContext** | Global hotkey registration | `useKeyboardShortcuts()` |
| **UndoContext** | History navigation, time machine | `useUndo()` |
| **SemanticSearchContext** | Vector embeddings, similarity search | `useSemanticSearch()` |
| **SidebarContext** | Sidebar collapse state | `useSidebar()` |
| **ThemeContext** | Dark mode state | `useTheme()` |
| **ToastContext** | Toast notifications | `useToast()` |

## Data Model

### SkelenoteObject

Everything in Skelenote is a typed object:

```typescript
interface SkelenoteObject {
  id: string;                              // UUID
  typeId: string;                          // References TypeDefinition
  properties: Record<string, PropertyValue>;
  hasContent: boolean;                     // Has rich text body
  inboxed: boolean;                        // In inbox until triaged
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### Built-in Types

Defined in `src/lib/types/built-in-types.ts`:

- **Task** - With status, due date, priority
- **Note** - General purpose notes
- **Project** - Container for tasks/notes
- **Area** - Long-term responsibility area (PARA)
- **Link** - Web bookmarks
- **Meeting** - Calendar events
- **Tag** - Labels for categorization
- **Person** - Contact references
- **Template** - Reusable object templates

### Object Relations

Objects can link to each other via the `relation` property type:

```typescript
// Parent-child relationships (e.g., Task in Project)
properties: {
  project: { type: 'relation', value: 'project-id-123' }
}

// Many-to-many (e.g., Tags)
properties: {
  tags: { type: 'relation[]', value: ['tag-1', 'tag-2'] }
}
```

## Data Flow

### Object CRUD Flow

```
User Action (UI)
     │
     ▼
React Component
     │ calls
     ▼
useObjects() hook
     │ calls
     ▼
ObjectStore methods
     │ modifies
     ▼
LoroDocStore (CRDT)
     │
     ├── Updates Loro Map (objects)
     ├── Updates Loro Text (content)
     └── Triggers onChange callback
            │
            ▼
      refreshData()
            │
            ├── Increments dataVersion (triggers re-render)
            └── Schedules debounced save
                   │
                   ▼
            docStore.save()
                   │
                   ├── Writes to disk (store.loro)
                   └── Broadcasts to sync (if connected)
```

### Sync Flow

```
Local Change
     │
     ▼
LoroDocStore.sync()
     │
     ├─── Cloud Relay ───────────────────────────────┐
     │    SyncContext                                 │
     │         │                                      │
     │         ▼                                      │
     │    WebSocket to relay server                   │
     │         │                                      │
     │         ▼                                      │
     │    Server broadcasts to all                    │
     │    devices in room                             │
     │                                                │
     └─── Local P2P ─────────────────────────────────┤
          LocalSyncContext                            │
               │                                      │
               ▼                                      │
          Tauri network_broadcast_sync               │
               │                                      │
               ▼                                      │
          TCP to all connected peers                 │
               │                                      │
               ▼                                      │
          Peers receive via local-sync-message event │
                                                      │
                                                      ▼
                                              Remote Device
                                                      │
                                                      ▼
                                              LoroDoc.import()
                                                      │
                                                      ▼
                                              CRDT auto-merges
                                                      │
                                                      ▼
                                              UI updates via
                                              dataVersion change
```

## CRDT Strategy

Skelenote uses [Loro](https://loro.dev/) for conflict-free sync:

### Why Loro?

- **Automatic merge** - No manual conflict resolution
- **History built-in** - Time travel via versioning
- **Efficient sync** - Only transmits deltas
- **Rich types** - Map, List, Text, Tree

### Document Structure

```
LoroDoc
├── LoroMap: "objects"
│   └── Object ID → Serialized SkelenoteObject
├── LoroMap: "types"
│   └── Type ID → Serialized TypeDefinition
└── LoroText: "content:{objectId}"
    └── BlockNote JSON blocks
```

### Conflict Resolution

Loro uses CRDT semantics:
- **Last-writer-wins** for primitive properties
- **List operations** merge by causal order
- **Text operations** use collaborative editing algorithm

## Encryption Architecture

### Key Hierarchy

```
Skeleton Key (24-word BIP39 mnemonic)
         │
         ▼
   Master Key (512-bit seed)
         │
         ├─── HKDF ─── Sync Key (256-bit)
         │              Used for XChaCha20-Poly1305 encryption
         │
         ├─── HKDF ─── Signing Key (Ed25519)
         │              Used for device revocation signatures
         │
         └─── SHA256 ─── User ID (hex string)
                         Used for sync room identification
```

### Data at Rest

- **Loro document** - Not encrypted on disk (local-first philosophy)
- **Master key** - Stored in Stronghold (OS keychain)
- **Device ID** - Persisted in Stronghold

### Data in Transit

All sync data is encrypted with XChaCha20-Poly1305:
1. Frontend calls `crypto_encrypt` with Loro update bytes
2. Encrypted bytes sent to relay/peers
3. Receiver calls `crypto_decrypt` to get Loro updates
4. Loro imports the decrypted updates

## P2P Networking

### Discovery (mDNS)

1. Device advertises `_skelenote._tcp.local.`
2. Service name includes: device ID, device name, fingerprint
3. Other devices discover via mDNS browse
4. Fingerprint (derived from user ID) enables filtering to same-vault peers

### Connection

1. TCP connection to discovered peer
2. Handshake exchanges device info + fingerprint
3. Fingerprint mismatch = different vault = reject
4. Connected peers exchange Loro updates bidirectionally

### Device Revocation

1. Revoking device signs revocation with Ed25519
2. Signature + metadata broadcast to all peers
3. Revoked device added to local blocklist
4. Blocklist persisted to disk and checked on:
   - mDNS discovery (filter out)
   - TCP handshake (reject)
   - Connection attempt (refuse)

## File System Layout

### macOS

```
~/Library/Application Support/com.skelenote.app/
├── data/
│   ├── store.loro          # Main CRDT document
│   ├── devices.loro        # Device registry
│   ├── blocklist.json      # Revoked devices
│   └── semantic/           # Vector search index
└── stronghold/
    └── vault.stronghold    # Encrypted secrets
```

### Windows

```
%APPDATA%\com.skelenote.app\
└── (same structure)
```

### Linux

```
~/.local/share/com.skelenote.app/
└── (same structure)
```

## Key Design Decisions

### Local-First

All data lives on the user's device. Sync is optional and additive.

### Zero-Knowledge Encryption

The relay server never sees plaintext. Only devices with the Skeleton Key can decrypt.

### CRDT for Collaboration

Loro CRDTs enable offline-first with automatic conflict resolution.

### Rust for Security

Cryptographic operations in Rust via Tauri for memory safety and performance.

### PARA by Default

Built-in structure (Projects, Areas, Resources, Archive) with flexibility to customize.
