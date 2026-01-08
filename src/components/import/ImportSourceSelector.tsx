/**
 * Import Source Selector (Step 1)
 *
 * Displays available import sources with icons and descriptions.
 */

import { SimpleGrid, UnstyledButton, Stack, Text } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import { IMPORT_SOURCES, type ImportSource } from './types';
import classes from './ImportWizard.module.css';

interface ImportSourceSelectorProps {
  value: ImportSource | null;
  onChange: (source: ImportSource) => void;
}

export function ImportSourceSelector({
  value,
  onChange,
}: ImportSourceSelectorProps) {
  return (
    <SimpleGrid cols={5} spacing="sm">
      {IMPORT_SOURCES.map((source) => (
        <UnstyledButton
          key={source.value}
          className={classes.sourceCard}
          data-selected={value === source.value || undefined}
          onClick={() => onChange(source.value)}
        >
          <Stack align="center" gap="xs" py="sm" px="xs">
            <Icon
              name={source.icon}
              size={20}
              color={
                value === source.value
                  ? 'var(--mantine-color-ember-5)'
                  : 'var(--mantine-color-gray-6)'
              }
            />
            <Text size="xs" fw={500} ta="center">
              {source.label}
            </Text>
          </Stack>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  );
}
