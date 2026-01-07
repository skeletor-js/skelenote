---
name: component
description: Generate a new React component with Mantine styling
---

# Component Generation Skill

Generates a React component following Skelenote patterns with Mantine UI.

## Information Needed

1. **Component name** (PascalCase, e.g., `TaskCard`, `FilterDropdown`)
2. **Location** (which directory in `src/components/`)
3. **Props** with types
4. **Mantine components** to use (Button, Modal, Menu, etc.)
5. **Include test file?** (yes/no)

## Generated Files

### Component File

`src/components/{category}/{ComponentName}.tsx`:

```typescript
import { FC } from 'react';
import { Box, Text } from '@mantine/core';
import styles from './ComponentName.module.css';

export interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onAction?: () => void;
}

export const ComponentName: FC<ComponentNameProps> = ({
  prop1,
  prop2,
  onAction,
}) => {
  return (
    <Box className={styles.container}>
      <Text>{prop1}</Text>
    </Box>
  );
};
```

### CSS Module (if needed)

`src/components/{category}/{ComponentName}.module.css`:

```css
.container {
  /* Use design system tokens */
  padding: var(--mantine-spacing-md);
  border: 1px solid var(--mantine-color-dark-4);
  border-radius: var(--mantine-radius-sm);
}
```

### Test File (optional)

`src/components/{category}/{ComponentName}.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName prop1="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

## Example: TaskPriorityBadge

### User provides:
- Name: TaskPriorityBadge
- Location: tasks
- Props: priority (urgent | high | medium | low | none)
- Mantine: Badge
- Include tests: yes

### Generated:

```typescript
// src/components/tasks/TaskPriorityBadge.tsx
import { FC } from 'react';
import { Badge, MantineColor } from '@mantine/core';

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface TaskPriorityBadgeProps {
  priority: Priority;
}

const priorityConfig: Record<Priority, { label: string; color: MantineColor }> = {
  urgent: { label: 'Urgent', color: 'red' },
  high: { label: 'High', color: 'orange' },
  medium: { label: 'Medium', color: 'yellow' },
  low: { label: 'Low', color: 'blue' },
  none: { label: 'None', color: 'gray' },
};

export const TaskPriorityBadge: FC<TaskPriorityBadgeProps> = ({ priority }) => {
  const config = priorityConfig[priority];
  
  return (
    <Badge color={config.color} variant="light" size="sm">
      {config.label}
    </Badge>
  );
};
```

## Steps

1. Ask user for component details
2. Determine appropriate directory in `src/components/`
3. Read existing component patterns from that directory
4. Generate component with:
   - TypeScript interface for props
   - Mantine imports as needed
   - CSS module if custom styling needed
5. Generate test file if requested
6. Add export to index file if one exists

## Style Guide Reference

Before generating, review `docs/design/style-guide.md` for:
- Color tokens (Ember, Sage, Brick, etc.)
- Spacing conventions (tight padding)
- Border usage (1px borders, not shadows)
- Typography scale

## Component Patterns

### With Mantine Theme
```typescript
import { useMantineTheme } from '@mantine/core';
const theme = useMantineTheme();
```

### With Navigation Context
```typescript
import { useNavigation } from '@/contexts';
const { navigateTo } = useNavigation();
```

### With Object Context
```typescript
import { useObjects } from '@/contexts';
const { store, refreshData } = useObjects();
```

## Notes

- Use path alias `@/` for imports from `src/`
- Prefer Mantine components over custom HTML
- Use CSS modules for custom styles, not inline styles
- Export from index.ts if the directory has one
- Follow hover-reveal pattern for secondary actions
