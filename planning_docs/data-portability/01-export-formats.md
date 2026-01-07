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

## Open Questions

- [ ] **Images**: How to handle images in BlockNote content? Embed as base64?
- [ ] **PDF library**: Confirm @react-pdf/renderer works in Tauri WebView
- [ ] **Bundle size**: Lazy-load PDF library to avoid bloating main bundle?

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
