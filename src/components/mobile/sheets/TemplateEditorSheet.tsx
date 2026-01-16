/**
 * Template Editor Sheet
 * Bottom sheet for creating and editing templates on mobile
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Stack,
  TextInput,
  Textarea,
  Group,
  Button,
  Text,
  Select,
  Switch,
  Box,
} from '@mantine/core';
import { BottomSheet } from '../primitives';
import { useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import { BuiltInTypeIds } from '@/lib/types';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@/lib/templates';

interface TemplateEditorSheetProps {
  opened: boolean;
  onClose: () => void;
  /** Template to edit, or null for creating a new template */
  template?: Template | null;
  /** Called when a template is created */
  onCreate?: (input: CreateTemplateInput) => void;
  /** Called when a template is updated */
  onUpdate?: (id: string, input: UpdateTemplateInput) => void;
}

// Types that can be used as template targets
const TEMPLATE_TARGET_TYPES = [
  BuiltInTypeIds.TASK,
  BuiltInTypeIds.NOTE,
  BuiltInTypeIds.PROJECT,
  BuiltInTypeIds.AREA,
  BuiltInTypeIds.MEETING,
  BuiltInTypeIds.LINK,
  BuiltInTypeIds.PERSON,
];

export function TemplateEditorSheet({
  opened,
  onClose,
  template,
  onCreate,
  onUpdate,
}: TemplateEditorSheetProps) {
  const isEditing = !!template;
  const typeRegistry = useTypeRegistry();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetTypeId, setTargetTypeId] = useState<string>(BuiltInTypeIds.NOTE);
  const [isDailyNoteTemplate, setIsDailyNoteTemplate] = useState(false);

  // Build type options from registry
  const typeOptions = TEMPLATE_TARGET_TYPES.map((typeId) => {
    const typeDef = typeRegistry.get(typeId);
    return {
      value: typeId,
      label: typeDef?.name || typeId,
    };
  });

  // Get icon for a type
  const getTypeIcon = useCallback(
    (typeId: string): IconName => {
      const typeDef = typeRegistry.get(typeId);
      if (typeDef?.icon) {
        return getIconFromEmoji(typeDef.icon);
      }
      return 'file-text';
    },
    [typeRegistry]
  );

  // Reset form when opened/closed or template changes
  useEffect(() => {
    if (opened) {
      if (template) {
        setName(template.name);
        setDescription(template.description || '');
        setTargetTypeId(template.targetTypeId);
        setIsDailyNoteTemplate(template.isDailyNoteTemplate);
      } else {
        setName('');
        setDescription('');
        setTargetTypeId(BuiltInTypeIds.NOTE);
        setIsDailyNoteTemplate(false);
      }
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [opened, template]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    if (isEditing && template) {
      onUpdate?.(template.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        targetTypeId,
        isDailyNoteTemplate,
      });
    } else {
      onCreate?.({
        name: name.trim(),
        description: description.trim() || undefined,
        targetTypeId,
        isDailyNoteTemplate,
      });
    }
    onClose();
  }, [
    name,
    description,
    targetTypeId,
    isDailyNoteTemplate,
    isEditing,
    template,
    onCreate,
    onUpdate,
    onClose,
  ]);

  // Custom render for Select option
  const renderSelectOption = ({
    option,
  }: {
    option: { value: string; label: string };
  }) => (
    <Group gap="sm">
      <Icon name={getTypeIcon(option.value)} size={16} />
      <Text size="sm">{option.label}</Text>
    </Group>
  );

  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Edit Template' : 'New Template'}
      size="lg"
    >
      <Stack gap="md">
        {/* Name input */}
        <TextInput
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          label="Name"
          size="md"
          required
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              handleSave();
            }
          }}
        />

        {/* Description input */}
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          label="Description"
          size="md"
          rows={2}
        />

        {/* Type selector */}
        <Select
          label="Creates"
          description="The type of object this template creates"
          value={targetTypeId}
          onChange={(value) => value && setTargetTypeId(value)}
          data={typeOptions}
          size="md"
          renderOption={renderSelectOption}
          leftSection={<Icon name={getTypeIcon(targetTypeId)} size={16} />}
        />

        {/* Daily note template toggle - only show for notes */}
        {targetTypeId === BuiltInTypeIds.NOTE && (
          <Box
            p="md"
            style={{
              backgroundColor: 'var(--surface-overlay)',
              borderRadius: 8,
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={2}>
                <Text size="sm" fw={500}>
                  Daily Note Template
                </Text>
                <Text size="xs" c="dimmed">
                  Auto-apply this template to new daily notes
                </Text>
              </Stack>
              <Switch
                checked={isDailyNoteTemplate}
                onChange={(e) =>
                  setIsDailyNoteTemplate(e.currentTarget.checked)
                }
                color="ember"
              />
            </Group>
          </Box>
        )}

        {/* Info text */}
        <Box
          p="sm"
          style={{
            backgroundColor: 'var(--surface-overlay)',
            borderRadius: 8,
          }}
        >
          <Text size="xs" c="dimmed">
            {isEditing
              ? 'Edit template content by tapping on the template to open it.'
              : 'After creating, you can add content and default properties by editing the template.'}
          </Text>
        </Box>

        {/* Action buttons */}
        <Group gap="sm">
          <Button
            variant="subtle"
            color="gray"
            size="lg"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            color="ember"
            size="lg"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {isEditing ? 'Save' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </BottomSheet>
  );
}
