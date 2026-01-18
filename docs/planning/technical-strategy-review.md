# Technical Strategy Review: Performance, Persistence, and Positioning

**Date:** January 18, 2026
**Status:** DRAFT

## Executive Summary

This document outlines the analysis and recommended actions for four critical concerns regarding the Skelenote architecture and strategic positioning. These findings are based on a code review of `src/lib/loro`, `src/lib/sync`, and the core design documentation.

---

## 1. Backlink Performance

**Severity:** CRITICAL
**Location:** `src/lib/loro/relations.ts`

### The Problem

The current `findBacklinks()` implementation performs an O(N) scan of the entire object store every time it is called. Furthermore, for every object with content, it parses the JSON content string to extract mentions.

* **Small Vault (100 notes):** ~10ms (Imperceptible)
* **Large Vault (10,000 notes):** ~1000ms+ (UI Freeze)

This will cause significant main-thread blocking as the user's vault scales.

### Recommendation: Derived Index

Implement a persistent side-channel index for backlinks.

1. **Create `BacklinkIndex`:** A class that maintains a `Map<TargetID, Set<SourceID>>`.
2. **Reactive Updates:** Subscribe to Loro transactions. When a document changes:
    * Diff the changes.
    * Update only the affected entries in the Index.
3. **Persistence:** Rebuild lazily on startup or persist to IndexedDB to speed up boot time.

---

## 2. Sync Queue Persistence

**Severity:** HIGH RISK (Data Loss)
**Location:** `src/lib/sync/queue.ts`, `src/lib/sync/client.ts`

### The Problem

The `OfflineQueue` stores updates in an in-memory array (`QueuedUpdate[]`).

* **Scenario:** User makes edits while offline (e.g., on a flight).
* **Failure Mode:** If the app crashes or is quit before internet connection is restored, the queue is cleared. These edits exist locally but are **lost to the sync network** forever (or until the object is edited again, triggering a new update).

### Recommendation: IndexedDB Persistence

Persist the offline queue to disk.

1. **Storage:** Use `idb-keyval` for lightweight key-value storage.
2. **Enqueue:** `await set('sync_queue', [...queue, newUpdate])`
3. **Flush:** Read from IDB, send to socket, then clear from IDB using transaction semantics to ensure delivery.

---

## 3. BlockNote Version Pinning

**Severity:** MEDIUM (Maintenance Burden)
**Location:** `package.json` (`^0.45.0`)

### The Problem

We are using a caret version (`^`) for `@blocknote/core`. The editor ecosystem is volatile. API breaking changes or subtle behavior shifts in "minor" updates can break the editor or content parsing logic.

### Recommendation: Isolation & Pinning

1. **Strict Pinning:** Remove the caret. Pin to `0.45.0` exactly.
2. **Adapter Pattern:** Refactor `src/lib/loro/relations.ts` (specifically `extractMentionsFromContent`) to interact with an interface, not raw BlockNote JSON structure. This isolates the core domain from third-party schema changes.

---

## 4. "Campfire" (P2P) Strategy

**Severity:** STRATEGIC (UX Friction)
**Location:** `docs/design/skelenote-brand-bible.md`

### The Problem

The brand focuses heavily on "Campfire" (Local P2P) as a differentiator. While technically impressive, it solves a niche problem. Most users expect "Cloud Sync" (Relay) to be the default behavior. Over-emphasizing P2P creates friction during onboarding and sets incorrect expectations about connectivity.

### Recommendation: Repositioning

1. **UX Priority:** Elevate "Secure Cloud Sync" (Relay) to the primary onboarding flow.
2. **Campfire as Pro Feature:** Retain "Campfire" branding but frame it as a "Privacy Air-Gap" mode for sensitive work, rather than the standard way to use the app.
3. **Unified Sync:** Ensure the Cloud Relay implementation is as robust as the P2P implementation (they currently share the `SyncClient`), ensuring "it just works."

---

## Implementation Roadmap

### Phase 1: Data Integrity (Immediate)

* [ ] Add `idb-keyval` dependency.
* [ ] Refactor `OfflineQueue` to be asynchronous and backed by IndexedDB.
* [ ] Verify queue recovery after app restart.

### Phase 2: Scale (Next Sprint)

* [ ] Design `BacklinkIndex` class.
* [ ] Implement incremental indexing on Loro updates.
* [ ] Replace `RelationHelper.findBacklinks` with `BacklinkIndex.query`.

### Phase 3: Stability (Maintenance)

* [ ] Pin BlockNote versions in `package.json`.
* [ ] Create `EditorContentAdapter` interface.

### Phase 4: Strategy (Design)

* [ ] Update Onboarding copy to prioritize Cloud Sync.
* [ ] Update `brand-bible.md` to reflect the balanced positioning.
