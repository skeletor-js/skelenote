# Phase 8: Search

## Objective
Implement full-text search across all objects including titles, property values, and rich text content, with a Raycast/Spotlight-style inline results interface.

## Dependencies
- Phase 2: Object model and content storage
- Phase 3: Design system (search UI styling)
- Phase 4: BlockNote content (searchable)

## Key Deliverables
- [ ] Full-text search across object titles/names
- [ ] Search in property values (text, url, email, etc.)
- [ ] Search in BlockNote content
- [ ] Raycast-style inline dropdown results
- [ ] Result snippets with highlighted matches
- [ ] Type icons in results
- [ ] Keyboard navigation (arrow keys + Enter)
- [ ] Real-time results as user types

## Technical Notes

### Search Scope (from PRD)
- Object titles/names
- Property values (text, url, email, etc.)
- Rich text content (BlockNote documents)

### Search Implementation Options

**Option A: In-memory search**
- Load all objects into memory
- Use library like Fuse.js for fuzzy matching
- Fast for small-medium datasets
- Simple implementation

**Option B: SQLite FTS (Full-Text Search)**
- Create SQLite index alongside Loro
- Use FTS5 for fast full-text queries
- Better for large datasets
- More complex setup

**Recommended for v1**: Option A (in-memory with Fuse.js)
- Simpler to implement
- Good enough for personal use (< 10k objects)
- Can migrate to SQLite FTS later if needed

### Search Index Structure
```typescript
interface SearchableItem {
  id: string;
  typeId: string;
  title: string;           // object title/name
  properties: string;      // concatenated searchable properties
  content: string;         // plain text from BlockNote
}
```

### Extracting Searchable Text
- Title: Direct from properties
- Properties: Filter to text/url/email types, concatenate
- Content: Serialize BlockNote to plain text (strip formatting)

### Search UI (Raycast/Spotlight style)
```
┌─────────────────────────────────────────────┐
│  🔍 Search...                               │
├─────────────────────────────────────────────┤
│  📝 Meeting notes from Monday     <- hover  │
│     ...discussed the new API...             │
│  ✓  Fix login bug                           │
│     ...authentication flow broken...        │
│  📁 Q1 Planning                             │
│     ...quarterly objectives...              │
└─────────────────────────────────────────────┘
```

### Result Item
- Type icon (emoji from TypeDefinition)
- Title/name
- Snippet with highlighted match (if from content)
- Click or Enter to navigate to object

### Keyboard Navigation
| Key | Action |
|-----|--------|
| `↓` | Move selection down |
| `↑` | Move selection up |
| `Enter` | Open selected result |
| `Escape` | Close search |

### Debouncing
- Debounce search input (200-300ms)
- Show loading state during search
- Cancel pending searches on new input

## Files to Create/Modify
- `src/components/search/SearchOverlay.tsx` - Search modal/overlay
- `src/components/search/SearchInput.tsx` - Search input field
- `src/components/search/SearchResults.tsx` - Results list
- `src/components/search/SearchResultItem.tsx` - Individual result
- `src/lib/search/index.ts` - Search engine wrapper
- `src/lib/search/indexer.ts` - Build search index from objects
- `src/lib/search/query.ts` - Execute search queries
- `src/lib/search/highlight.ts` - Highlight matching text
- `src/lib/search/extract.ts` - Extract plain text from content
- `src/hooks/useSearch.ts` - Search state and results
- Update `src/components/palette/CommandPalette.tsx` - Add search action

## Acceptance Criteria
- [ ] Search finds objects by title
- [ ] Search finds objects by property values
- [ ] Search finds objects by content
- [ ] Results appear in real-time as user types
- [ ] Results show type icon and title
- [ ] Content matches show snippet with highlight
- [ ] Arrow keys navigate results
- [ ] Enter opens selected result
- [ ] Escape closes search
- [ ] Empty query shows no results (or recent items)
- [ ] No results state handled gracefully
- [ ] Search debounced to avoid excessive queries
