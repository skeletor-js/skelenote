# Components

UI component patterns using Mantine.

---

## Buttons

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

```tsx
<Button variant="filled" color="ember">Save Changes</Button>
<Button variant="subtle">Cancel</Button>
<Button variant="subtle" color="brick">Delete</Button>
```

---

## Form Elements

**Common props:**

- Size: `sm`
- Variant: `default` (outline) or `filled` (in popovers)

```tsx
<TextInput
  size="sm"
  placeholder="Enter title..."
  leftSection={<Icon name="search" size={14} />}
/>

<Select size="sm" data={options} placeholder="Select type" />

<Checkbox
  size="sm"
  radius="sm"
  styles={{ input: { borderWidth: '1.5px' } }}
/>
```

---

## List Rows

Standard pattern for Inbox, Task, and Search rows.

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

---

## Headers

**ViewHeader (page-level):**

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

**Object header (inline-editable):**

- Click title to enter edit mode
- TextInput with unstyled variant, large bold text
- Save on blur or Enter, cancel on Escape

---

## Badges & Tags

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

---

## Modals & Dialogs

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

---

## Cards & Surfaces

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

---

## Calendar & Timeline

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

---

## Settings Panels

**Panel Structure:**

```tsx
<Stack gap="lg">
  {/* Page Header */}
  <Box>
    <Text size="xl" fw={600} mb="xs">Page Title</Text>
    <Text size="sm" c="dimmed">Brief description.</Text>
  </Box>

  <Divider />

  {/* Content Sections */}
  <Box>
    <Text size="md" fw={600} mb="xs">Section Title</Text>
    <Text size="sm" c="dimmed" mb="md">Section description.</Text>
    {/* Section content */}
  </Box>
</Stack>
```

**SegmentedControl:**

```tsx
<SegmentedControl
  value={value}
  onChange={handleChange}
  radius="sm"
  fullWidth
  data={[
    { value: 'opt1', label: <Group gap="xs"><Icon /><Text>Label</Text></Group> },
  ]}
/>
```

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

**Danger Zone:**

```tsx
<Box>
  <Group gap="xs" mb="xs">
    <Icon name="alert-triangle" size={18} color="var(--mantine-color-brick-5)" />
    <Text size="xl" fw={600} c="brick">Danger Zone</Text>
  </Group>
  <Text size="sm" c="dimmed">Warning description.</Text>
</Box>

<Divider />

<Alert
  variant="light"
  color="brick"
  styles={{ root: { borderLeft: '3px solid var(--mantine-color-brick-5)' } }}
>
  {/* Dangerous actions */}
</Alert>
```

---

## Mantine Component Defaults

```typescript
components: {
  Button: {
    defaultProps: { variant: 'subtle', size: 'sm' },
    styles: { root: { fontWeight: 500 } },
  },
  ActionIcon: {
    defaultProps: { variant: 'subtle', color: 'gray' },
  },
  Paper: {
    defaultProps: { shadow: 'none', withBorder: true },
  },
  Modal: {
    defaultProps: {
      centered: true,
      overlayProps: { backgroundOpacity: 0.35, blur: 2 },
    },
    styles: { title: { fontWeight: 600 } },
  },
  Input: { defaultProps: { size: 'sm' } },
  Badge: {
    defaultProps: { variant: 'light', size: 'xs' },
    styles: { root: { textTransform: 'none', fontWeight: 500 } },
  },
  Checkbox: {
    defaultProps: { size: 'sm', radius: 'sm' },
    styles: { input: { borderWidth: '1.5px' } },
  },
  Tooltip: {
    defaultProps: { withArrow: true, arrowSize: 6 },
    styles: { tooltip: { fontSize: rem(12) } },
  },
}
```
