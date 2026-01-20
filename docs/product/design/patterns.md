# Interaction Patterns

Transitions, states, keyboard navigation, icons, and accessibility.

---

## Transitions

All transitions use `150ms ease` unless specified otherwise.

```css
--transition-fast: 0.1s ease;
--transition-base: 0.15s ease;
--transition-slow: 0.3s ease;
```

---

## Hover States

| Element | Hover Effect |
|---------|--------------|
| List rows | Background → lightest gray |
| Buttons | Slight darkening of background |
| Action icons | Background color appears |
| Links | Underline appears |

---

## Focus States

```css
--focus-ring-color: var(--mantine-color-ember-5);
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
```

---

## Selection States

| State | Visual Treatment |
|-------|------------------|
| Single selection | Light accent background (Clay-0) |
| Multi-selection | Same + checkbox visible |
| Range selection | Shift+click extends selection |

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Up/Down` | Navigate lists/timeline |
| `Enter` | Confirm selection/action |
| `Escape` | Close modal/clear selection |
| `Home/End` | Jump to first/last item |
| `Cmd+A` | Select all (in context) |
| `Cmd+Shift+E` | Export to Markdown |

---

## Icons

### Library

Use **Lucide React** for all icons.

```tsx
import { Icon } from '@/components/ui/Icon';

<Icon name="inbox" size={16} />
```

### Size Conventions

| Context | Size |
|---------|------|
| Action icons (in rows) | 14px |
| List item icons | 16px |
| Header icons | 18px |
| Empty state icons | 24-32px |

### Color Usage

| Context | Color |
|---------|-------|
| Default | Stone (`#A1A1AA`) or `gray-6` |
| Active/Selected | Ember or current accent |
| Semantic | Corresponding semantic color |
| In dark backgrounds | Paper (`#FFFFFF`) |

### Emoji Conversion

Type icons from emoji are converted via `getIconFromEmoji()`:

- Finds closest Lucide icon match
- Falls back to `file` icon

---

## Accessibility

### Color Contrast

All text/background combinations meet WCAG AA standards:

- Carbon on Canvas: 16.7:1
- Graphite on Canvas: 7.3:1
- Stone on Canvas: 3.5:1 (large text only)

### Focus Management

- All interactive elements have visible focus rings
- Modals trap focus within
- Escape key closes modals/menus
- Skip links for main content

### ARIA Labels

- All icon buttons have `aria-label`
- Live regions for dynamic content (`aria-live="polite"`)
- Proper heading hierarchy
- Form labels associated with inputs

---

## Quick Reference

### Common Patterns

```tsx
// Primary button
<Button color="ember">Save</Button>

// Secondary button
<Button variant="subtle">Cancel</Button>

// Danger button
<Button variant="subtle" color="brick">Delete</Button>

// Icon button
<ActionIcon variant="subtle" color="gray">
  <Icon name="settings" size={14} />
</ActionIcon>

// Badge
<Badge variant="light" color="gray" size="xs">{count}</Badge>

// Status indicator
<Badge color="sage" size="xs">Active</Badge>
<Badge color="ochre" size="xs">Pending</Badge>
<Badge color="brick" size="xs">Error</Badge>

// List row hover-reveal
className={classes.listRow}
// with CSS: .listRow:hover .actions { opacity: 1; }
```

### Color Variables in Components

```tsx
// Border color
borderBottom: '1px solid var(--mantine-color-gray-2)'

// Text colors
c="dimmed" // Stone
c="gray.6" // Graphite

// Background on hover
backgroundColor: 'var(--mantine-color-gray-0)'

// Selection background
backgroundColor: 'var(--mantine-color-clay-0)'

// Priority border
borderLeft: '3px solid var(--mantine-color-brick-5)'
```
