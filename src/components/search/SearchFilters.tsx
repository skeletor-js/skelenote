/**
 * SearchFilters - Minimal filter chips for the Search Results page
 * Match type as inline chips, object types in a collapsible popover
 */

import { useCallback } from 'react';
import { Group, UnstyledButton, Text, Button, Popover, Checkbox, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import type { MatchType } from '@/lib/search';
import type { SearchFilters as FilterState } from '@/hooks';

interface SearchFiltersProps {
  /** Current filter state */
  filters: FilterState;
  /** Update filter state */
  onFiltersChange: (filters: FilterState) => void;
  /** Whether any filters are active */
  hasActiveFilters: boolean;
  /** Clear all filters */
  onClearFilters: () => void;
  /** Whether semantic search is available */
  isSemanticAvailable: boolean;
}

const MATCH_TYPES: { value: MatchType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'semantic', label: 'AI' },
  { value: 'hybrid', label: 'Hybrid' },
];

/** Subtle filter chip - filled when active, text-only when inactive */
function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      px={10}
      py={4}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        backgroundColor: isActive ? 'var(--mantine-color-gray-1)' : 'transparent',
        color: isActive ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-5)',
        transition: 'all 150ms ease',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
    </UnstyledButton>
  );
}

export function SearchFilters({
  filters,
  onFiltersChange,
  hasActiveFilters,
  onClearFilters,
  isSemanticAvailable,
}: SearchFiltersProps) {
  const typeRegistry = useTypeRegistry();
  const [typesOpened, { toggle: toggleTypes, close: closeTypes }] = useDisclosure(false);

  // Get all available object types
  const objectTypes = Array.from(typeRegistry.getAll()).map((type) => ({
    value: type.id,
    label: type.name,
    icon: type.icon,
  }));

  // Toggle a match type filter
  const toggleMatchType = useCallback(
    (matchType: MatchType) => {
      const current = filters.matchTypes;
      const updated = current.includes(matchType)
        ? current.filter((t) => t !== matchType)
        : [...current, matchType];
      onFiltersChange({ ...filters, matchTypes: updated });
    },
    [filters, onFiltersChange]
  );

  // Toggle an object type filter
  const toggleObjectType = useCallback(
    (typeId: string) => {
      const current = filters.objectTypes;
      const updated = current.includes(typeId)
        ? current.filter((t) => t !== typeId)
        : [...current, typeId];
      onFiltersChange({ ...filters, objectTypes: updated });
    },
    [filters, onFiltersChange]
  );

  // Check if a match type is active (empty array means all are included)
  const isMatchTypeActive = (matchType: MatchType) => {
    if (filters.matchTypes.length === 0) return true;
    return filters.matchTypes.includes(matchType);
  };

  // Check if an object type is active (empty array means all are included)
  const isObjectTypeActive = (typeId: string) => {
    if (filters.objectTypes.length === 0) return true;
    return filters.objectTypes.includes(typeId);
  };

  // Count of selected types (if not all)
  const selectedTypesCount = filters.objectTypes.length;
  const hasTypeFilters = selectedTypesCount > 0;

  // Select/deselect all types
  const selectAllTypes = useCallback(() => {
    onFiltersChange({ ...filters, objectTypes: [] }); // Empty = all
  }, [filters, onFiltersChange]);

  const clearAllTypes = useCallback(() => {
    onFiltersChange({ ...filters, objectTypes: objectTypes.map((t) => t.value) });
  }, [filters, onFiltersChange, objectTypes]);

  return (
    <Group gap="xs" py="xs" wrap="wrap">
      {/* Match type filters - inline chips */}
      {MATCH_TYPES.map((type) => {
        if (!isSemanticAvailable && type.value !== 'text') {
          return null;
        }
        return (
          <FilterChip
            key={type.value}
            label={type.label}
            isActive={isMatchTypeActive(type.value)}
            onClick={() => toggleMatchType(type.value)}
          />
        );
      })}

      {/* Types dropdown - collapsible popover */}
      <Popover
        opened={typesOpened}
        onClose={closeTypes}
        position="bottom-start"
        offset={4}
        shadow="md"
      >
        <Popover.Target>
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            rightSection={<Icon name="chevron-down" size={12} />}
            onClick={toggleTypes}
            styles={{
              root: {
                fontWeight: 500,
                color: hasTypeFilters ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-5)',
                backgroundColor: hasTypeFilters ? 'var(--mantine-color-gray-1)' : 'transparent',
              },
            }}
          >
            Types{hasTypeFilters ? ` (${selectedTypesCount})` : ''}
          </Button>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <Stack gap="xs">
            {objectTypes.map((type) => (
              <Checkbox
                key={type.value}
                label={
                  <Group gap="xs" wrap="nowrap">
                    <Icon name={getIconFromEmoji(type.icon ?? 'file')} size={14} />
                    <Text size="sm">{type.label}</Text>
                  </Group>
                }
                checked={isObjectTypeActive(type.value)}
                onChange={() => toggleObjectType(type.value)}
                size="xs"
              />
            ))}
            <Group gap="xs" mt="xs">
              <Button variant="subtle" size="xs" onClick={selectAllTypes}>
                All
              </Button>
              <Button variant="subtle" size="xs" onClick={clearAllTypes}>
                None
              </Button>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      {/* Clear all filters */}
      {hasActiveFilters && (
        <UnstyledButton
          onClick={onClearFilters}
          px={8}
          py={4}
          style={{
            fontSize: 12,
            color: 'var(--mantine-color-slate-6)',
            fontWeight: 500,
          }}
        >
          Reset
        </UnstyledButton>
      )}
    </Group>
  );
}
