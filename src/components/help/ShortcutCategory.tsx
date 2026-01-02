/**
 * ShortcutCategory - Category section with header and shortcut list
 */

import { Stack, Text } from '@mantine/core';
import { ShortcutRow } from './ShortcutRow';
import { CATEGORY_INFO, type Shortcut, type ShortcutCategory as CategoryType } from '@/lib/shortcuts';

interface ShortcutCategoryProps {
  category: CategoryType;
  shortcuts: Shortcut[];
}

export function ShortcutCategory({ category, shortcuts }: ShortcutCategoryProps) {
  if (shortcuts.length === 0) {
    return null;
  }

  const categoryInfo = CATEGORY_INFO[category];

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm" c="dimmed" tt="uppercase">
        {categoryInfo.label}
      </Text>
      <Stack gap={4}>
        {shortcuts.map((shortcut, index) => (
          <ShortcutRow key={`${category}-${index}`} shortcut={shortcut} />
        ))}
      </Stack>
    </Stack>
  );
}
