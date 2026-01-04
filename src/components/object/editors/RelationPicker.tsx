/**
 * RelationPicker - Editor for relation properties
 * Displays relations as chips and allows adding/removing
 */

import { useState, useCallback, useMemo } from 'react';
import { Group, Button, Tooltip } from '@mantine/core';
import { RelationChip } from './RelationChip';
import { ObjectSearchModal } from './ObjectSearchModal';
import { Icon } from '@/components/ui/Icon';
import type { SkelenoteObject } from '@/lib/types';

interface RelationPickerProps {
  id: string;
  value: string[] | string | null;
  targetTypeIds?: string[];
  multiple?: boolean;
  onChange: (value: string[] | string | null) => void;
  /** Optional filter function for ObjectSearchModal */
  filterFn?: (object: SkelenoteObject) => boolean;
  /** Whether removal is disabled (e.g., must remove project before clearing area) */
  disableClear?: boolean;
  /** Message to show when clear is disabled */
  disableClearMessage?: string;
}

export function RelationPicker({
  id,
  value,
  targetTypeIds,
  multiple = true,
  onChange,
  filterFn,
  disableClear = false,
  disableClearMessage,
}: RelationPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Normalize value to array - memoize to prevent callback instability
  const valueArray = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value]
  );

  const handleAdd = useCallback(
    (objectId: string) => {
      if (multiple) {
        // Add to array if not already present
        if (!valueArray.includes(objectId)) {
          onChange([...valueArray, objectId]);
        }
      } else {
        // Single relation - replace (still use array format for consistency)
        onChange([objectId]);
      }
    },
    [valueArray, multiple, onChange]
  );

  const handleRemove = useCallback(
    (objectId: string) => {
      if (disableClear) return;
      const newValue = valueArray.filter((objId) => objId !== objectId);
      onChange(newValue.length > 0 ? newValue : null);
    },
    [valueArray, onChange, disableClear]
  );

  const renderChip = (objectId: string) => {
    const chip = (
      <RelationChip
        key={objectId}
        objectId={objectId}
        onRemove={disableClear ? undefined : () => handleRemove(objectId)}
        showRemove={!disableClear}
      />
    );

    if (disableClear && disableClearMessage) {
      return (
        <Tooltip key={objectId} label={disableClearMessage} position="top" withArrow>
          <span>{chip}</span>
        </Tooltip>
      );
    }

    return chip;
  };

  return (
    <Group gap="xs" id={id} wrap="wrap">
      {valueArray.map(renderChip)}

      <Button
        variant="subtle"
        size="xs"
        leftSection={<Icon name="plus" size={14} />}
        onClick={() => setIsModalOpen(true)}
      >
        Add
      </Button>

      <ObjectSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleAdd}
        targetTypeIds={targetTypeIds}
        excludeIds={valueArray}
        title={`Select ${targetTypeIds?.join(' / ') ?? 'Object'}`}
        filterFn={filterFn}
      />
    </Group>
  );
}
