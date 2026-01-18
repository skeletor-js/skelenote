/**
 * Quick Create Tag Sheet
 * Bottom sheet for quickly creating new tags on mobile
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Stack, TextInput, Group, Button, Text, Box } from '@mantine/core';
import { Check } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useObjects, useToast } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';
import { TagColorOptions, type TagColor } from '@/lib/types/built-in-types';

interface QuickCreateTagSheetProps {
  opened: boolean;
  onClose: () => void;
  onTagCreated?: (tagId: string) => void;
}

// Color display names for accessibility
const COLOR_NAMES: Record<TagColor, string> = {
  ember: 'Ember (Orange)',
  clay: 'Clay (Purple)',
  sage: 'Sage (Green)',
  ochre: 'Ochre (Yellow)',
  brick: 'Brick (Red)',
  slate: 'Slate (Blue)',
};

export function QuickCreateTagSheet({
  opened,
  onClose,
  onTagCreated,
}: QuickCreateTagSheetProps) {
  const { store, refreshData } = useObjects();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState<TagColor>('ember');
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
      setColor('ember');
    }
  }, [opened]);

  // Create tag
  const handleCreate = useCallback(() => {
    if (!store || !name.trim()) return;

    // Check for duplicate names
    const existingTags = store.getByType(BuiltInTypeIds.TAG);
    const duplicate = existingTags.find(
      (t) =>
        (t.properties.name as string)?.toLowerCase() ===
        name.trim().toLowerCase()
    );

    if (duplicate) {
      addToast({
        type: 'warning',
        message: `A tag named "${name.trim()}" already exists`,
      });
      return;
    }

    const tag = store.create({
      typeId: BuiltInTypeIds.TAG,
      properties: {
        name: name.trim(),
        color,
      },
      inboxed: false,
    });

    refreshData();
    addToast({
      type: 'success',
      message: 'Tag created',
    });
    onTagCreated?.(tag.id);
    onClose();
  }, [store, name, color, refreshData, onTagCreated, onClose, addToast]);

  return (
    <BottomSheet opened={opened} onClose={onClose} title="New Tag" size="md">
      <Stack gap="md">
        {/* Name input */}
        <TextInput
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tag name"
          size="md"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              handleCreate();
            }
          }}
        />

        {/* Color picker */}
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Color
          </Text>
          <Group gap="xs">
            {TagColorOptions.map((colorOption) => (
              <Button
                key={colorOption}
                variant="filled"
                color={colorOption}
                size="sm"
                w={44}
                h={44}
                p={0}
                onClick={() => setColor(colorOption)}
                aria-label={COLOR_NAMES[colorOption]}
                aria-pressed={color === colorOption}
                styles={{
                  root: {
                    position: 'relative',
                  },
                }}
              >
                {color === colorOption && (
                  <Box
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={20} strokeWidth={3} color="white" />
                  </Box>
                )}
              </Button>
            ))}
          </Group>
        </Stack>

        {/* Create button */}
        <Button
          color="ember"
          size="lg"
          fullWidth
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          Create Tag
        </Button>
      </Stack>
    </BottomSheet>
  );
}
