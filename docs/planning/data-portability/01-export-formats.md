# Export Formats

Enhanced export capabilities for Skelenote objects.

---

## Current State

Existing export (`src/lib/export/`) provides:
- Single object to Markdown
- Bulk export to ZIP (Markdown with YAML frontmatter)

---

## New Formats

### PDF Export

**Specification**:
- Styled PDF with Skelenote typography
- Respects light/dark mode preference
- Includes metadata header block
- Proper handling of code blocks, lists, tables

**Technology**: `@react-pdf/renderer` (client-side generation)

```typescript
// src/lib/export/pdf.ts
import { Document, Page, Text, View } from '@react-pdf/renderer';

export async function generatePDF(
  object: SkelenoteObject,
  content: BlockNoteBlock[],
  options: { theme: 'light' | 'dark' }
): Promise<Blob> {
  // Render BlockNote content to React PDF components
}
```

**Effort**: 3-4 days

---

### HTML Export

**Specification**:
- Standalone HTML file with embedded CSS
- No external dependencies
- Identical rendering to PDF
- Includes metadata in `<meta>` tags
- Users can host this themselves or attach to email

```typescript
// src/lib/export/html.ts
export function generateHTML(
  object: SkelenoteObject,
  content: string,
  resolveObjectName: (id: string) => string | undefined
): string {
  // Convert BlockNote to HTML with embedded styles
}
```

**Effort**: 1 day

---

### JSON Export (Full Fidelity)

**Specification**:
- Complete object data including all properties
- BlockNote content in original JSON format
- Type definitions included
- Relations preserved as IDs
- Suitable for backup/restore

```typescript
interface SkelenoteExportJSON {
  version: '1.0';
  exportedAt: string;
  objects: Array<{
    object: SkelenoteObject;
    content: BlockNoteBlock[] | null;
  }>;
  types: TypeDefinition[];
}
```

**Effort**: 0.5 day

---

### Plain Text Export

**Specification**:
- Simple text fallback
- No formatting, just content
- Mentions rendered as `@Name`

**Effort**: 0.5 day

---

## Handling @Mentions

| Format | Mention Rendering |
|--------|-------------------|
| Markdown | `[[Object Name]]` wiki-links |
| PDF/HTML | Styled chips (non-clickable) |
| JSON | Preserve original IDs |
| Plain Text | `@Object Name` |

---

## Export UI

**Entry Points**:
- Document menu > "Export as..."
- Right-click context menu
- Keyboard: `Cmd+Shift+E`

**Modal Flow**:
1. Format selector (radio buttons with descriptions)
2. Format-specific options (conditional)
3. Preview toggle (optional)
4. Export button triggers native file picker

**Batch Export**:
- When multiple documents selected
- "Merge into single file" toggle
- Creates ZIP if not merged

---

## Dependencies

```json
{
  "@react-pdf/renderer": "^3.x"
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/export/index.ts` | Add new format exports |
| `src/lib/export/pdf.ts` | New file |
| `src/lib/export/html.ts` | New file |
| `src/lib/export/json.ts` | New file |
| `src/lib/export/plaintext.ts` | New file |

---

## Resolved Decisions

### 1. Images: Base64 Embedding ✓

**Decision**: Embed images as base64 data URIs in all export formats.

**Implementation**:
- BlockNote stores images as file paths or data URLs
- During export, convert all image references to data URIs
- Use `<img src="data:image/png;base64,..." />` format for HTML/PDF
- Markdown: Use inline HTML data URIs (no external file references)

```typescript
// src/lib/export/images.ts
export async function resolveImageToDataUri(src: string): Promise<string> {
  if (src.startsWith('data:')) return src; // Already embedded
  
  // Read from filesystem (Tauri) and convert to base64
  const bytes = await invoke<number[]>('read_file_bytes', { path: src });
  const base64 = btoa(String.fromCharCode(...bytes));
  const mimeType = getMimeType(src);
  return `data:${mimeType};base64,${base64}`;
}
```

**Rationale**: Self-contained exports that work anywhere without broken image links.

---

### 2. PDF Library: @react-pdf/renderer ✓

**Decision**: Use `@react-pdf/renderer` with validation in Tauri WebView.

**Validation Task**: Before implementation, run a minimal PDF generation test:

```typescript
// Test file: src/lib/export/pdf-test.ts
import { Document, Page, Text, pdf } from '@react-pdf/renderer';

export async function testPdfGeneration(): Promise<Blob> {
  const TestDoc = () => (
    <Document>
      <Page><Text>Test</Text></Page>
    </Document>
  );
  return await pdf(<TestDoc />).toBlob();
}
```

**Concerns to validate**:
- Font loading in Tauri WebView (may need bundled fonts)
- Memory usage for large documents
- Image embedding performance

**Fallback**: If @react-pdf/renderer fails, consider `jspdf` + `html2canvas` approach.

---

### 3. Bundle Optimization: Lazy Loading ✓

**Decision**: Lazy-load the PDF library and audit main bundle for other optimization opportunities.

**PDF Lazy Loading**:
```typescript
// src/lib/export/pdf.ts
export async function generatePDF(/* ... */): Promise<Blob> {
  // Dynamic import - only loads when user exports to PDF
  const { Document, Page, Text, pdf } = await import('@react-pdf/renderer');
  // ... render PDF
}
```

**Bundle Audit Candidates** (identified for review):
| Module | Current State | Recommendation |
|--------|---------------|----------------|
| `@react-pdf/renderer` | New | Lazy-load via dynamic import |
| `TimeMachine` | Eagerly imported | Lazy-load route |
| `TemplateEditor` | Eagerly imported | Lazy-load modal |
| `SearchResultsView` | Eagerly imported | Lazy-load route |
| `@mantine/dates` | Eagerly imported | Already chunked? Verify |
| Semantic search | Imports in SemanticSearchProvider | Defer until first use |

**Implementation**:
1. Use `React.lazy()` for route-level components
2. Use dynamic `import()` for utility libraries
3. Measure with `vite-plugin-visualizer` before/after

---

## Effort Summary

| Component | Effort |
|-----------|--------|
| PDF export | 3-4 days |
| HTML export | 1 day |
| JSON export | 0.5 day |
| Plain text export | 0.5 day |
| Export menu UI updates | 1 day |
| **Total** | **6-7 days** |
