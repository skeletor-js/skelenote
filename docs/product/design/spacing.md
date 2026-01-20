# Spacing & Layout

High-density design with tight gaps and minimal padding.

---

## Spacing Scale

| Token | Size | Use Case |
|-------|------|----------|
| `xs` | 4px | Tight gaps (icon + text, badge padding) |
| `sm` | 8px | List item padding, small gaps |
| `md` | 16px | Section padding, card padding |
| `lg` | 24px | Large section margins |
| `xl` | 32px | Page-level spacing |

---

## Layout Tokens

```css
--sidebar-width: 240px;
--sidebar-width-collapsed: 48px;
--content-max-width: 800px;
--header-height: 48px;
```

---

## Density Patterns

**High-density rows** (Inbox, Tasks, Search):

- Vertical padding: `xs` (4px)
- Horizontal padding: `sm` (8px)
- Gap between elements: `xs` to `sm`
- Row height: ~36-40px

**Relaxed sections** (Settings, Forms):

- Vertical padding: `md` (16px)
- Section gaps: `lg` (24px)

---

## Border Radius

| Token | Size | Use Case |
|-------|------|----------|
| `xs` | 2px | Subtle rounding on inline elements |
| `sm` | 4px | **Default** - buttons, inputs, cards |
| `md` | 8px | Modals, larger cards |
| `lg` | 12px | Feature callouts |
| `xl` | 16px | Rarely used |

**Default radius**: `sm` (4px) - almost square with softened corners.

---

## Shadows

Use shadows sparingly. Prefer borders for separation.

| Token | Value | Use Case |
|-------|-------|----------|
| `xs` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle depth |
| `sm` | `0 1px 3px rgba(0,0,0,0.06)` | Cards, dropdowns |
| `md` | `0 4px 6px rgba(0,0,0,0.07)` | Modals, popovers |
| `lg` | `0 10px 15px rgba(0,0,0,0.08)` | Floating panels |
| `xl` | `0 20px 25px rgba(0,0,0,0.10)` | Rarely used |

**Dark mode shadows**: Increase opacity by 1.5x.

---

## Mantine Configuration

```typescript
spacing: {
  xs: rem(4),
  sm: rem(8),
  md: rem(16),
  lg: rem(24),
  xl: rem(32),
},

radius: {
  xs: rem(2),
  sm: rem(4),
  md: rem(8),
  lg: rem(12),
  xl: rem(16),
},
defaultRadius: 'sm',

shadows: {
  xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.08)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
},
```
