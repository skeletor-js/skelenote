# Semantic Search

> Local ML embeddings for conceptually similar content discovery beyond keyword matching.

---

## 1. Overview

Semantic search enhances Skelenote's existing full-text search by understanding the meaning behind queries rather than just matching keywords. Using locally-run embedding models, users can find conceptually related content even when exact terms differ.

**Opt-In Feature:**
Semantic search is an **opt-in feature** that users enable per-device. The embedding model (~23MB) is not bundled with the app—it downloads on first enable. This approach:
- Keeps the base app lightweight
- Lets users on older/lower-spec devices skip it entirely
- Allows per-device choice for users with multiple devices (e.g., enable on desktop, skip on old laptop)
- Ensures clear user consent before any ML runs on their machine

**User Value:**
- Find notes about "project deadlines" when searching for "task due dates"
- Discover related content across different terminology and phrasing
- Surface forgotten notes that are conceptually connected to current work
- Navigate large knowledge bases more intuitively

**Difference from Current Search:**
- **Full-text search (Fuse.js):** Matches character sequences with fuzzy tolerance. "meeting notes" finds "meeting", "meetings", "noting meetings"
- **Semantic search (Embeddings):** Matches concepts. "meeting notes" also finds "standup agenda", "discussion points", "call summary"

The two approaches complement each other. Semantic search excels at conceptual discovery, while full-text search is better for exact term matching and property-specific queries.

---

## 2. Goals

### Primary Goals
- Enable semantic similarity search across all object content
- Run embedding models entirely locally (no data leaves device)
- Integrate seamlessly with existing search infrastructure
- Maintain responsive UI during indexing and querying

### Success Criteria
- Semantic results returned within 200ms for typical queries
- Initial index build completes within 30 seconds for 1000 objects
- Incremental updates complete within 500ms per object
- Memory usage stays under 500MB for embedding model + index
- Users rate semantic results as "helpful" in 80%+ of searches

### Non-Goals
- Cloud-based embedding models (privacy violation)
- Real-time streaming embeddings (batch is sufficient)
- Training custom models on user data
- Replacing full-text search (complementary, not replacement)
- Multi-modal embeddings (images, audio) in v1

---

## 3. User Stories

**As a researcher**, I want to search for concepts rather than exact words so that I can find related notes even when I used different terminology when writing them.

**As a knowledge worker**, I want to find similar objects to one I'm viewing so that I can discover forgotten context and related work.

**As a power user**, I want to combine semantic and keyword search so that I can narrow results when semantic search is too broad.

**As a privacy-conscious user**, I want all AI processing to happen locally so that my notes never leave my device.

**As a user with a large vault**, I want background indexing so that I can continue working while my notes are being processed.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Search UI (Command Palette / Search Modal)                     │
│  ├── Query input                                                │
│  └── Unified results (semantic + text combined)                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Search Orchestrator                                            │
│  ├── Parallel query dispatch                                    │
│  ├── Result fusion (RRF or weighted merge)                      │
│  └── Deduplication and ranking                                  │
└────────────────┬─────────────────────────────┬──────────────────┘
                 │                             │
                 ▼                             ▼
┌────────────────────────────┐  ┌─────────────────────────────────┐
│  Full-Text Search          │  │  Semantic Search                │
│  (Existing Fuse.js)        │  │  ├── Query embedding            │
│                            │  │  ├── Vector similarity search   │
│                            │  │  └── Score normalization        │
└────────────────────────────┘  └─────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Embedding Engine                                               │
│  ├── ONNX Runtime (wasm or native via Tauri)                    │
│  ├── Model: all-MiniLM-L6-v2 (~23MB, 384 dimensions)            │
│  └── Batched inference for efficiency                           │
└─────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vector Storage                                                 │
│  ├── In-memory index (hnswlib or custom)                        │
│  ├── SQLite persistence (embeddings as BLOB)                    │
│  └── Incremental updates on object change                       │
└─────────────────────────────────────────────────────────────────┘
```

### Local Embedding Model Options

| Model | Size | Dimensions | Speed | Quality |
|-------|------|------------|-------|---------|
| all-MiniLM-L6-v2 | 23MB | 384 | Fast | Good |
| all-MiniLM-L12-v2 | 34MB | 384 | Medium | Better |
| bge-small-en | 33MB | 384 | Medium | Better |
| nomic-embed-text-v1 | 137MB | 768 | Slow | Best |

**Recommended:** `all-MiniLM-L6-v2` for initial release (balance of size, speed, quality).

**Runtime Options:**
1. **ONNX Runtime (WASM):** Runs in browser context, no native dependencies, slower
2. **ONNX Runtime (Native via Tauri):** Rust sidecar, faster inference, platform binaries
3. **WebGPU acceleration:** Future enhancement when browser support stabilizes

### Vector Storage Strategy

**Hybrid approach:**
1. **In-memory HNSW index:** Fast approximate nearest neighbor search
2. **SQLite persistence:** Store embeddings as BLOBs, load on app start

```sql
CREATE TABLE embeddings (
  object_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,        -- Float32Array as bytes
  content_hash TEXT NOT NULL,     -- Detect stale embeddings
  model_version TEXT NOT NULL,    -- Invalidate on model change
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_embeddings_updated ON embeddings(updated_at);
```

**Alternative (simpler v1):** Store embeddings in Loro document as base64 strings, rebuild HNSW index on startup. Trading storage efficiency for simpler architecture.

### Indexing Strategy

**Initial Build:**
1. Collect all objects with content
2. Extract plain text (reuse existing `extractPlainTextFromContent`)
3. Chunk long content (max 512 tokens per chunk)
4. Batch embed chunks (8-16 at a time)
5. Store embeddings with content hash
6. Build HNSW index

**Incremental Updates:**
1. On object save, compare content hash
2. If changed, queue for re-embedding
3. Process queue in background (debounced)
4. Update index incrementally

**Startup:**
1. Load embeddings from storage
2. Rebuild HNSW index (fast, <1s for 10k vectors)
3. Check for stale embeddings (content changed while app closed)
4. Queue stale objects for background re-indexing

### Query Flow

```
User types "project deadlines"
            │
            ▼
    ┌───────────────────┐
    │ Embed query text  │  (~10-20ms)
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ HNSW similarity   │  (~1-5ms)
    │ search (top 20)   │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ Parallel: Fuse.js │  (~5-10ms)
    │ full-text search  │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ Reciprocal Rank   │
    │ Fusion (RRF)      │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ Return top 10     │
    │ unified results   │
    └───────────────────┘
```

**Reciprocal Rank Fusion (RRF):**
```typescript
// Combine rankings from multiple result lists
function rrf(rankings: string[][], k = 60): Map<string, number> {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    for (let i = 0; i < ranking.length; i++) {
      const id = ranking[i];
      const current = scores.get(id) ?? 0;
      scores.set(id, current + 1 / (k + i + 1));
    }
  }
  return scores;
}
```

### Privacy Considerations

- **All local:** Embedding model runs entirely on device
- **One-time download:** Model is NOT bundled—downloaded once when user first enables the feature
- **No telemetry:** No usage data about search queries or content
- **Explicit opt-in:** User must actively choose to enable; never runs without consent
- **Per-device control:** Each device can independently enable/disable; embeddings are device-local and not synced
- **Transparent:** Clear indication that ML is running locally
- **Reversible:** Disabling deletes local model and embeddings, freeing storage

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/semantic/engine.ts` | Core embedding and similarity logic |
| `src/lib/semantic/model.ts` | ONNX model loading and inference |
| `src/lib/semantic/download.ts` | Model download manager with progress tracking |
| `src/lib/semantic/index.ts` | HNSW index wrapper |
| `src/lib/semantic/storage.ts` | Embedding persistence (SQLite or Loro) |
| `src/lib/semantic/chunker.ts` | Text chunking for long content |
| `src/lib/semantic/types.ts` | Type definitions |
| `src/lib/search/orchestrator.ts` | Combined search coordination |
| `src/lib/search/fusion.ts` | Result fusion algorithms |
| `src/components/settings/SemanticSettings.tsx` | Enable/disable and status UI |
| `src/components/settings/SemanticEnableModal.tsx` | First-enable confirmation dialog |
| `src/hooks/useSemanticSearch.ts` | React hook for semantic queries |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/search/query.ts` | Integrate with orchestrator |
| `src/lib/search/types.ts` | Add semantic result types |
| `src/hooks/useSearch.ts` | Support hybrid search mode |
| `src/components/palette/CommandPalette.tsx` | Show semantic indicators |
| `src/components/search/SearchResultItem.tsx` | Display similarity scores |
| `src/components/object/ObjectDetailView.tsx` | Add "Find similar" action |
| `src/contexts/ObjectContext.tsx` | Initialize semantic engine |

---

## 5. Implementation Steps

1. **Define types and interfaces** (`src/lib/semantic/types.ts`)
   - Embedding vector type
   - Similarity result type
   - Index configuration type
   - Storage schema
   - Download state types

2. **Implement model download manager** (`src/lib/semantic/download.ts`)
   - Check if model already exists locally
   - Download with progress events
   - Verify download integrity (checksum)
   - Handle network errors with retry logic
   - Support cancellation
   - Clean up partial downloads on failure

3. **Implement text chunking** (`src/lib/semantic/chunker.ts`)
   - Split long content into overlapping chunks
   - Preserve sentence boundaries
   - Handle edge cases (empty, very short)

4. **Create ONNX model wrapper** (`src/lib/semantic/model.ts`)
   - Model loading with progress callback
   - Text tokenization
   - Batched inference
   - Memory management

5. **Build vector index** (`src/lib/semantic/index.ts`)
   - HNSW implementation or library wrapper
   - Add/remove/update vectors
   - k-NN search with threshold

6. **Implement embedding storage** (`src/lib/semantic/storage.ts`)
   - SQLite table creation
   - CRUD operations for embeddings
   - Content hash comparison
   - Model version tracking
   - Full cleanup on disable (delete model + embeddings)

7. **Create semantic engine** (`src/lib/semantic/engine.ts`)
   - Coordinate model, index, storage
   - Background indexing with progress events
   - Query embedding and search
   - Incremental update handling

8. **Build search orchestrator** (`src/lib/search/orchestrator.ts`)
   - Parallel dispatch to Fuse.js and semantic
   - Result fusion with RRF
   - Configurable weighting

9. **Add "Find Similar" functionality**
   - Object detail view action
   - Use object's embedding as query
   - Return similar objects excluding self

10. **Create first-enable modal** (`src/components/settings/SemanticEnableModal.tsx`)
    - Confirmation dialog with requirements info
    - Download progress UI
    - Indexing progress UI
    - Error handling with retry option
    - Cancellation support

11. **Create settings UI** (`src/components/settings/SemanticSettings.tsx`)
    - Not-enabled state with "Enable" action
    - Enabled state with status info
    - Remove/disable option that cleans up storage
    - Re-index button
    - Advanced settings (weight, threshold)

12. **Update search UI components**
    - Semantic match indicators
    - Combined result display
    - Search mode toggle (optional)

13. **Integration and initialization**
    - Check semantic state on app load
    - Only initialize engine if previously enabled
    - Hook into object save for incremental updates
    - Handle edge case: model file deleted externally

---

## 6. UI/UX Considerations

### First Enable Flow

When a user enables semantic search for the first time on a device, show a confirmation modal before downloading:

```
┌─────────────────────────────────────────────────────────────────┐
│  Enable Semantic Search?                                   [x]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This will download a 23MB AI model to enable concept-based    │
│  search. All processing happens locally on this device.        │
│                                                                 │
│  What you'll get:                                               │
│  • Find related notes even with different wording               │
│  • "Find similar" suggestions on every object                   │
│  • Conceptual matches alongside keyword results                 │
│                                                                 │
│  Requirements:                                                  │
│  • One-time 23MB download                                       │
│  • ~500MB RAM when active                                       │
│  • Works offline after initial download                         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│                      [Cancel]    [Download & Enable]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

After user confirms, show download progress:

```
┌─────────────────────────────────────────────────────────────────┐
│  Setting up Semantic Search...                             [x]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Downloading AI model...                                        │
│  ████████████████░░░░░░░░░░░░░░  12.3 MB / 23 MB                │
│                                                                 │
│  This only happens once. The model will be stored locally       │
│  for offline use.                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Then transition to indexing:

```
┌─────────────────────────────────────────────────────────────────┐
│  Setting up Semantic Search...                             [x]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✓ Model downloaded                                             │
│                                                                 │
│  Building search index...                                       │
│  ████████████████░░░░░░░░░░░░░░  156 / 312 objects              │
│                                                                 │
│  [Run in Background]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Error Handling:**

```
Download failed (network error):
┌─────────────────────────────────────────────────────────────────┐
│  Download Failed                                           [x]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Couldn't download the AI model. Please check your internet     │
│  connection and try again.                                      │
│                                                                 │
│                         [Cancel]    [Retry]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Download failed (storage full):
┌─────────────────────────────────────────────────────────────────┐
│  Not Enough Storage                                        [x]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Semantic search requires ~50MB of free storage space.          │
│  Please free up some space and try again.                       │
│                                                                 │
│                                [OK]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Search Results with Semantic Matches

```
┌─────────────────────────────────────────────────────────────────┐
│  Search: [project deadlines                              ] [x]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [T] Q4 Planning Tasks                     [98% match]   │   │
│  │     "deadline for Q4 deliverables is..."               │   │
│  │     Matched: title + content                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [N] Sprint Retrospective Notes            [~semantic]   │   │
│  │     "discussed task completion timelines..."            │   │
│  │     Conceptually similar                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [M] Team Sync - Dec 15                    [~semantic]   │   │
│  │     "reviewed upcoming due dates and blockers..."       │   │
│  │     Conceptually similar                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  [Search mode: Hybrid]  Showing 3 of 12 results                │
└─────────────────────────────────────────────────────────────────┘
```

### Similarity Indicators

```
Match Types:
┌──────────────────────────────────────────────────────────────┐
│  [95%]     - Exact/fuzzy text match (high confidence)        │
│  [~]       - Semantic match (conceptually similar)           │
│  [85% ~]   - Both text and semantic match                    │
└──────────────────────────────────────────────────────────────┘

Similarity Badge Styles:
┌──────────────────────────────────────────────────────────────┐
│  High similarity (>0.8):   ████████░░  "Very similar"        │
│  Medium (0.6-0.8):         █████░░░░░  "Similar"             │
│  Low (0.4-0.6):            ███░░░░░░░  "Related"             │
└──────────────────────────────────────────────────────────────┘
```

### "Find Similar" Action on Objects

```
┌─────────────────────────────────────────────────────────────────┐
│  Meeting Notes: Product Roadmap Review                   [...]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Discussed priorities for Q1...                                 │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Related                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [N] Q1 Planning Notes              ████████░░  Very similar│ │
│  │ [T] Roadmap Tasks                  █████░░░░░  Similar     │ │
│  │ [N] Strategy Meeting - Nov         ███░░░░░░░  Related     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Context Menu:
┌─────────────────────────┐
│ Edit                    │
│ Duplicate               │
│ ─────────────────────── │
│ Find similar...     ⌘F  │
│ ─────────────────────── │
│ Delete                  │
└─────────────────────────┘
```

### Indexing Progress Indicator

```
First-time indexing (shown in status bar or modal):
┌─────────────────────────────────────────────────────────────────┐
│  Building semantic index...                                     │
│                                                                 │
│  ████████████████░░░░░░░░░░░░░░  156 / 312 objects              │
│                                                                 │
│  Estimated time remaining: ~45 seconds                          │
│                                                                 │
│  [Run in background]                                            │
└─────────────────────────────────────────────────────────────────┘

Background indicator (status bar):
┌─────────────────────────────────────────────────────────────────┐
│  [Skelenote]                              [Indexing 50%] [Sync] │
└─────────────────────────────────────────────────────────────────┘
```

### Settings Panel

**Not yet enabled (default state):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Semantic Search                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [ ] Enable semantic search                                     │
│                                                                 │
│  Find conceptually similar content, not just keyword matches.   │
│  All processing happens locally on your device.                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Requires one-time 23MB download                         │   │
│  │ Uses ~500MB RAM when active                             │   │
│  │ Works offline after setup                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Enabled state:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Semantic Search                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [x] Enable semantic search                                     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Index Status                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Indexed: 312 objects                                    │   │
│  │ Last updated: 2 minutes ago                             │   │
│  │ Model: all-MiniLM-L6-v2 (23MB)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [ Rebuild Index ]   Use if search quality degrades             │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Advanced                                                       │
│                                                                 │
│  Search weight:  [Text ━━━━━●━━━━ Semantic]                     │
│                                                                 │
│  Similarity threshold: [ 0.4 ]  (lower = more results)          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [ Remove Semantic Search ]                                     │
│  Deletes model and index, frees ~50MB storage                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Search Mode Toggle (Optional)

```
Command Palette header:
┌─────────────────────────────────────────────────────────────────┐
│  [ Hybrid ▼ ] [search query here...                         ]  │
└─────────────────────────────────────────────────────────────────┘

Dropdown options:
┌─────────────────────┐
│ ● Hybrid            │  Combined text + semantic
│ ○ Text only         │  Traditional keyword search
│ ○ Semantic only     │  Concept matching only
└─────────────────────┘
```

### Accessibility Requirements

- **Screen reader support:**
  - Announce similarity type ("semantic match" vs "text match")
  - Announce similarity score as percentage
  - "Find similar" action discoverable via rotor/shortcuts

- **Keyboard navigation:**
  - Tab through search results maintains focus
  - Arrow keys navigate result list
  - Enter activates "Find similar" when focused

- **Visual indicators:**
  - Sufficient color contrast for match type badges
  - Icons accompany color to avoid color-only differentiation
  - Similarity bars have text alternatives

- **Motion/performance:**
  - Indexing progress uses `prefers-reduced-motion`
  - Background indexing doesn't block UI
  - Graceful degradation if model fails to load

---

## 7. Testing Checklist

### Unit Tests
- [ ] Text chunker splits at sentence boundaries
- [ ] Text chunker handles empty and short content
- [ ] Text chunker produces overlapping chunks correctly
- [ ] ONNX model loads successfully
- [ ] Embedding produces correct dimensions (384)
- [ ] Embedding is deterministic for same input
- [ ] HNSW index add/remove/search work correctly
- [ ] RRF fusion produces expected rankings
- [ ] Storage saves and loads embeddings correctly
- [ ] Content hash correctly detects changes
- [ ] Download manager reports progress correctly
- [ ] Download manager verifies checksum

### Integration Tests
- [ ] Full indexing pipeline: object -> embedding -> storage
- [ ] Incremental update: modify object, embedding updates
- [ ] Delete object: embedding removed from index
- [ ] Query flow: text -> embedding -> search -> results
- [ ] Hybrid search returns both text and semantic matches
- [ ] "Find similar" returns relevant objects
- [ ] Startup: embeddings load, index rebuilds
- [ ] First-enable flow: confirmation -> download -> indexing
- [ ] Disable flow: embeddings and model deleted, storage freed
- [ ] Re-enable flow: skips download if model still exists

### Manual QA Checklist
- [ ] First-enable modal shows before any download
- [ ] Download progress displays accurately
- [ ] Indexing progress follows download completion
- [ ] Cancel during download stops and cleans up
- [ ] Cancel during indexing stops but keeps model
- [ ] Enable semantic search in settings
- [ ] Observe indexing progress indicator
- [ ] Search returns semantic matches (test with synonyms)
- [ ] Semantic results show appropriate indicators
- [ ] "Find similar" on object shows related objects
- [ ] Disable semantic search, only text results appear
- [ ] "Remove Semantic Search" frees storage
- [ ] Large vault (500+ objects) indexes within reasonable time
- [ ] Memory usage stays reasonable during indexing
- [ ] App remains responsive during background indexing
- [ ] Rebuild index button works correctly

### Edge Cases
- [ ] Object with no content (title only)
- [ ] Object with very long content (>10k words)
- [ ] Object with only code/technical content
- [ ] Empty search query
- [ ] Very short query (single word)
- [ ] Very long query (paragraph)
- [ ] Non-English content (graceful degradation)
- [ ] Concurrent object saves during indexing
- [ ] App quit during indexing (resume on restart)
- [ ] Corrupted embedding storage (recovery)
- [ ] Model file missing/corrupted (graceful error)
- [ ] Low memory device (fallback behavior)
- [ ] Network failure during download (retry works)
- [ ] Insufficient storage space (graceful error message)
- [ ] Download interrupted, app reopened (resume or restart)
- [ ] Model file deleted externally while enabled (re-download prompt)

---

## 8. Future Considerations

### Potential Enhancements

- **Auto-tagging suggestions:**
  - Analyze object content to suggest relevant tags
  - Based on similarity to existing tagged objects

- **Related content sidebar:**
  - Always-visible panel showing similar objects
  - Updates as user navigates between objects

- **Smart linking suggestions:**
  - Suggest mentions/links based on semantic similarity
  - "This note might be related to: [Object A], [Object B]"

- **Semantic clusters:**
  - Group objects by topic automatically
  - Visualize clusters in graph view

- **Query expansion:**
  - Automatically expand queries with related terms
  - "project" -> also search for "initiative", "effort"

- **Model selection:**
  - Allow users to choose larger/better models
  - Trade-off between quality and performance

- **WebGPU acceleration:**
  - Leverage GPU for faster inference
  - Significant speedup for indexing

- **Multi-modal embeddings:**
  - Embed images and audio (future)
  - Search across content types

- **Cross-lingual search:**
  - Use multilingual embedding models
  - Find English content with Spanish query

### Performance Optimizations

- **Lazy loading:**
  - Load model only when first search occurs
  - Reduce cold start time

- **Worker thread:**
  - Run embedding inference in web worker
  - Keep main thread responsive

- **Quantized models:**
  - Use int8 quantized models for faster inference
  - Smaller memory footprint

- **Caching:**
  - Cache recent query embeddings
  - Skip re-embedding for repeated searches

### Integration Opportunities

- **Graph view enhancement:**
  - Show semantic similarity as edge weights
  - Cluster visualization

- **Daily notes:**
  - "Related to yesterday" suggestions
  - Surface forgotten relevant context

- **Templates:**
  - Suggest templates based on content similarity
  - "This looks like a meeting note, use template?"
