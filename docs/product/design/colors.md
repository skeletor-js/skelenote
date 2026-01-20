# Color Palette

Skelenote uses a warm, grounded color palette—the opposite of cold SaaS blue.

---

## Foundation Colors

Base colors for backgrounds, text, and borders.

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Canvas** | `#FAFAFA` | `250, 250, 250` | App background |
| **Paper** | `#FFFFFF` | `255, 255, 255` | Cards, modals, elevated surfaces |
| **Vellum** | `#E4E4E7` | `228, 228, 231` | Borders, dividers |
| **Carbon** | `#18181B` | `24, 24, 27` | Primary text |
| **Graphite** | `#52525B` | `82, 82, 91` | Secondary text, labels |
| **Stone** | `#A1A1AA` | `161, 161, 170` | Muted text, placeholders, icons |

---

## Accent Colors

Colors for actions, emphasis, and interactive elements.

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Ember** | `#B85C50` | `184, 92, 80` | Primary actions, CTAs, focus rings |
| **Clay** | `#9A8C98` | `154, 140, 152` | Tags, selected states, secondary actions |
| **Blueprint** | `#64748B` | `100, 116, 139` | Icons, metadata, tertiary elements |

---

## Semantic Colors

Colors that communicate meaning and state.

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Sage** | `#5E8C61` | `94, 140, 97` | Success, completed, positive actions |
| **Ochre** | `#B8860B` | `184, 134, 11` | Warning, attention, pending states |
| **Brick** | `#9B3D3D` | `155, 61, 61` | Error, danger, destructive actions |
| **Slate** | `#475569` | `71, 85, 105` | Links, navigation, info states |

---

## Priority Colors

Task priority indicators (left border accents).

| Priority | Color | Hex |
|----------|-------|-----|
| Urgent/High | Brick | `#9B3D3D` |
| Medium | Ochre | `#B8860B` |
| Low | Blueprint | `#64748B` |

---

## Status Badge Colors

| Status | Color |
|--------|-------|
| Active / Connected | Sage (green) |
| Pending / Syncing | Ochre (yellow) |
| Error / Failed | Brick (red) |
| Inactive / Disconnected | Stone (gray) |

---

## Dark Mode Variants

Invert foundation colors and boost accent luminance.

| Light Mode | Dark Mode | Notes |
|------------|-----------|-------|
| Canvas `#FAFAFA` | `#0A0A0A` | Near black background |
| Paper `#FFFFFF` | `#18181B` | Elevated surfaces |
| Vellum `#E4E4E7` | `#27272A` | Borders (zinc-800) |
| Carbon `#18181B` | `#FAFAFA` | Text becomes light |
| Graphite `#52525B` | `#A1A1AA` | Secondary text |
| Stone `#A1A1AA` | `#52525B` | Muted text |

---

## Mantine Color Tuples

Add to `src/theme/mantine.ts`:

```typescript
// Foundation gray (based on zinc)
const gray: MantineColorsTuple = [
  '#FAFAFA', // 0 - Canvas
  '#F4F4F5', // 1
  '#E4E4E7', // 2 - Vellum
  '#D4D4D8', // 3
  '#A1A1AA', // 4 - Stone
  '#71717A', // 5
  '#52525B', // 6 - Graphite
  '#3F3F46', // 7
  '#27272A', // 8
  '#18181B', // 9 - Carbon
];

// Primary accent
const ember: MantineColorsTuple = [
  '#FDF5F4', '#F9E8E6', '#F2CEC9', '#E8ADA5', '#D88A80',
  '#B85C50', // 5 - Base
  '#A34D42', '#8A3F36', '#6E322B', '#522520',
];

// Secondary accent
const clay: MantineColorsTuple = [
  '#FAF9FA', '#F3F1F2', '#E6E2E4', '#D4CDD1', '#BDB3B8',
  '#9A8C98', // 5 - Base
  '#857780', '#6E626A', '#574E54', '#403A3D',
];

// Tertiary / Links
const slate: MantineColorsTuple = [
  '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8',
  '#64748B', // 5 - Blueprint
  '#475569', // 6 - Slate/Link
  '#334155', '#1E293B', '#0F172A',
];

// Success
const sage: MantineColorsTuple = [
  '#F4F9F4', '#E6F2E7', '#C8E1CA', '#A3CCA6', '#7FB583',
  '#5E8C61', // 5 - Base
  '#4F7652', '#416043', '#334A35', '#243427',
];

// Warning
const ochre: MantineColorsTuple = [
  '#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#D4A60A',
  '#B8860B', // 5 - Base
  '#9A7209', '#7C5C07', '#5E4606', '#403004',
];

// Error / Danger
const brick: MantineColorsTuple = [
  '#FDF5F5', '#F9E6E6', '#F0C7C7', '#E3A1A1', '#CE6F6F',
  '#9B3D3D', // 5 - Base
  '#853434', '#6E2B2B', '#572222', '#401919',
];
```

---

## CSS Custom Properties

Add to `src/styles/tokens.css`:

```css
:root {
  /* Foundation */
  --color-canvas: #FAFAFA;
  --color-paper: #FFFFFF;
  --color-vellum: #E4E4E7;
  --color-carbon: #18181B;
  --color-graphite: #52525B;
  --color-stone: #A1A1AA;

  /* Accents */
  --color-ember: #B85C50;
  --color-clay: #9A8C98;
  --color-blueprint: #64748B;

  /* Semantic */
  --color-sage: #5E8C61;
  --color-ochre: #B8860B;
  --color-brick: #9B3D3D;
  --color-slate: #475569;
}

[data-mantine-color-scheme="dark"] {
  --color-canvas: #0A0A0A;
  --color-paper: #18181B;
  --color-vellum: #27272A;
  --color-carbon: #FAFAFA;
  --color-graphite: #A1A1AA;
  --color-stone: #52525B;
}
```
