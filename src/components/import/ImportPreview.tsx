/**
 * Import Preview (Step 3)
 *
 * Displays parsed documents with editable type inference.
 */

import { useMemo } from 'react';
import {
  Box,
  Text,
  Table,
  Select,
  Badge,
  Group,
  ScrollArea,
  Checkbox,
  Stack,
  Button,
} from '@mantine/core';
import { TYPE_OPTIONS, type PreviewItem } from './types';
import classes from './ImportWizard.module.css';

interface ImportPreviewProps {
  items: PreviewItem[];
  onItemsChange: (items: PreviewItem[]) => void;
  onStartImport: (items: PreviewItem[]) => void;
  onBack: () => void;
}

export function ImportPreview({
  items,
  onItemsChange,
  onStartImport,
  onBack,
}: ImportPreviewProps) {
  const selectedItems = useMemo(
    () => items.filter((item) => item.selected),
    [items]
  );

  const selectedCount = selectedItems.length;
  const errorCount = useMemo(
    () => items.filter((item) => item.errors.length > 0).length,
    [items]
  );
  const warningCount = useMemo(
    () => items.filter((item) => item.warnings.length > 0).length,
    [items]
  );

  const allSelected = items.length > 0 && items.every((item) => item.selected);
  const someSelected = items.some((item) => item.selected);

  const toggleSelectAll = () => {
    const newSelected = !allSelected;
    onItemsChange(items.map((item) => ({ ...item, selected: newSelected })));
  };

  const toggleSelect = (id: string) => {
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateType = (id: string, newType: string | null) => {
    if (!newType) return;
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, inferredType: newType } : item
      )
    );
  };

  const handleStartImport = () => {
    onStartImport(selectedItems);
  };

  return (
    <Stack gap="md">
      {/* Stats bar */}
      <Box className={classes.statsBox}>
        <Group gap="md">
          <Group gap="xs">
            <Text span fw={600} size="sm">
              {items.length}
            </Text>
            <Text span size="xs" c="dimmed">
              documents found
            </Text>
          </Group>
          <Text c="dimmed" size="xs">
            |
          </Text>
          <Group gap="xs">
            <Text span fw={600} size="sm">
              {selectedCount}
            </Text>
            <Text span size="xs" c="dimmed">
              selected
            </Text>
          </Group>
          {warningCount > 0 && (
            <>
              <Text c="dimmed" size="xs">
                |
              </Text>
              <Group gap="xs">
                <Text span fw={600} size="sm" c="ochre">
                  {warningCount}
                </Text>
                <Text span size="xs" c="dimmed">
                  with warnings
                </Text>
              </Group>
            </>
          )}
          {errorCount > 0 && (
            <>
              <Text c="dimmed" size="xs">
                |
              </Text>
              <Group gap="xs">
                <Text span fw={600} size="sm" c="brick">
                  {errorCount}
                </Text>
                <Text span size="xs" c="dimmed">
                  with errors
                </Text>
              </Group>
            </>
          )}
        </Group>
      </Box>

      {/* Preview table */}
      <ScrollArea h={280} type="auto">
        <Table
          horizontalSpacing="sm"
          verticalSpacing="xs"
          highlightOnHover
          styles={{
            th: {
              fontSize: 'var(--mantine-font-size-xs)',
              fontWeight: 500,
              color: 'var(--mantine-color-gray-6)',
            },
            td: {
              fontSize: 'var(--mantine-font-size-sm)',
            },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={32}>
                <Checkbox
                  size="sm"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </Table.Th>
              <Table.Th>Title</Table.Th>
              <Table.Th w={140}>Type</Table.Th>
              <Table.Th w={80}>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Checkbox
                    size="sm"
                    checked={item.selected}
                    onChange={() => toggleSelect(item.id)}
                    aria-label={`Select ${item.title}`}
                  />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={1}>
                    {item.title}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Select
                    size="xs"
                    variant="filled"
                    value={item.inferredType}
                    onChange={(value) => updateType(item.id, value)}
                    data={TYPE_OPTIONS.map((t) => ({
                      value: t.value,
                      label: t.label,
                    }))}
                    styles={{
                      input: {
                        minHeight: 'unset',
                        height: 28,
                      },
                    }}
                  />
                </Table.Td>
                <Table.Td>
                  {item.errors.length > 0 ? (
                    <Badge color="brick" size="xs">
                      Error
                    </Badge>
                  ) : item.warnings.length > 0 ? (
                    <Badge color="ochre" size="xs">
                      Warning
                    </Badge>
                  ) : (
                    <Badge color="sage" size="xs">
                      Ready
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Group justify="space-between">
        <Button variant="subtle" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="filled"
          color="ember"
          onClick={handleStartImport}
          disabled={selectedCount === 0}
        >
          Import {selectedCount}{' '}
          {selectedCount === 1 ? 'Document' : 'Documents'}
        </Button>
      </Group>
    </Stack>
  );
}
