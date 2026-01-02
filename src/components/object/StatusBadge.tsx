/**
 * StatusBadge - Prominent colored badge for status and priority properties
 * Uses Mantine Badge with light variant for visual prominence
 */

import { useState, useMemo } from 'react';
import { Popover, Badge, Select, Box, Text } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { PropertyDefinition, PropertyValue } from '@/lib/types';
import type { IconName } from '@/lib/icons';

interface StatusBadgeProps {
  definition: PropertyDefinition;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
}

/**
 * Format select option labels from kebab-case to Title Case
 */
function formatOptionLabel(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get color for status values
 */
function getStatusColor(value: PropertyValue): string {
  if (!value) return 'gray';

  switch (value) {
    case 'done':
    case 'completed':
      return 'sage';
    case 'in-progress':
    case 'active':
      return 'slate';
    case 'blocked':
      return 'brick';
    case 'on-hold':
    case 'waiting':
      return 'ochre';
    case 'todo':
    default:
      return 'gray';
  }
}

/**
 * Get color for priority values
 */
function getPriorityColor(value: PropertyValue): string {
  if (!value) return 'gray';

  switch (value) {
    case 'urgent':
      return 'brick';
    case 'high':
      return 'ochre';
    case 'medium':
      return 'clay';
    case 'low':
    default:
      return 'gray';
  }
}

/**
 * Get icon for status
 */
function getStatusIcon(value: PropertyValue): IconName {
  switch (value) {
    case 'done':
    case 'completed':
      return 'check-circle';
    case 'in-progress':
    case 'active':
      return 'loader';
    case 'blocked':
      return 'ban';
    case 'on-hold':
    case 'waiting':
      return 'clock';
    case 'todo':
    default:
      return 'circle';
  }
}

/**
 * Get icon for priority
 */
function getPriorityIcon(value: PropertyValue): IconName {
  switch (value) {
    case 'urgent':
      return 'alert-triangle';
    case 'high':
      return 'chevron-up';
    case 'medium':
      return 'flag';
    case 'low':
    default:
      return 'chevron-down';
  }
}

export function StatusBadge({ definition, value, onChange }: StatusBadgeProps) {
  const [opened, setOpened] = useState(false);

  const isStatus = definition.id === 'status';
  const isPriority = definition.id === 'priority';

  // Determine color based on property type
  const badgeColor = useMemo(() => {
    if (isStatus) return getStatusColor(value);
    if (isPriority) return getPriorityColor(value);
    return 'gray';
  }, [value, isStatus, isPriority]);

  // Determine icon based on property type and value
  const badgeIcon = useMemo((): IconName => {
    if (isStatus) return getStatusIcon(value);
    if (isPriority) return getPriorityIcon(value);
    return 'circle';
  }, [value, isStatus, isPriority]);

  // Format display value
  const displayValue = useMemo(() => {
    if (!value) return 'Not set';
    return formatOptionLabel(value as string);
  }, [value]);

  // Get select options from definition
  const selectOptions = useMemo(() => {
    const options = definition.config?.options || [];
    return options.map((opt: string) => ({
      value: opt,
      label: formatOptionLabel(opt),
    }));
  }, [definition.config?.options]);

  const handleChange = (newValue: string | null) => {
    onChange(newValue);
    setOpened(false);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      trapFocus
      shadow="md"
    >
      <Popover.Target>
        <Badge
          variant="light"
          color={badgeColor}
          size="sm"
          radius="sm"
          leftSection={<Icon name={badgeIcon} size={12} />}
          style={{ cursor: 'pointer' }}
          onClick={() => setOpened(true)}
        >
          {displayValue}
        </Badge>
      </Popover.Target>

      <Popover.Dropdown p="sm" style={{ minWidth: 180 }}>
        <Box>
          <Text size="xs" fw={600} c="dimmed" mb="xs">
            {definition.name}
          </Text>
          <Select
            size="sm"
            variant="filled"
            data={selectOptions}
            value={value as string | null}
            onChange={handleChange}
            placeholder={`Select ${definition.name.toLowerCase()}`}
            clearable={!definition.required}
            comboboxProps={{ withinPortal: false }}
          />
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
