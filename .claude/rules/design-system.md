# Design System Rules

**ALWAYS review the design documentation in `docs/product/design/` before making any UI or frontend changes.**

Key files: [colors.md](../../docs/product/design/colors.md), [components.md](../../docs/product/design/components.md), [mobile.md](../../docs/product/design/mobile.md)

## The Aesthetic: "Cozy Rationalism"

Skelenote combines the high-density efficiency of a code editor with the warmth of a physical notebook. We are a response to the "Cold Blue" aesthetic of Silicon Valley SaaS.

## Core Design Principles

| Principle           | Description                                              |
| ------------------- | -------------------------------------------------------- |
| **High Density**    | Pack information efficiently with tight gaps and minimal padding |
| **Borders Over Shadows** | Use 1px borders for separation instead of heavy shadows |
| **Hover-Reveal**    | Hide secondary actions until hover to reduce visual noise |
| **Keyboard-First**  | Full keyboard navigation with arrow keys, Enter, Escape  |
| **Warm Palette**    | Terracotta (Ember), sage, and clay tones instead of cold blues |

## Key Colors

- **Ember** (`#B85C50`) - Primary actions, CTAs, focus rings
- **Sage** (`#5E8C61`) - Success, completed, positive actions
- **Brick** (`#9B3D3D`) - Error, danger, destructive actions
- **Canvas** (`#FAFAFA`) - App background (soft off-white)

## What We Avoid

- Heavy drop shadows, rounded pill buttons, bright saturated colors
- Excessive whitespace, animations longer than 300ms
- Pure black text (use Carbon `#18181B` instead)

## UI Implementation

- **Mantine components** - Use Mantine for all UI (Button, Modal, Menu, etc.)
- **Lucide icons** - All icons via lucide-react, mapped in `src/lib/icons.ts`
- **No emojis** - Clean, minimal aesthetic
- **Custom theme** - See `src/theme/mantine.ts`

## Brand Lexicon

**Branded terms (keep these):**

| Use          | Avoid             |
| ------------ | ----------------- |
| Skeleton Key | Password, Key     |
| Vault        | Account, Cloud    |
| Object       | Page, Note, Task  |

**Use direct terms (not branded):**

| Use             | Avoid (over-branded)       |
| --------------- | -------------------------- |
| Local sync      | Hearth                     |
| Cloud sync      | Courier                    |
| Semantic search | Lantern                    |
| Offline mode    | Sanctuary Mode             |
| Workspace       | Digital Study, The Study   |
| Collaboration   | Campfire                   |
