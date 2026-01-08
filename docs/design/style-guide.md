# Skelenote Design System

A comprehensive style guide for building consistent, minimal, and warm UI components using Mantine and Lucide icons.

---

## 1. Design Philosophy

Skelenote follows a **Linear-inspired minimal aesthetic** with a warm, grounded color palette.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **High Density** | Pack information efficiently with tight gaps and minimal padding |
| **Borders Over Shadows** | Use 1px borders for separation instead of heavy shadows |
| **Hover-Reveal** | Hide secondary actions until hover to reduce visual noise |
| **Keyboard-First** | Full keyboard navigation with arrow keys, Enter, Escape |
| **Subtle Feedback** | Quick 150ms transitions for state changes |
| **Warm Palette** | Terracotta, clay, and sage tones instead of cold blues |

### What We Avoid

- Heavy drop shadows
- Rounded pill buttons (prefer subtle radius)
- Bright saturated colors
- Excessive whitespace
- Animations longer than 300ms

---

## 2. Color Palette

### Foundation Colors

Base colors for backgrounds, text, and borders.

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Canvas** | `#FAFAFA` | `250, 250, 250` | App background |
| **Paper** | `#FFFFFF` | `255, 255, 255` | Cards, modals, elevated surfaces |
| **Vellum** | `#E4E4E7` | `228, 228, 231` | Borders, dividers |
| **Carbon** | `#18181B` | `24, 24, 27` | Primary text |
| **Graphite** | `#52525B` | `82, 82, 91` | Secondary text, labels |
| **Stone** | `#A1A1AA` | `161, 161, 170` | Muted text, placeholders, icons |

### Accent Colors

Colors for actions, emphasis, and interactive elements.

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Ember** | `#B85C50` | `184, 92, 80` | Primary actions, CTAs, focus rings |
| **Clay** | `#9A8C98` | `154, 140, 152` | Tags, selected states, secondary actions |
| **Blueprint** | `#64748B` | `100, 116, 139` | Icons, metadata, tertiary elements |

### Semantic Colors

Colors that communicate meaning and state.

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Sage** | `#5E8C61` | `94, 140, 97` | Success, completed, positive actions |
| **Ochre** | `#B8860B` | `184, 134, 11` | Warning, attention, pending states |
| **Brick** | `#9B3D3D` | `155, 61, 61` | Error, danger, destructive actions |
| **Slate** | `#475569` | `71, 85, 105` | Links, navigation, info states |

### Priority Colors

Specific colors for task priority indicators (left border accents).

| Priority | Color | Hex |
|----------|-------|-----|
| Urgent/High | Brick | `#9B3D3D` |
| Medium | Ochre | `#B8860B` |
| Low | Blueprint | `#64748B` |

### Dark Mode Variants

For dark mode, invert foundation colors and boost accent luminance.

| Light Mode | Dark Mode | Notes |
|------------|-----------|-------|
| Canvas `#FAFAFA` | `#0A0A0A` | Near black background |
| Paper `#FFFFFF` | `#18181B` | Elevated surfaces |
| Vellum `#E4E4E7` | `#27272A` | Borders (zinc-800) |
| Carbon `#18181B` | `#FAFAFA` | Text becomes light |
| Graphite `#52525B` | `#A1A1AA` | Secondary text |
| Stone `#A1A1AA` | `#52525B` | Muted text |

---

## 3. Typography

### Font Families

```css
--font-ui: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Fragment Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### Size Scale

| Token | Size | Use Case |
|-------|------|----------|
| `xs` | 11px | Metadata, timestamps, badges |
| `sm` | 12px | Body text, list items, form labels |
| `md` | 14px | Headers, emphasized text |
| `lg` | 16px | Page titles, modal headers |
| `xl` | 18px | Object detail titles |

### Font Weights

| Weight | Value | Use Case |
|--------|-------|----------|
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Labels, metadata, badges |
| Semibold | 600 | Headers, titles, section names |

### Line Heights

| Token | Value | Use Case |
|-------|-------|----------|
| `xs` | 1.25 | Compact lists |
| `sm` | 1.35 | Body text |
| `md` | 1.5 | Paragraphs |
| `lg` | 1.55 | Relaxed reading |
| `xl` | 1.65 | Large text blocks |

---

## 4. Spacing & Layout

### Spacing Scale

| Token | Size | Use Case |
|-------|------|----------|
| `xs` | 4px | Tight gaps (icon + text, badge padding) |
| `sm` | 8px | List item padding, small gaps |
| `md` | 16px | Section padding, card padding |
| `lg` | 24px | Large section margins |
| `xl` | 32px | Page-level spacing |

### Layout Tokens

```css
--sidebar-width: 240px;
--sidebar-width-collapsed: 48px;
--content-max-width: 800px;
--header-height: 48px;
```

### Density Patterns

**High-density rows** (Inbox, Tasks, Search):
- Vertical padding: `xs` (4px)
- Horizontal padding: `sm` (8px)
- Gap between elements: `xs` to `sm`
- Row height: ~36-40px

**Relaxed sections** (Settings, Forms):
- Vertical padding: `md` (16px)
- Section gaps: `lg` (24px)

---

## 5. Border Radius

| Token | Size | Use Case |
|-------|------|----------|
| `xs` | 2px | Subtle rounding on inline elements |
| `sm` | 4px | **Default** - buttons, inputs, cards |
| `md` | 8px | Modals, larger cards |
| `lg` | 12px | Feature callouts |
| `xl` | 16px | Rarely used |

**Default radius**: `sm` (4px) - almost square with softened corners.

---

## 6. Shadows

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

## 7. Components

### 7.1 Buttons

**Variants:**

| Variant | Color | Use Case |
|---------|-------|----------|
| `filled` | Ember | Primary actions (Save, Create, Submit) |
| `subtle` | Gray | Secondary actions, back buttons |
| `subtle` | Brick | Destructive actions |
| `light` | Various | Toggle states, soft CTAs |

**Sizing:**
- Default size: `sm`
- Icon buttons (ActionIcon): `sm` with 14-16px icons

**Styling:**
```tsx
<Button variant="filled" color="ember">Save Changes</Button>
<Button variant="subtle">Cancel</Button>
<Button variant="subtle" color="brick">Delete</Button>
```

### 7.2 Form Elements

**Common props:**
- Size: `sm`
- Variant: `default` (outline) or `filled` (in popovers)

**TextInput:**
```tsx
<TextInput
  size="sm"
  placeholder="Enter title..."
  leftSection={<Icon name="search" size={14} />}
/>
```

**Select:**
```tsx
<Select
  size="sm"
  data={options}
  placeholder="Select type"
/>
```

**Checkbox:**
```tsx
<Checkbox
  size="sm"
  radius="sm"
  styles={{ input: { borderWidth: '1.5px' } }}
/>
```

### 7.3 List Rows

The standard pattern for Inbox, Task, and Search rows.

**Structure:**
```
[Checkbox?] [Icon] [Title + Metadata] [Tags] [Actions (hover)]
```

**Styling:**
```tsx
<UnstyledButton
  px="sm"
  py="xs"
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--mantine-spacing-sm)',
    borderRadius: 'var(--mantine-radius-sm)',
    borderBottom: '1px solid var(--mantine-color-vellum)',
    transition: 'background-color 150ms ease',
  }}
>
```

**States:**
- Hover: `background-color: var(--mantine-color-canvas)`
- Selected: `background-color: var(--mantine-color-clay-0)`
- Priority: `border-left: 3px solid {priority-color}`

**CSS Module for hover-reveal:**
```css
.listRow:hover {
  background-color: var(--mantine-color-gray-0);
}

.actions {
  opacity: 0;
  transition: opacity 150ms ease;
}

.listRow:hover .actions,
.listRow:focus-within .actions {
  opacity: 1;
}
```

### 7.4 Headers

**ViewHeader** (page-level):
```tsx
<Group justify="space-between" px="md" py="sm"
  style={{ borderBottom: '1px solid var(--mantine-color-vellum)' }}>
  <Group gap="sm">
    <Icon name="inbox" size={18} />
    <Text size="md" fw={600}>Inbox</Text>
    <Badge variant="light" color="gray" size="sm">{count}</Badge>
  </Group>
  {rightSection}
</Group>
```

**Section headers:**
```tsx
<Text size="xs" c="dimmed" fw={500} tt="uppercase" px="sm" py="xs">
  Today
</Text>
```

**Object header** (inline-editable):
- Click title to enter edit mode
- TextInput with unstyled variant, large bold text
- Save on blur or Enter, cancel on Escape

### 7.5 Badges & Tags

**Badge:**
```tsx
<Badge variant="light" color="gray" size="xs">
  {count}
</Badge>
```

**Tag (with color dot):**
```tsx
<Group gap={4} px="xs" py={2}
  style={{
    backgroundColor: 'var(--mantine-color-gray-0)',
    borderRadius: 'var(--mantine-radius-sm)',
  }}>
  <Box w={6} h={6} style={{
    borderRadius: '50%',
    backgroundColor: tagColor,
  }} />
  <Text size="xs">{tagName}</Text>
</Group>
```

**Status badges:**
| Status | Color |
|--------|-------|
| Active / Connected | Sage (green) |
| Pending / Syncing | Ochre (yellow) |
| Error / Failed | Brick (red) |
| Inactive / Disconnected | Stone (gray) |

### 7.6 Modals & Dialogs

**Base Modal:**
```tsx
<Modal
  opened={opened}
  onClose={close}
  centered
  title="Modal Title"
  overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
>
```

**Confirmation Dialog:**
```tsx
<Stack gap="md">
  <Text c="dimmed">{message}</Text>
  <Group justify="flex-end" gap="sm">
    <Button variant="subtle" onClick={onCancel}>Cancel</Button>
    <Button variant="filled" color={isDanger ? 'brick' : 'ember'} onClick={onConfirm}>
      {confirmLabel}
    </Button>
  </Group>
</Stack>
```

**Multi-state modal** (progress operations):
1. **Confirmation**: Description + requirements list
2. **Progress**: Progress bar + operation description
3. **Success/Error**: Result message + next action

### 7.7 Cards & Surfaces

**Paper/Card:**
```tsx
<Paper shadow="none" withBorder p="md" radius="sm">
  {content}
</Paper>
```

**Collapsible section:**
```tsx
<UnstyledButton onClick={toggle}>
  <Group gap="xs">
    <Icon name="chevron-right" size={14}
      style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }} />
    <Text size="sm" fw={500}>Backlinks ({count})</Text>
  </Group>
</UnstyledButton>
{isOpen && <Box ml="md">{content}</Box>}
```

### 7.8 Calendar & Timeline

**Month navigation:**
```tsx
<Group justify="center" gap="md">
  <ActionIcon variant="subtle" onClick={prevMonth}>
    <Icon name="chevron-left" size={14} />
  </ActionIcon>
  <Text fw={600} w={180} ta="center">{monthLabel}</Text>
  <ActionIcon variant="subtle" onClick={nextMonth}>
    <Icon name="chevron-right" size={14} />
  </ActionIcon>
</Group>
```

**Day cell:**
- Default: text only
- Today: accent background (Ember light)
- Has content: dot indicator below number
- Selected: darker accent background

**Timeline markers:**
- Size: 6-14px based on change density
- Color: accent or gray
- Hover: tooltip with details

### 7.9 Settings Panels

Settings panels follow a consistent structure that creates clear visual hierarchy and brand consistency.

**Panel Structure:**
```tsx
<Stack gap="lg">
  {/* Page Header */}
  <Box>
    <Text size="xl" fw={600} mb="xs">
      Page Title
    </Text>
    <Text size="sm" c="dimmed">
      Brief description of what this panel contains.
    </Text>
  </Box>

  <Divider />

  {/* Content Sections */}
  <Box>
    <Text size="md" fw={600} mb="xs">
      Section Title
    </Text>
    <Text size="sm" c="dimmed" mb="md">
      Section description or instructions.
    </Text>
    {/* Section content */}
  </Box>
</Stack>
```

**Typography Hierarchy:**

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | `xl` (18px) | 600 | Default |
| Page description | `sm` (12px) | 400 | `dimmed` |
| Section title | `md` (14px) | 600 | Default |
| Section description | `sm` (12px) | 400 | `dimmed` |
| Field label | `sm` (12px) | 500 | Default |
| Field description | `xs` (11px) | 400 | `dimmed` |

**SegmentedControl (format/theme selectors):**
```tsx
<SegmentedControl
  value={value}
  onChange={handleChange}
  radius="sm"
  fullWidth
  data={[
    {
      value: 'option1',
      label: (
        <Group gap="xs" justify="center">
          <Icon name="icon-name" size={14} />
          <Text size="sm">Label</Text>
        </Group>
      ),
    },
    // ... more options
  ]}
/>
```

Key props:

- `radius="sm"` - Matches brand's 4px corner radius
- `fullWidth` - Ensures equal-width segments regardless of label length

**Info Box (stats, status displays):**
```tsx
<Box
  style={{
    border: '1px solid var(--mantine-color-gray-2)',
    borderRadius: 'var(--mantine-radius-sm)',
    padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
    backgroundColor: 'var(--mantine-color-gray-0)',
  }}
>
  <Group gap="md" wrap="wrap">
    <Box style={{ whiteSpace: 'nowrap' }}>
      <Text span fw={600} size="sm">{value}</Text>
      <Text span size="xs" c="dimmed" ml={4}>{label}</Text>
    </Box>
    {/* Separator dot between items */}
    <Text c="dimmed" size="xs">·</Text>
    {/* More stat items... */}
  </Group>
</Box>
```

**Checkbox Options (without label heading):**
```tsx
<Stack gap="xs" mb="lg">
  <Checkbox
    label="Option description"
    checked={value}
    onChange={handler}
    size="sm"
  />
  {/* More checkboxes... */}
</Stack>
```

Note: Remove redundant "Options" labels when checkboxes are self-explanatory.

**Primary Action Button:**
```tsx
<Button
  variant="filled"
  color="ember"
  onClick={handleAction}
  disabled={isDisabled}
  loading={isLoading}
>
  Action Label
</Button>
```

Always use explicit `variant="filled"` and `color="ember"` for primary CTAs.

**Toggle Setting:**
```tsx
<Group justify="space-between">
  <Box>
    <Text size="sm" fw={500}>{label}</Text>
    <Text size="xs" c="dimmed">{description}</Text>
  </Box>
  <Switch checked={value} onChange={onChange} />
</Group>
```

**Field with Label:**
```tsx
<Box mb="md">
  <Text size="sm" fw={500} mb="xs">
    Field Label
  </Text>
  <Text size="xs" c="dimmed" mb="sm">
    Optional description or instructions.
  </Text>
  <Select
    value={value}
    onChange={handler}
    data={options}
  />
</Box>
```

**Danger Zone Pattern:**
```tsx
<Box>
  <Group gap="xs" mb="xs">
    <Icon
      name="alert-triangle"
      size={18}
      color="var(--mantine-color-brick-5)"
    />
    <Text size="xl" fw={600} c="brick">
      Danger Zone
    </Text>
  </Group>
  <Text size="sm" c="dimmed">
    Warning description.
  </Text>
</Box>

<Divider />

<Alert
  variant="light"
  color="brick"
  styles={{
    root: {
      borderLeft: '3px solid var(--mantine-color-brick-5)',
    },
  }}
>
  {/* Dangerous actions */}
</Alert>
```

---

## 8. Interactive Patterns

### Transitions

All transitions use `150ms ease` unless specified otherwise.

```css
--transition-fast: 0.1s ease;
--transition-base: 0.15s ease;
--transition-slow: 0.3s ease;
```

### Hover States

| Element | Hover Effect |
|---------|--------------|
| List rows | Background → lightest gray |
| Buttons | Slight darkening of background |
| Action icons | Background color appears |
| Links | Underline appears |

### Focus States

```css
--focus-ring-color: var(--mantine-color-ember-5);
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
```

### Selection States

| State | Visual Treatment |
|-------|------------------|
| Single selection | Light accent background (Clay-0) |
| Multi-selection | Same + checkbox visible |
| Range selection | Shift+click extends selection |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Up/Down` | Navigate lists/timeline |
| `Enter` | Confirm selection/action |
| `Escape` | Close modal/clear selection |
| `Home/End` | Jump to first/last item |
| `Cmd+A` | Select all (in context) |
| `Cmd+Shift+E` | Export to Markdown |

---

## 9. Icons

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

## 10. Mantine Theme Configuration

### Color Tuples

Add these to `src/theme/mantine.ts`:

```typescript
import { createTheme, MantineColorsTuple, rem } from '@mantine/core';

// Foundation gray (based on zinc)
const gray: MantineColorsTuple = [
  '#FAFAFA', // 0 - Canvas (lightest)
  '#F4F4F5', // 1
  '#E4E4E7', // 2 - Vellum
  '#D4D4D8', // 3
  '#A1A1AA', // 4 - Stone
  '#71717A', // 5
  '#52525B', // 6 - Graphite
  '#3F3F46', // 7
  '#27272A', // 8
  '#18181B', // 9 - Carbon (darkest)
];

// Primary accent
const ember: MantineColorsTuple = [
  '#FDF5F4', // 0
  '#F9E8E6', // 1
  '#F2CEC9', // 2
  '#E8ADA5', // 3
  '#D88A80', // 4
  '#B85C50', // 5 - Base
  '#A34D42', // 6
  '#8A3F36', // 7
  '#6E322B', // 8
  '#522520', // 9
];

// Secondary accent
const clay: MantineColorsTuple = [
  '#FAF9FA', // 0
  '#F3F1F2', // 1
  '#E6E2E4', // 2
  '#D4CDD1', // 3
  '#BDB3B8', // 4
  '#9A8C98', // 5 - Base
  '#857780', // 6
  '#6E626A', // 7
  '#574E54', // 8
  '#403A3D', // 9
];

// Tertiary / Links
const slate: MantineColorsTuple = [
  '#F8FAFC', // 0
  '#F1F5F9', // 1
  '#E2E8F0', // 2
  '#CBD5E1', // 3
  '#94A3B8', // 4
  '#64748B', // 5 - Blueprint base
  '#475569', // 6 - Slate/Link
  '#334155', // 7
  '#1E293B', // 8
  '#0F172A', // 9
];

// Success
const sage: MantineColorsTuple = [
  '#F4F9F4', // 0
  '#E6F2E7', // 1
  '#C8E1CA', // 2
  '#A3CCA6', // 3
  '#7FB583', // 4
  '#5E8C61', // 5 - Base
  '#4F7652', // 6
  '#416043', // 7
  '#334A35', // 8
  '#243427', // 9
];

// Warning
const ochre: MantineColorsTuple = [
  '#FFFBEB', // 0
  '#FEF3C7', // 1
  '#FDE68A', // 2
  '#FCD34D', // 3
  '#D4A60A', // 4
  '#B8860B', // 5 - Base
  '#9A7209', // 6
  '#7C5C07', // 7
  '#5E4606', // 8
  '#403004', // 9
];

// Error / Danger
const brick: MantineColorsTuple = [
  '#FDF5F5', // 0
  '#F9E6E6', // 1
  '#F0C7C7', // 2
  '#E3A1A1', // 3
  '#CE6F6F', // 4
  '#9B3D3D', // 5 - Base
  '#853434', // 6
  '#6E2B2B', // 7
  '#572222', // 8
  '#401919', // 9
];

export const theme = createTheme({
  // Typography
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMonospace: '"Fragment Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',

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

  // Spacing
  spacing: {
    xs: rem(4),
    sm: rem(8),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  // Border Radius
  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },
  defaultRadius: 'sm',

  // Shadows (minimal)
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.08)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },

  // Colors
  colors: {
    gray,
    ember,
    clay,
    slate,
    sage,
    ochre,
    brick,
  },
  primaryColor: 'ember',
  primaryShade: { light: 5, dark: 4 },

  // Cursor
  cursorType: 'pointer',
  focusRing: 'auto',

  // Component Defaults
  components: {
    Button: {
      defaultProps: {
        variant: 'subtle',
        size: 'sm',
      },
      styles: {
        root: { fontWeight: 500 },
      },
    },
    ActionIcon: {
      defaultProps: {
        variant: 'subtle',
        color: 'gray',
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'none',
        withBorder: true,
      },
    },
    Card: {
      defaultProps: {
        shadow: 'none',
        withBorder: true,
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.35,
          blur: 2,
        },
      },
      styles: {
        title: { fontWeight: 600 },
      },
    },
    Input: { defaultProps: { size: 'sm' } },
    TextInput: { defaultProps: { size: 'sm' } },
    NumberInput: { defaultProps: { size: 'sm' } },
    Select: { defaultProps: { size: 'sm' } },
    Menu: {
      styles: {
        dropdown: { padding: rem(4) },
        item: { fontSize: rem(13), padding: `${rem(6)} ${rem(10)}` },
      },
    },
    Badge: {
      defaultProps: { variant: 'light', size: 'xs' },
      styles: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    Checkbox: {
      defaultProps: { size: 'sm', radius: 'sm' },
      styles: {
        input: { borderWidth: '1.5px' },
      },
    },
    Tooltip: {
      defaultProps: { withArrow: true, arrowSize: 6 },
      styles: {
        tooltip: { fontSize: rem(12) },
      },
    },
  },
});
```

### CSS Custom Properties

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

  /* Layout */
  --sidebar-width: 240px;
  --sidebar-width-collapsed: 48px;
  --content-max-width: 800px;

  /* Transitions */
  --transition-fast: 0.1s ease;
  --transition-base: 0.15s ease;
  --transition-slow: 0.3s ease;

  /* Focus */
  --focus-ring-color: var(--color-ember);
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
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

---

## 11. Accessibility

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
