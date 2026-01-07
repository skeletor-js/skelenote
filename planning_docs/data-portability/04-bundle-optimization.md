# Bundle Optimization

Performance improvements to reduce main bundle size and improve initial load time.

---

## Current State

All components and libraries are eagerly imported in `main.tsx` and `App.tsx`. No code splitting or lazy loading is currently implemented.

**Known heavy imports:**
- Mantine core + dates + notifications
- BlockNote editor
- Loro CRDT library
- All views (TimeMachine, Search, Templates, etc.)

---

## Optimization Targets

### Priority 1: PDF Export Library (New)

The new `@react-pdf/renderer` dependency should never be in the main bundle.

```typescript
// src/lib/export/pdf.ts
export async function generatePDF(/* ... */): Promise<Blob> {
  const { Document, Page, Text, pdf } = await import('@react-pdf/renderer');
  // ... render PDF
}
```

**Effort**: Built into export implementation

---

### Priority 2: Route-Level Lazy Loading

Use `React.lazy()` for views that aren't needed on initial render.

| Component | Current Location | When Used |
|-----------|------------------|-----------|
| `TimeMachine` | `@/components/history` | User navigates to Time Machine |
| `HistoricalObjectView` | `@/components/history` | Time Machine split pane |
| `SearchResultsView` | `@/components/search` | User navigates to Search |
| `TemplateEditor` | `@/components/templates` | User opens template editor modal |
| `SettingsView` | `@/components/settings` | User opens Settings |
| `ArchiveView` | `@/components/views` | User navigates to Archive |

**Implementation**:

```typescript
// App.tsx - Before
import { TimeMachine, HistoricalObjectView } from '@/components/history';

// App.tsx - After
import { lazy, Suspense } from 'react';

const TimeMachine = lazy(() => 
  import('@/components/history').then(m => ({ default: m.TimeMachine }))
);
const HistoricalObjectView = lazy(() => 
  import('@/components/history').then(m => ({ default: m.HistoricalObjectView }))
);

// Usage wrapped in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <TimeMachine />
</Suspense>
```

**Effort**: 1 day

---

### Priority 3: Semantic Search Deferred Init

The `SemanticSearchProvider` loads embedding infrastructure on mount. Defer until first search.

```typescript
// Current: Loads on app start
<SemanticSearchProvider>
  <App />
</SemanticSearchProvider>

// Proposed: Lazy initialization
const { initSemanticSearch } = useSemanticSearch();

// Called only when user opens search
const handleSearchOpen = async () => {
  await initSemanticSearch(); // First call loads the model
  navigateToSearch();
};
```

**Effort**: 0.5 day

---

### Priority 4: Verify Vite Chunking

Vite should automatically chunk some dependencies. Verify current behavior:

```bash
# Add bundle analyzer
pnpm add -D rollup-plugin-visualizer

# Generate bundle report
pnpm build && open dist/stats.html
```

**Check for**:
- Is `@mantine/dates` in a separate chunk?
- Is BlockNote in a separate chunk?
- Are Loro and crypto utilities split appropriately?

**Effort**: 0.5 day (analysis only)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Convert eager imports to `React.lazy()` |
| `src/components/layout/Layout.tsx` | Add `Suspense` boundaries with loading states |
| `src/contexts/SemanticSearchContext.tsx` | Implement lazy initialization pattern |
| `vite.config.ts` | Add visualizer plugin, verify manual chunks if needed |

---

## Measurement

### Before

Run before making changes:

```bash
pnpm build
# Note the sizes in dist/assets/
```

### After

Compare total JS payload and largest chunk sizes.

**Target**: Reduce initial load JS by 30-40%

---

## Effort Summary

| Task | Effort |
|------|--------|
| PDF lazy import | (included in export work) |
| Route lazy loading | 1 day |
| Semantic search defer | 0.5 day |
| Bundle analysis | 0.5 day |
| **Total** | **2 days** |

---

## Notes

- `React.lazy()` only works with default exports, may need adapter functions
- Loading states should match Skelenote's minimal aesthetic
- Test that hot reload still works with lazy components
- Consider preloading on hover for frequently used routes
