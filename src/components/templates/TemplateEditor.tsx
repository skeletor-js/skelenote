/**
 * TemplateEditor - Modal for creating and editing templates
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  Button,
  Menu,
  Stack,
  Group,
  Text,
  Box,
  Code,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { useTypeRegistry } from '@/contexts';
import { useTemplates } from '@/hooks';
import { Icon } from '@/components/ui/Icon';
import type { Template, CreateTemplateInput } from '@/lib/templates';
import { PLACEHOLDERS } from '@/lib/templates';
import { BuiltInTypeIds } from '@/lib/types';
import type { PropertyValue } from '@/lib/types';
import { PropertyEditor } from '@/components/object/PropertyEditor';

interface TemplateEditorProps {
  /** Existing template to edit (null for create mode) */
  template?: Template | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback after successful save */
  onSave?: (template: Template) => void;
}

export function TemplateEditor({
  template,
  isOpen,
  onClose,
  onSave,
}: TemplateEditorProps) {
  const typeRegistry = useTypeRegistry();
  const { create, update } = useTemplates();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!template;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetTypeId, setTargetTypeId] = useState<string>(BuiltInTypeIds.NOTE);
  const [isDailyNoteTemplate, setIsDailyNoteTemplate] = useState(false);
  const [content, setContent] = useState('');
  const [defaultProperties, setDefaultProperties] = useState<
    Record<string, PropertyValue>
  >({});

  // Get available types (exclude template type itself)
  const availableTypes = useMemo(() => {
    return typeRegistry
      .getAll()
      .filter((t) => t.id !== BuiltInTypeIds.TEMPLATE);
  }, [typeRegistry]);

  // Convert to select data format
  const typeSelectData = useMemo(() => {
    return availableTypes.map((type) => ({
      value: type.id,
      label: type.name,
    }));
  }, [availableTypes]);

  // Get the selected type's editable properties (exclude hidden ones)
  const targetTypeProperties = useMemo(() => {
    const typeDef = typeRegistry.get(targetTypeId);
    if (!typeDef) return [];
    return typeDef.schema.filter((prop) => !prop.hidden);
  }, [typeRegistry, targetTypeId]);

  // Initialize form when template changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name);
        setDescription(template.description ?? '');
        setTargetTypeId(template.targetTypeId);
        setIsDailyNoteTemplate(template.isDailyNoteTemplate);
        setDefaultProperties(template.defaultProperties ?? {});
        setContent('');
      } else {
        setName('');
        setDescription('');
        setTargetTypeId(BuiltInTypeIds.NOTE);
        setIsDailyNoteTemplate(false);
        setDefaultProperties({});
        setContent('');
      }
    }
  }, [template, isOpen]);

  // Reset default properties when target type changes (but keep title if it exists)
  const handleTargetTypeChange = useCallback((newTypeId: string | null) => {
    if (!newTypeId) return;
    setTargetTypeId(newTypeId);
    setDefaultProperties((prev) => {
      const title = prev.title;
      const result: Record<string, PropertyValue> = {};
      if (title !== undefined) {
        result.title = title;
      }
      return result;
    });
  }, []);

  // Focus name input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Insert placeholder at end of content
  const insertPlaceholder = useCallback((placeholder: string) => {
    setContent((prev) => prev + placeholder);
  }, []);

  // Update a single default property
  const handlePropertyChange = useCallback(
    (propertyId: string, value: PropertyValue) => {
      setDefaultProperties((prev) => {
        if (value === null || value === undefined || value === '') {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [propertyId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [propertyId]: value };
      });
    },
    []
  );

  // Build the final defaultProperties (filter out empty values)
  const getCleanDefaultProperties = useCallback(() => {
    const clean: Record<string, PropertyValue> = {};
    for (const [key, value] of Object.entries(defaultProperties)) {
      if (value !== null && value !== undefined && value !== '') {
        clean[key] = value;
      }
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
  }, [defaultProperties]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    const cleanProps = getCleanDefaultProperties();

    if (isEditMode && template) {
      const updated = update(template.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        targetTypeId,
        isDailyNoteTemplate,
        defaultProperties: cleanProps,
      });
      if (updated) {
        onSave?.(updated);
        onClose();
      }
    } else {
      const input: CreateTemplateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        targetTypeId,
        isDailyNoteTemplate,
        defaultProperties: cleanProps,
        content: content.trim() || undefined,
      };
      const created = create(input);
      if (created) {
        onSave?.(created);
        onClose();
      }
    }
  }, [
    name,
    description,
    targetTypeId,
    isDailyNoteTemplate,
    content,
    getCleanDefaultProperties,
    isEditMode,
    template,
    create,
    update,
    onSave,
    onClose,
  ]);

  // Handle form submission via Enter in name field
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
        e.preventDefault();
        handleSave();
      }
    },
    [name, handleSave]
  );

  const selectedType = typeRegistry.get(targetTypeId);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Template' : 'Create Template'}
      centered
      size="lg"
    >
      <ScrollArea.Autosize mah="70vh">
        <Stack gap="md" pr="xs">
          {/* Template Name */}
          <TextInput
            ref={nameInputRef}
            label="Template Name"
            placeholder="e.g., Meeting Notes, Daily Journal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyPress}
            required
          />

          {/* Target Type */}
          <Box>
            <Select
              label="Creates"
              data={typeSelectData}
              value={targetTypeId}
              onChange={handleTargetTypeChange}
            />
            <Text size="xs" c="dimmed" mt={4}>
              Objects created from this template will be{' '}
              {selectedType?.name ?? 'this type'}
            </Text>
          </Box>

          {/* Description */}
          <TextInput
            label="Description"
            description="Optional"
            placeholder="Brief description of what this template is for"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Default Properties Section */}
          {targetTypeProperties.length > 0 && (
            <>
              <Divider />
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  Default {selectedType?.name} Properties
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Set default values for properties. Text fields support
                  placeholders like {'{{date}}'}.
                </Text>
                <Stack gap="sm">
                  {targetTypeProperties.map((propDef) => (
                    <Box key={propDef.id}>
                      <Text size="sm" mb={4}>
                        {propDef.name}
                        {propDef.required && (
                          <Text component="span" c="brick" ml={4}>
                            *
                          </Text>
                        )}
                      </Text>
                      <PropertyEditor
                        id={`prop-${propDef.id}`}
                        definition={propDef}
                        value={defaultProperties[propDef.id] ?? null}
                        onChange={(value) =>
                          handlePropertyChange(propDef.id, value)
                        }
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            </>
          )}

          <Divider />

          {/* Daily Note Template */}
          <Box>
            <Checkbox
              label="Use as Daily Note Template"
              checked={isDailyNoteTemplate}
              onChange={(e) => setIsDailyNoteTemplate(e.currentTarget.checked)}
            />
            <Text size="xs" c="dimmed" mt={4} ml={28}>
              Template content will auto-apply when new daily notes are created
            </Text>
          </Box>

          {/* Template Content (only for create mode) */}
          {!isEditMode && (
            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  Template Content
                  <Text component="span" c="dimmed" fw={400} ml={4}>
                    (optional)
                  </Text>
                </Text>
                <Menu shadow="md" width={250}>
                  <Menu.Target>
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<Icon name="plus" size={14} />}
                    >
                      Insert Placeholder
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {PLACEHOLDERS.map((p) => (
                      <Menu.Item
                        key={p.type}
                        onClick={() => insertPlaceholder(p.label)}
                      >
                        <Group justify="space-between">
                          <Code>{p.label}</Code>
                          <Text size="xs" c="dimmed">
                            {p.example}
                          </Text>
                        </Group>
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <Textarea
                placeholder="Enter template content with placeholders like {{date}}, {{title}}..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                minRows={4}
                autosize
                maxRows={8}
              />
              <Box mt="xs">
                <Text size="xs" c="dimmed" mb="xs">
                  Available placeholders:
                </Text>
                <Group gap="xs">
                  {PLACEHOLDERS.map((p) => (
                    <Group key={p.type} gap={4}>
                      <Code fz="xs">{p.label}</Code>
                      <Icon name="chevron-right" size={12} />
                      <Text size="xs" c="dimmed">
                        {p.example}
                      </Text>
                    </Group>
                  ))}
                </Group>
              </Box>
            </Box>
          )}

          {isEditMode && (
            <Text size="sm" c="dimmed" fs="italic">
              To edit template content, open the template object and edit it
              directly.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>

      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="subtle" color="gray" onClick={onClose}>
          Cancel
        </Button>
        <Button color="ember" onClick={handleSave} disabled={!name.trim()}>
          {isEditMode ? 'Save Changes' : 'Create Template'}
        </Button>
      </Group>
    </Modal>
  );
}
