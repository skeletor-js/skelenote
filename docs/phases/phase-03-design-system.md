# Phase 3: Design System & Layout

## Objective
Implement the monochromatic design system with Fragment Mono typography, color tokens, spacing scale, and core layout components including the navigation sidebar.

## Dependencies
- Phase 1: React + Vite frontend setup
- Phase 2: Object types (for sidebar sections)

## Key Deliverables
- [ ] Fragment Mono font loaded and configured
- [ ] CSS custom properties for design tokens
- [ ] Light and dark mode color palettes
- [ ] Spacing and border radius scale
- [ ] Shadow definitions for depth/elevation
- [ ] Navigation sidebar component
- [ ] Main layout shell (sidebar + content area)
- [ ] Basic interactive states (hover, focus, active)

## Technical Notes

### Typography (from PRD)
- **Primary font**: Fragment Mono
- **Fallback**: system monospace
- **Weights**: Regular (400), Medium (500), Bold (700)

Load via `@font-face` or Google Fonts. Apply globally.

### Color Tokens - Light Mode
| Token | Value | Use |
|-------|-------|-----|
| `--bg-base` | #FFFFFF | Page background |
| `--bg-raised` | #FAFAFA | Cards, modals |
| `--bg-sunken` | #F5F5F5 | Inputs, code blocks |
| `--border-subtle` | #E5E5E5 | Dividers |
| `--border-strong` | #D4D4D4 | Input borders |
| `--text-primary` | #0A0A0A | Body text |
| `--text-secondary` | #525252 | Labels, metadata |
| `--text-muted` | #A3A3A3 | Disabled, timestamps |
| `--surface-hover` | #F5F5F5 | Hover state |
| `--surface-active` | #E5E5E5 | Active state |

### Color Tokens - Dark Mode
| Token | Value | Use |
|-------|-------|-----|
| `--bg-base` | #0A0A0A | Page background |
| `--bg-raised` | #171717 | Cards, modals |
| `--bg-sunken` | #0D0D0D | Inputs, code blocks |
| `--border-subtle` | #262626 | Dividers |
| `--border-strong` | #404040 | Input borders |
| `--text-primary` | #FAFAFA | Body text |
| `--text-secondary` | #A3A3A3 | Labels, metadata |
| `--text-muted` | #525252 | Disabled, timestamps |
| `--surface-hover` | #1F1F1F | Hover state |
| `--surface-active` | #292929 | Active state |

### Tag Colors (only chromatic elements)
| Name | Light | Dark |
|------|-------|------|
| gray | #737373 | #A3A3A3 |
| red | #DC2626 | #EF4444 |
| orange | #EA580C | #F97316 |
| yellow | #CA8A04 | #EAB308 |
| green | #16A34A | #22C55E |
| blue | #2563EB | #3B82F6 |
| purple | #9333EA | #A855F7 |
| pink | #DB2777 | #EC4899 |

### Spacing Scale (4px base)
- `--space-xs`: 4px
- `--space-sm`: 8px
- `--space-md`: 16px
- `--space-lg`: 24px
- `--space-xl`: 32px
- `--space-2xl`: 48px

### Border Radius
- `--radius-sm`: 4px (buttons, inputs, tags)
- `--radius-md`: 8px (cards, dropdowns)
- `--radius-lg`: 12px (modals)

### Shadows
Light mode:
- `--shadow-sm`: `0 1px 2px rgba(0, 0, 0, 0.05)`
- `--shadow-md`: `0 4px 6px rgba(0, 0, 0, 0.07)`
- `--shadow-lg`: `0 10px 15px rgba(0, 0, 0, 0.1)`

Dark mode (adjusted):
- `--shadow-sm`: `0 1px 2px rgba(0, 0, 0, 0.3)`
- `--shadow-md`: `0 4px 6px rgba(0, 0, 0, 0.4)`
- `--shadow-lg`: `0 10px 15px rgba(0, 0, 0, 0.5)`

### Sidebar Layout (from PRD)
```
┌─────────────────────────────────────┐
│  Inbox                        (12)  │
├─────────────────────────────────────┤
│  Today                              │
│  Daily Notes                        │
├─────────────────────────────────────┤
│  TASKS                              │
│     This Week                       │
│     Overdue                         │
│     Blocked                         │
│     Eventually                      │
│     Completed                       │
├─────────────────────────────────────┤
│  PROJECTS                           │
│     [Project list]                  │
├─────────────────────────────────────┤
│  TAGS                               │
│     [Tag list with colors]          │
└─────────────────────────────────────┘
```

## Files to Create/Modify
- `src/styles/tokens.css` - CSS custom properties
- `src/styles/global.css` - Global styles, font loading
- `src/styles/reset.css` - CSS reset/normalize
- `src/components/layout/Layout.tsx` - Main layout shell
- `src/components/layout/Sidebar.tsx` - Navigation sidebar
- `src/components/layout/SidebarSection.tsx` - Collapsible section
- `src/components/layout/SidebarItem.tsx` - Navigation item
- `src/components/ui/Tag.tsx` - Tag component with colors
- `src/hooks/useTheme.ts` - Dark/light mode toggle

## Acceptance Criteria
- [ ] Fragment Mono displays correctly
- [ ] Light and dark modes switch correctly
- [ ] All color tokens applied and visually correct
- [ ] Sidebar renders with sections for Inbox, Today, Tasks, Projects, Tags
- [ ] Sidebar items show hover/active states
- [ ] Inbox shows badge with count
- [ ] Tags display with correct colors
- [ ] Layout is responsive (sidebar can collapse on narrow widths)
- [ ] Keyboard focus states visible
