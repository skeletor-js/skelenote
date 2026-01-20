# Typography

Skelenote uses Inter for UI and Fragment Mono for code.

---

## Font Families

```css
--font-ui: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Fragment Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

---

## Size Scale

| Token | Size | Use Case |
|-------|------|----------|
| `xs` | 11px | Metadata, timestamps, badges |
| `sm` | 12px | Body text, list items, form labels |
| `md` | 14px | Headers, emphasized text |
| `lg` | 16px | Page titles, modal headers |
| `xl` | 18px | Object detail titles |

---

## Font Weights

| Weight | Value | Use Case |
|--------|-------|----------|
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Labels, metadata, badges |
| Semibold | 600 | Headers, titles, section names |

---

## Line Heights

| Token | Value | Use Case |
|-------|-------|----------|
| `xs` | 1.25 | Compact lists |
| `sm` | 1.35 | Body text |
| `md` | 1.5 | Paragraphs |
| `lg` | 1.55 | Relaxed reading |
| `xl` | 1.65 | Large text blocks |

---

## Settings Panel Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | `xl` (18px) | 600 | Default |
| Page description | `sm` (12px) | 400 | `dimmed` |
| Section title | `md` (14px) | 600 | Default |
| Section description | `sm` (12px) | 400 | `dimmed` |
| Field label | `sm` (12px) | 500 | Default |
| Field description | `xs` (11px) | 400 | `dimmed` |

---

## Mantine Configuration

```typescript
fontSizes: {
  xs: rem(11),
  sm: rem(12),
  md: rem(14),
  lg: rem(16),
  xl: rem(18),
},

lineHeights: {
  xs: '1.25',
  sm: '1.35',
  md: '1.5',
  lg: '1.55',
  xl: '1.65',
},
```
