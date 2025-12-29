# Search Results Page

> A dedicated, full-featured search view that clearly differentiates between text, semantic, and hybrid search results.

**Status:** PLANNING

---

## 1. Overview

The Search Results Page provides a comprehensive search experience beyond the limited Command Palette. Users can see more results, apply filters, and clearly understand whether results were found via keyword matching, AI-powered semantic search, or a combination of both.

### User Value

- **Full visibility**: See all search results, not just the top 8-10 from Command Palette
- **Clear differentiation**: Understand at a glance whether a result is a text match, semantic match, or hybrid
- **Filtering power**: Filter by object type and match type to find exactly what you need
- **Seamless integration**: Access from sidebar, keyboard shortcut (Cmd+Shift+F), or by pressing Enter in Command Palette

### Privacy Benefits

- All search processing remains 100% local (text search via Fuse.js, semantic via in-browser ML model)
- No search queries sent to external servers
- Full functionality offline

---

## 2. Goals

### Primary Goals

1. Create a dedicated Search view accessible from sidebar navigation
2. Visually differentiate between text matches (keyword/fuzzy), semantic matches (AI concept), and hybrid matches
3. Allow filtering by match type and object type
4. Enable Enter key in Command Palette to open Search Results with current query

### Success Criteria

- Users can clearly identify match types via visual badges
- Search results page loads in <100ms for typical queries
- Filters apply instantly without network requests
- Keyboard-navigable results with Enter to open, Cmd+Enter for split pane

### Non-Goals (v1)

- Date range filtering (future enhancement)
- Saved searches (future enhancement)
- Search history (future enhancement)
- Advanced query syntax (AND, OR, NOT operators)

---

## 3. User Stories

| Persona | Story |
|---------|-------|
| **Power User** | "I want to search for a concept and see which results are keyword matches vs AI-discovered connections, so I can evaluate the relevance differently" |
| **Note Taker** | "I want to find all my notes about a topic, filtering to just notes (not tasks), so I can compile research" |
| **Task Manager** | "I want to search my tasks and open a result in split view while keeping the search open, so I can check multiple tasks quickly" |
| **New User** | "I want to understand why a result appeared when I searched, so I can trust and learn the search system" |

---

## 4. Technical Approach

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NavigationContext                         │
│  + ViewType: 'search'                                           │
│  + searchQuery: string | null                                   │
│  + navigateToSearch(query?: string)                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SearchResultsView                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  SearchHeader   │  │  SearchFilters   │  │ SearchResult   │ │
│  │  - input        │  │  - matchTypes[]  │  │ Card (×N)      │ │
│  │  - semantic ☑   │  │  - objectTypes[] │  │ - MatchType    │ │
│  │  - count        │  │                  │  │   Badge        │ │
│  └─────────────────┘  └──────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       useSearchResults                           │
│  - Extends useSearch with filtering                             │
│  - Higher result limit (50 vs 10)                               │
│  - Filter state management                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Existing Search Infrastructure                │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ SearchEngine │  │ SemanticEngine │  │ fuseSearchResults  │  │
│  │  (Fuse.js)   │  │ (MiniLM-L6-v2) │  │     (RRF)          │  │
│  └──────────────┘  └────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Match Type Differentiation

Each search result includes a `matchType` field:

| Match Type | Visual Treatment | Badge | Snippet |
|------------|-----------------|-------|---------|
| `text` | Yellow accent | "Text Match" | Highlighted keywords with `<mark>` |
| `semantic` | Purple accent | "~XX%" (similarity) | "Conceptually similar" (italic) |
| `hybrid` | Yellow-purple gradient | "~XX%" + "Hybrid" | Highlighted keywords + score |

### 4.3 Data Flow

```
User types query
       │
       ▼
useSearchResults hook
       │
       ├──► useSearch (base search)
       │         │
       │         ├──► Text search (Fuse.js) ──► textResults
       │         │
       │         └──► Semantic search (if enabled) ──► semanticResults
       │                      │
       │                      ▼
       │              fuseSearchResults (RRF)
       │                      │
       │                      ▼
       │              Combined results with matchType
       │
       ▼
Apply filters (matchTypes[], objectTypes[])
       │
       ▼
Filtered results to UI
```

---

## 5. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/search/SearchResultsView.tsx` | Main container component |
| `src/components/search/SearchResultsView.css` | View styles |
| `src/components/search/SearchHeader.tsx` | Search input, semantic toggle, count |
| `src/components/search/SearchFilters.tsx` | Match type + object type filters |
| `src/components/search/SearchResultCard.tsx` | Enhanced result with actions |
| `src/components/search/MatchTypeBadge.tsx` | Visual badge component |
| `src/hooks/useSearchResults.ts` | Extended search hook with filtering |

### Modified Files

| File | Changes |
|------|---------|
| `src/contexts/NavigationContext.tsx` | Add `'search'` ViewType, `searchQuery` state, `navigateToSearch()` |
| `src/App.tsx` | Add SearchResultsView to router, register Cmd+Shift+F |
| `src/components/layout/Sidebar.tsx` | Add Search navigation item |
| `src/components/palette/CommandPalette.tsx` | Enter opens Search Results page |
| `src/components/search/index.ts` | Export new components |

---

## 6. Implementation Steps

### Phase 1: Core Infrastructure

1. **Update NavigationContext**
   - Add `'search'` to ViewType union
   - Add `searchQuery: string | null` to state
   - Add `navigateToSearch(query?: string)` method

2. **Create useSearchResults hook**
   - Extend useSearch with limit: 50
   - Add filter state interface
   - Implement filter application with useMemo

### Phase 2: Components

3. **Create MatchTypeBadge**
   - Three variants: text (yellow), semantic (purple), hybrid (gradient)
   - Display similarity percentage for semantic/hybrid

4. **Create SearchResultCard**
   - Build on SearchResultItem patterns
   - Add MatchTypeBadge
   - Add action buttons (Open, Open in Split)

5. **Create SearchFilters**
   - Match type checkboxes (all checked by default)
   - Object type dropdown (from TypeRegistry)

6. **Create SearchHeader**
   - Search input with auto-focus
   - Semantic search toggle
   - Results count display

7. **Create SearchResultsView**
   - Compose Header + Filters + Results
   - Handle empty states
   - Loading state

### Phase 3: Integration

8. **Update App.tsx**
   - Add SearchResultsView to view switch
   - Register Cmd+Shift+F shortcut

9. **Update Sidebar**
   - Add Search item (🔎 icon)

10. **Update CommandPalette**
    - Enter in search mode → navigateToSearch(query)

### Phase 4: Polish

11. **Keyboard navigation**
    - Arrow keys, Enter, Cmd+Enter, Escape

12. **Testing & refinement**
    - Verify badge colors
    - Test filter combinations
    - Performance check

---

## 7. UI/UX Considerations

### 7.1 Search Results View Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Search                                                        │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [🔎] Search all notes, tasks, and more...     [☑ AI]    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Match: [☑ Text] [☑ Semantic] [☑ Hybrid]    Type: [All ▾]│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  24 results for "project planning"                             │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [📝] Q4 Planning Notes                   [~94%] [Hybrid] │  │
│  │      "...discussing **project planning** for next..."    │  │
│  │      Note  ·  Updated 2 hours ago               [▸] [⧉] │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [✓] Review project milestones               [Text Match] │  │
│  │      "...**project** milestone review and **planning**"  │  │
│  │      Task  ·  Due tomorrow                      [▸] [⧉] │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [📁] Strategic Initiatives 2024        [~89%] [Semantic] │  │
│  │      Conceptually similar                                │  │
│  │      Project  ·  Created Dec 15                 [▸] [⧉] │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                        ... more results ...                    │
└────────────────────────────────────────────────────────────────┘
```

### 7.2 Match Type Badges

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Text Match    │   │      ~87%       │   │   ~92% Hybrid   │
│    (yellow)     │   │    (purple)     │   │   (gradient)    │
└─────────────────┘   └─────────────────┘   └─────────────────┘
   keyword/fuzzy        semantic only         both combined
```

### 7.3 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+F` | Open Search Results view |
| `↑` / `↓` | Navigate results |
| `Enter` | Open selected result |
| `Cmd+Enter` | Open in split pane |
| `Escape` | Clear query / blur input |
| `/` | Focus search input |

### 7.4 Empty States

**No query entered:**
```
        🔎
  Start typing to search
  all your notes and tasks
```

**No results:**
```
        🔍
  No results found for "xyz"

  Try different keywords or
  enable semantic search for
  concept-based matching
```

**Filtered to empty:**
```
        🔍
  No results match your filters

      [Clear filters]
```

---

## 8. Testing Checklist

### Unit Tests

- [ ] `useSearchResults` correctly filters by match type
- [ ] `useSearchResults` correctly filters by object type
- [ ] `MatchTypeBadge` renders correct variant for each type
- [ ] Filter state updates correctly

### Integration Tests

- [ ] Navigation to search view preserves query
- [ ] Command Palette Enter opens search with query
- [ ] Filters apply and results update
- [ ] Split pane opens from search result

### Manual QA

- [ ] Text match results show yellow badge and highlighted snippets
- [ ] Semantic match results show purple badge with percentage
- [ ] Hybrid results show gradient badge with both indicators
- [ ] Keyboard navigation works throughout
- [ ] Responsive layout on mobile
- [ ] Dark mode styling correct

### Edge Cases

- [ ] Very long search queries
- [ ] Special characters in queries
- [ ] No semantic search enabled (text only)
- [ ] Semantic still indexing (show indicator)
- [ ] 100+ results (performance)
- [ ] Rapid query changes (debouncing)

---

## 9. Future Considerations

### Enhancements

- **Date range filtering**: Filter results by created/updated date
- **Sort options**: Sort by relevance, date, title
- **Saved searches**: Save frequently used queries
- **Search history**: Quick access to recent searches
- **Advanced syntax**: Support AND, OR, NOT, quotes for exact match

### Performance

- **Virtual scrolling**: For 100+ results
- **Pagination**: Load more button instead of all results
- **Result caching**: Cache results for repeated queries

### UX Improvements

- **Search suggestions**: Auto-complete from existing content
- **Recent searches**: Dropdown of recent queries
- **Search scope**: Limit search to current project/folder
