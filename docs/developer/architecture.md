# Architecture Overview

This document describes Skelenote's system architecture, data flow, and key design decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Skelenote App                               │
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
| **ThemeContext** | Dark/light mode state, color scheme | `useTheme()` |
| **ToastContext** | Toast notifications, user feedback | `useToast()` |
| **SkeletonKeyContext** | Skeleton Key state, initialization, unlock | `useSkeletonKey()` |
| **ObjectContext** | CRUD operations on objects, CRDT store | `useObjects()` |
| **SyncContext** | Cloud relay WebSocket sync | `useSync()` |
| **LocalSyncContext** | P2P local network sync, QR pairing | `useLocalSync()` |
| **DeviceRegistryContext** | Device list, revocation, trust | `useDeviceRegistry()` |
| **NavigationContext** | View state, split pane, routing | `useNavigation()` |
| **SidebarContext** | Sidebar collapse/expand state | `useSidebar()` |
| **KeyboardShortcutsContext** | Global hotkey registration | `useKeyboardShortcuts()` |
| **UndoContext** | History navigation, time machine | `useUndo()` |
| **SemanticSearchContext** | Vector embeddings, similarity search | `useSemanticSearch()` |

## Repository Structure

```
skelenote/
├── .github/workflows/      # CI/CD (test, build, release)
├── src/                    # Frontend (React/TypeScript)
│   ├── components/         # React components by feature
│   │   └── mobile/         # Mobile-specific components
│   │       ├── primitives/ # Touch-optimized base components
│   │       ├── rows/       # Mobile list row components
│   │       ├── sheets/     # Bottom sheet views
│   │       ├── skeletons/  # Loading skeletons
│   │       └── views/      # Mobile view layouts
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core business logic
│   │   ├── loro/           # CRDT store, object queries, relations
│   │   ├── sync/           # P2P sync client/protocol
│   │   │   └── local/      # mDNS discovery, TCP sync
│   │   ├── crypto/         # Encryption wrapper (calls Tauri)
│   │   ├── types/          # Type definitions, built-in types
│   │   ├── search/         # Fuzzy + text search
│   │   ├── semantic/       # ML-powered semantic/vector search
│   │   ├── templates/      # Template management
│   │   ├── import/         # Notion, Obsidian, Markdown importers
│   │   ├── export/         # Export formats (MD, HTML, JSON, PDF)
│   │   ├── devices/        # Device management utilities
│   │   ├── views/          # Saved views persistence
│   │   ├── palette/        # Command palette logic
│   │   ├── notifications/  # System notifications
│   │   ├── share/          # Share handler for mobile
│   │   ├── first-run/      # First-run detection
│   │   ├── diff/           # Diff utilities for content comparison
│   │   ├── migration/      # Data migration between versions
│   │   ├── daily/          # Daily notes logic
│   │   ├── tasks/          # Task-specific utilities
│   │   ├── editor/         # BlockNote editor extensions
│   │   ├── constants/      # App constants
│   │   └── utils/          # General utilities
│   ├── theme/              # Mantine theme config
│   └── styles/             # Global CSS, design tokens
│
├── src-tauri/              # Backend (Rust/Tauri)
│   ├── src/
│   │   ├── crypto/         # BIP39, HKDF, XChaCha20, Stronghold
│   │   ├── network/        # mDNS discovery, TCP server/client
│   │   └── lib.rs          # Tauri command handlers
│   ├── gen/                # Platform-specific generated code
│   │   ├── android/        # Android project (Kotlin/Java)
│   │   ├── apple/          # iOS/macOS project (Swift)
│   │   └── schemas/        # Tauri capability schemas
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri config (window, permissions, bundling)
│
├── docs/                   # Documentation
│   ├── design/             # Brand bible, style guide, feature list
│   ├── developer/          # Architecture, API reference
│   └── user/               # User guides, getting started
│
├── vite.config.ts          # Vite build config
├── tsconfig.json           # TypeScript config
├── eslint.config.js        # ESLint rules
└── package.json            # Node dependencies, scripts
```

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

### Discovery

Skelenote supports two discovery methods:

#### mDNS (automatic, same network)

1. Device advertises `_skelenote._tcp.local.`
2. Service name includes: device ID, device name, fingerprint
3. Other devices discover via mDNS browse
4. Fingerprint (derived from user ID) enables filtering to same-vault peers

#### QR Code Pairing (cross-network, mobile-friendly)

1. One device generates a pairing code containing connection info and a one-time key
2. Code displayed as QR code or copyable text
3. Second device scans QR or enters code manually
4. Devices establish direct connection using the shared secret
5. After initial pairing, devices can sync via mDNS on the same network

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

## Mobile Architecture

Skelenote supports iOS and Android via Tauri 2.0's mobile capabilities.

### Platform Structure

```
src-tauri/gen/
├── android/                # Android project
│   ├── app/                # Main application module
│   ├── build.gradle.kts    # Gradle build config
│   └── ...
├── apple/                  # iOS/macOS project
│   ├── Skelenote.xcodeproj # Xcode project
│   ├── Skelenote/          # Swift source
│   └── ...
└── schemas/                # Tauri capability schemas
```

### Mobile Components

Mobile-specific UI components live in `src/components/mobile/`:

| Directory      | Purpose                                           |
| -------------- | ------------------------------------------------- |
| `primitives/`  | Touch-optimized base components (buttons, inputs) |
| `rows/`        | List row components for mobile lists              |
| `sheets/`      | Bottom sheet views (settings, object details)     |
| `skeletons/`   | Loading skeleton states                           |
| `views/`       | Full-screen mobile view layouts                   |

### Platform Detection

Use Tauri's platform detection to conditionally render mobile vs desktop UI:

```typescript
import { platform } from '@tauri-apps/plugin-os';

const isMobile = ['ios', 'android'].includes(await platform());
```

### Mobile-Specific Considerations

- **Touch targets**: Minimum 44x44pt for iOS, 48x48dp for Android
- **Bottom sheets**: Replace modals with swipeable bottom sheets
- **Gesture navigation**: Support swipe-back and pull-to-refresh
- **Share extension**: Handle incoming shares via `src/lib/share/`
- **Safe areas**: Account for notches, home indicators, and status bars

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

### iOS

```
{APP_SANDBOX}/Library/Application Support/
└── (same structure)
```

### Android

```
/data/data/com.skelenote.app/files/
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

### Cross-Platform from Day One

Tauri 2.0 enables a single codebase for desktop (macOS, Windows, Linux) and mobile (iOS, Android).
