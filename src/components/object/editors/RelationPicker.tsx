/**
 * RelationPicker - Editor for relation properties
 * Displays relations as chips and allows adding/removing
 */

import { useState, useCallback } from 'react';
import { RelationChip } from './RelationChip';
import { ObjectSearchModal } from './ObjectSearchModal';
import './RelationPicker.css';

interface RelationPickerProps {
  id: string;
  value: string[] | string | null;
  targetTypeIds?: string[];
  multiple?: boolean;
  onChange: (value: string[] | string | null) => void;
}

export function RelationPicker({
  id,
  value,
  targetTypeIds,
  multiple = true,
  onChange,
}: RelationPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Normalize value to array
  const valueArray: string[] = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

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
      const newValue = valueArray.filter((id) => id !== objectId);
      onChange(newValue.length > 0 ? newValue : null);
    },
    [valueArray, onChange]
  );

  return (
    <div className="relation-picker" id={id}>
      <div className="relation-picker__chips">
        {valueArray.map((objectId) => (
          <RelationChip
            key={objectId}
            objectId={objectId}
            onRemove={() => handleRemove(objectId)}
          />
        ))}

        <button
          type="button"
          className="relation-picker__add"
          onClick={() => setIsModalOpen(true)}
        >
          + Add
        </button>
      </div>

      <ObjectSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleAdd}
        targetTypeIds={targetTypeIds}
        excludeIds={valueArray}
        title={`Select ${targetTypeIds?.join(' / ') ?? 'Object'}`}
      />
    </div>
  );
}
