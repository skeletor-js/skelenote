/**
 * Notion Property Mapper Component
 *
 * Displays and allows editing of property mappings from Notion to Skelenote.
 * Shows auto-inferred mappings with the ability to override.
 */

import {
  Stack,
  Text,
  Select,
  Group,
  Badge,
  Paper,
  ScrollArea,
  Collapse,
  UnstyledButton,
} from '@mantine/core';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { PropertyMapping } from '@/lib/import/notion-properties';
import { getMappableProperties } from '@/lib/import/notion-properties';

interface NotionPropertyMapperProps {
  /** Target Skelenote type ID */
  targetTypeId: string;
  /** Current property mappings */
  mappings: PropertyMapping[];
  /** Callback when mappings change */
  onMappingsChange: (mappings: PropertyMapping[]) => void;
}

export function NotionPropertyMapper({
  targetTypeId,
  mappings,
  onMappingsChange,
}: NotionPropertyMapperProps) {
  const [expanded, setExpanded] = useState(false);

  // Get available target properties for this type
  const targetProps = getMappableProperties(targetTypeId);

  // Build dropdown options
  const targetOptions = [
    { value: 'skip', label: 'Skip' },
    ...targetProps.map((prop) => ({
      value: prop.id,
      label: prop.name,
    })),
  ];

  // Count mapped vs skipped
  const mappedCount = mappings.filter(
    (m) => m.skelenoteProperty !== 'skip'
  ).length;
  const autoCount = mappings.filter((m) => m.confidence === 'auto').length;

  const handleMappingChange = (
    notionProperty: string,
    newTarget: string | null
  ) => {
    if (!newTarget) return;

    const updated = mappings.map((m) => {
      if (m.notionProperty === notionProperty) {
        return {
          ...m,
          skelenoteProperty: newTarget as string | 'skip',
          confidence: 'manual' as const,
          reason: newTarget === 'skip' ? 'Manually skipped' : 'Manually mapped',
        };
      }
      return m;
    });

    onMappingsChange(updated);
  };

  return (
    <Stack gap="xs">
      <UnstyledButton onClick={() => setExpanded(!expanded)}>
        <Group gap="xs">
          <Icon
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={12}
            color="var(--mantine-color-gray-5)"
          />
          <Text size="xs" c="dimmed">
            Property mapping ({mappedCount}/{mappings.length} mapped
            {autoCount > 0 && `, ${autoCount} auto-detected`})
          </Text>
        </Group>
      </UnstyledButton>

      <Collapse in={expanded}>
        <Paper p="xs" withBorder>
          <ScrollArea.Autosize mah={200}>
            <Stack gap={4}>
              {mappings.map((mapping) => (
                <PropertyMappingRow
                  key={mapping.notionProperty}
                  mapping={mapping}
                  options={targetOptions}
                  onChange={(value) =>
                    handleMappingChange(mapping.notionProperty, value)
                  }
                />
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Paper>
      </Collapse>
    </Stack>
  );
}

interface PropertyMappingRowProps {
  mapping: PropertyMapping;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
}

function PropertyMappingRow({
  mapping,
  options,
  onChange,
}: PropertyMappingRowProps) {
  const isSkipped = mapping.skelenoteProperty === 'skip';

  return (
    <Group gap="xs" wrap="nowrap" justify="space-between">
      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" truncate style={{ minWidth: 80, maxWidth: 120 }}>
          {mapping.notionProperty}
        </Text>
        <Badge size="xs" variant="light" color="gray">
          {mapping.notionType}
        </Badge>
      </Group>

      <Icon name="arrow-right" size={10} color="var(--mantine-color-gray-4)" />

      <Group gap="xs" wrap="nowrap">
        <Select
          size="xs"
          value={mapping.skelenoteProperty}
          onChange={onChange}
          data={options}
          w={100}
          comboboxProps={{ withinPortal: true }}
          styles={{
            input: {
              color: isSkipped ? 'var(--mantine-color-gray-5)' : undefined,
              fontStyle: isSkipped ? 'italic' : undefined,
            },
          }}
        />
        {mapping.confidence === 'auto' && (
          <Badge size="xs" variant="dot" color="sage">
            auto
          </Badge>
        )}
      </Group>
    </Group>
  );
}

/**
 * Compact summary of property mappings for display
 */
export function PropertyMappingSummary({
  mappings,
}: {
  mappings: PropertyMapping[];
}) {
  const mapped = mappings.filter((m) => m.skelenoteProperty !== 'skip');
  const auto = mappings.filter((m) => m.confidence === 'auto');

  if (mapped.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No properties mapped
      </Text>
    );
  }

  return (
    <Text size="xs" c="dimmed">
      {mapped.length} propert{mapped.length === 1 ? 'y' : 'ies'} mapped
      {auto.length > 0 && ` (${auto.length} auto)`}
    </Text>
  );
}
