/**
 * SavedViewEditor - Modal for creating and editing saved views
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  TextInput,
  Select,
  NumberInput,
  Button,
  ActionIcon,
  Menu,
  Stack,
  Group,
  Text,
  Box,
  SimpleGrid,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { useTypeRegistry } from '@/contexts';
import { useSavedViews } from '@/hooks';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
} from '@/lib/types';
import type { FilterCondition, FilterOperator, SortConfig } from '@/lib/loro';
import {
  type FieldInfo,
  ALL_OPERATORS,
  BUILT_IN_FIELDS,
  TEXT_OPERATORS,
  RECURRENCE_OPTIONS,
  getOperatorsForType,
} from '@/lib/views';

const COMMON_ICONS = [
  '📋',
  '📁',
  '⭐',
  '🔖',
  '📝',
  '✅',
  '🎯',
  '📌',
  '🔍',
  '📊',
  '🗂️',
  '💡',
];

/** Props for the FilterValueInput component */
interface FilterValueInputProps {
  field: FieldInfo;
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
}

/** Renders appropriate input based on field type */
function FilterValueInput({ field, value, onChange }: FilterValueInputProps) {
  const stringValue = String(value ?? '');

  // Date input
  if (field.type === 'date') {
    const dateValue =
      value && typeof value === 'number'
        ? dayjs(value).format('YYYY-MM-DD')
        : typeof value === 'string' && value
          ? value
          : null;

    return (
      <DatePickerInput
        size="xs"
        placeholder="Select date"
        value={dateValue}
        onChange={(newValue) => {
          if (newValue) {
            onChange(dayjs(newValue, 'YYYY-MM-DD').valueOf());
          } else {
            onChange(null);
          }
        }}
        style={{ flex: 1 }}
      />
    );
  }

  // Boolean/checkbox input
  if (field.type === 'checkbox' || field.type === 'boolean') {
    return (
      <Select
        size="xs"
        placeholder="Select..."
        data={[
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]}
        value={stringValue || null}
        onChange={(val) => onChange(val === 'true')}
        style={{ flex: 1 }}
      />
    );
  }

  // Select with options
  if (field.type === 'select' && field.options) {
    return (
      <Select
        size="xs"
        placeholder="Select..."
        data={field.options.map((opt) => ({ value: opt, label: opt }))}
        value={stringValue || null}
        onChange={(val) => onChange(val)}
        style={{ flex: 1 }}
      />
    );
  }

  // Recurrence
  if (field.type === 'recurrence') {
    return (
      <Select
        size="xs"
        placeholder="Select..."
        data={RECURRENCE_OPTIONS.map((opt) => ({
          value: opt,
          label: opt.charAt(0).toUpperCase() + opt.slice(1),
        }))}
        value={stringValue || null}
        onChange={(val) => onChange(val)}
        style={{ flex: 1 }}
      />
    );
  }

  // Number input
  if (field.type === 'number') {
    return (
      <NumberInput
        size="xs"
        placeholder="Value"
        value={typeof value === 'number' ? value : ''}
        onChange={(val) => onChange(typeof val === 'number' ? val : null)}
        style={{ flex: 1 }}
      />
    );
  }

  // Default: text input
  return (
    <TextInput
      size="xs"
      placeholder="Value"
      value={stringValue}
      onChange={(e) => onChange(e.target.value)}
      style={{ flex: 1 }}
    />
  );
}

interface SavedViewEditorProps {
  /** Existing view to edit (null for create mode) */
  view?: SavedView | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback after successful save */
  onSave?: (view: SavedView) => void;
}

export function SavedViewEditor({
  view,
  isOpen,
  onClose,
  onSave,
}: SavedViewEditorProps) {
  const typeRegistry = useTypeRegistry();
  const { createView, updateView } = useSavedViews();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!view;

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📋');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get available types
  const availableTypes = typeRegistry.getAll();

  // Type select data
  const typeSelectData = useMemo(
    () => [
      { value: '', label: 'All Types' },
      ...availableTypes.map((type) => ({
        value: type.id,
        label: type.name,
      })),
    ],
    [availableTypes]
  );

  // Get fields for the selected type, including options for select types
  const fields = useMemo((): FieldInfo[] => {
    const result: FieldInfo[] = [...BUILT_IN_FIELDS];

    if (typeFilter) {
      const typeDef = typeRegistry.get(typeFilter);
      if (typeDef) {
        typeDef.schema.forEach((prop) => {
          if (!prop.hidden) {
            result.push({
              id: prop.id,
              name: prop.name,
              type: prop.type,
              options: prop.config?.options,
            });
          }
        });
      }
    } else {
      // When no type filter, show common fields from all types
      availableTypes.forEach((typeDef) => {
        typeDef.schema.forEach((prop) => {
          if (!prop.hidden && !result.find((f) => f.id === prop.id)) {
            result.push({
              id: prop.id,
              name: prop.name,
              type: prop.type,
              options: prop.config?.options,
            });
          }
        });
      });
    }

    return result;
  }, [typeFilter, typeRegistry, availableTypes]);

  // Field select data
  const fieldSelectData = useMemo(
    () => fields.map((f) => ({ value: f.id, label: f.name })),
    [fields]
  );

  // Sort field select data (includes "No sorting" option)
  const sortFieldSelectData = useMemo(
    () => [
      { value: '', label: 'No sorting' },
      ...fields.map((f) => ({ value: f.id, label: f.name })),
    ],
    [fields]
  );

  // Get field info by id
  const getFieldById = useCallback(
    (fieldId: string): FieldInfo | undefined => {
      return fields.find((f) => f.id === fieldId);
    },
    [fields]
  );

  // Initialize form when view changes
  useEffect(() => {
    if (isOpen) {
      if (view) {
        setName(view.name);
        setIcon(view.icon || '📋');
        setTypeFilter(view.typeFilter || null);
        setFilters(view.filters || []);
        setSortField(view.sort?.field || '');
        setSortDirection(view.sort?.direction || 'desc');
      } else {
        setName('');
        setIcon('📋');
        setTypeFilter(null);
        setFilters([]);
        setSortField('');
        setSortDirection('desc');
      }
    }
  }, [view, isOpen]);

  // Focus name input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Add a new filter
  const handleAddFilter = useCallback(() => {
    const defaultField = fields[0]?.id || 'title';
    const fieldInfo = fields[0];
    const operators = fieldInfo
      ? getOperatorsForType(fieldInfo.type)
      : TEXT_OPERATORS;
    setFilters((prev) => [
      ...prev,
      {
        field: defaultField,
        operator: operators[0] as FilterOperator,
        value: '',
      },
    ]);
  }, [fields]);

  // Update a filter
  const handleUpdateFilter = useCallback(
    (index: number, updates: Partial<FilterCondition>) => {
      setFilters((prev) =>
        prev.map((filter, i) =>
          i === index ? { ...filter, ...updates } : filter
        )
      );
    },
    []
  );

  // Remove a filter
  const handleRemoveFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    const sort: SortConfig | undefined = sortField
      ? { field: sortField, direction: sortDirection }
      : undefined;

    if (isEditMode && view) {
      const updates: UpdateSavedViewInput = {
        name: name.trim(),
        icon,
        typeFilter,
        filters,
        sort,
      };
      const updated = updateView(view.id, updates);
      if (updated) {
        onSave?.(updated);
        onClose();
      }
    } else {
      const input: CreateSavedViewInput = {
        name: name.trim(),
        icon,
        typeFilter,
        filters,
        sort,
      };
      const created = createView(input);
      if (created) {
        onSave?.(created);
        onClose();
      }
    }
  }, [
    name,
    icon,
    typeFilter,
    filters,
    sortField,
    sortDirection,
    isEditMode,
    view,
    createView,
    updateView,
    onSave,
    onClose,
  ]);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit View' : 'Create Saved View'}
      centered
      size="lg"
    >
      <ScrollArea.Autosize mah="70vh">
        <Stack gap="md" pr="xs">
          {/* Name and Icon */}
          <Group gap="sm">
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="light" size="lg" aria-label="Choose icon">
                  <Icon name={getIconFromEmoji(icon)} size={20} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <SimpleGrid cols={6} spacing={4} p="xs">
                  {COMMON_ICONS.map((emoji) => (
                    <ActionIcon
                      key={emoji}
                      variant={icon === emoji ? 'filled' : 'subtle'}
                      size="lg"
                      onClick={() => setIcon(emoji)}
                    >
                      <Icon name={getIconFromEmoji(emoji)} size={18} />
                    </ActionIcon>
                  ))}
                </SimpleGrid>
              </Menu.Dropdown>
            </Menu>
            <TextInput
              ref={nameInputRef}
              placeholder="View name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1 }}
            />
          </Group>

          {/* Type Filter */}
          <Select
            label="Filter by Type"
            data={typeSelectData}
            value={typeFilter || ''}
            onChange={(val) => setTypeFilter(val || null)}
          />

          <Divider />

          {/* Filters */}
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Filters
            </Text>
            <Stack gap="xs">
              {filters.map((filter, index) => {
                const fieldInfo = getFieldById(filter.field) || fields[0];
                const availableOperators = fieldInfo
                  ? getOperatorsForType(fieldInfo.type)
                  : TEXT_OPERATORS;

                const operatorSelectData = ALL_OPERATORS.filter((op) =>
                  availableOperators.includes(op.value)
                ).map((op) => ({ value: op.value, label: op.label }));

                return (
                  <Group key={index} gap="xs" wrap="nowrap">
                    <Select
                      size="xs"
                      data={fieldSelectData}
                      value={filter.field}
                      onChange={(val) => {
                        if (!val) return;
                        const newFieldInfo = getFieldById(val);
                        const newOperators = newFieldInfo
                          ? getOperatorsForType(newFieldInfo.type)
                          : TEXT_OPERATORS;
                        const newOperator = newOperators.includes(
                          filter.operator
                        )
                          ? filter.operator
                          : newOperators[0];
                        handleUpdateFilter(index, {
                          field: val,
                          operator: newOperator,
                          value: '',
                        });
                      }}
                      style={{ flex: 1 }}
                    />
                    <Select
                      size="xs"
                      data={operatorSelectData}
                      value={filter.operator}
                      onChange={(val) => {
                        if (val) {
                          handleUpdateFilter(index, {
                            operator: val as FilterOperator,
                          });
                        }
                      }}
                      style={{ width: 120 }}
                    />
                    {filter.operator !== 'isNull' &&
                      filter.operator !== 'isNotNull' &&
                      fieldInfo && (
                        <FilterValueInput
                          field={fieldInfo}
                          value={
                            filter.value as string | number | boolean | null
                          }
                          onChange={(value) =>
                            handleUpdateFilter(index, { value })
                          }
                        />
                      )}
                    <ActionIcon
                      variant="subtle"
                      color="brick"
                      size="sm"
                      onClick={() => handleRemoveFilter(index)}
                      aria-label="Remove filter"
                    >
                      <Icon name="x" size={14} />
                    </ActionIcon>
                  </Group>
                );
              })}
              <Button
                variant="subtle"
                size="xs"
                leftSection={<Icon name="plus" size={14} />}
                onClick={handleAddFilter}
              >
                Add Filter
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Sort */}
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Sort By
            </Text>
            <Group gap="sm">
              <Select
                data={sortFieldSelectData}
                value={sortField}
                onChange={(val) => setSortField(val || '')}
                style={{ flex: 1 }}
              />
              {sortField && (
                <Select
                  data={[
                    { value: 'asc', label: 'Ascending' },
                    { value: 'desc', label: 'Descending' },
                  ]}
                  value={sortDirection}
                  onChange={(val) =>
                    setSortDirection((val as 'asc' | 'desc') || 'desc')
                  }
                  style={{ width: 140 }}
                />
              )}
            </Group>
          </Box>
        </Stack>
      </ScrollArea.Autosize>

      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="subtle" color="gray" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="filled"
          color="ember"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {isEditMode ? 'Save Changes' : 'Create View'}
        </Button>
      </Group>
    </Modal>
  );
}
