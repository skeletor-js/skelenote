/**
 * Quick Create Area Sheet
 * Bottom sheet for quickly creating new areas on mobile
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Stack, TextInput, Button } from '@mantine/core';
import { BottomSheet } from '../primitives';
import { useObjects, useToast } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';

interface QuickCreateAreaSheetProps {
  opened: boolean;
  onClose: () => void;
  onAreaCreated?: (areaId: string) => void;
}

export function QuickCreateAreaSheet({
  opened,
  onClose,
  onAreaCreated,
}: QuickCreateAreaSheetProps) {
  const { store, refreshData } = useObjects();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (opened) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      // Reset state when closed
      setName('');
    }
  }, [opened]);

  // Create area
  const handleCreate = useCallback(() => {
    if (!store || !name.trim()) return;

    // Check for duplicate names
    const existingAreas = store.getByType(BuiltInTypeIds.AREA);
    const duplicate = existingAreas.find(
      (a) =>
        (a.properties.name as string)?.toLowerCase() ===
        name.trim().toLowerCase()
    );

    if (duplicate) {
      addToast({
        type: 'warning',
        message: `An area named "${name.trim()}" already exists`,
      });
      return;
    }

    const area = store.create({
      typeId: BuiltInTypeIds.AREA,
      properties: {
        name: name.trim(),
      },
      inboxed: false,
    });

    refreshData();
    addToast({
      type: 'success',
      message: 'Area created',
    });
    onAreaCreated?.(area.id);
    onClose();
  }, [store, name, refreshData, onAreaCreated, onClose, addToast]);

  return (
    <BottomSheet opened={opened} onClose={onClose} title="New Area" size="md">
      <Stack gap="md">
        {/* Name input */}
        <TextInput
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Area name"
          size="md"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              handleCreate();
            }
          }}
        />

        {/* Create button */}
        <Button
          color="ember"
          size="lg"
          fullWidth
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          Create Area
        </Button>
      </Stack>
    </BottomSheet>
  );
}
