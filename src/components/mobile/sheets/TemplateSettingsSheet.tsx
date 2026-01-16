/**
 * TemplateSettingsSheet - Mobile settings for managing templates
 *
 * Features:
 * - Daily note template selector
 * - List all templates
 * - Create/edit/delete templates
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Group,
  Text,
  Box,
  Select,
  Button,
  Badge,
  UnstyledButton,
  Divider,
} from '@mantine/core';
import { Plus, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { BottomSheet, ConfirmDialog } from '../primitives';
import { TemplateEditorSheet } from './TemplateEditorSheet';
import { useTemplates, useHaptics } from '@/hooks';
import { useTypeRegistry, useNavigation, useToast } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@/lib/templates';

interface TemplateSettingsSheetProps {
  opened: boolean;
  onClose: () => void;
}

export function TemplateSettingsSheet({
  opened,
  onClose,
}: TemplateSettingsSheetProps) {
  const {
    templates,
    create,
    update,
    remove,
    setDailyNoteTemplate,
    dailyNoteTemplate,
  } = useTemplates();
  const typeRegistry = useTypeRegistry();
  const { navigateToObject } = useNavigation();
  const { addToast } = useToast();
  const haptics = useHaptics();

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

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

  // Get type name
  const getTypeName = useCallback(
    (typeId: string): string => {
      const typeDef = typeRegistry.get(typeId);
      return typeDef?.name || typeId;
    },
    [typeRegistry]
  );

  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    setEditorOpen(true);
    haptics.impact('light');
  }, [haptics]);

  const handleEdit = useCallback(
    (template: Template) => {
      setEditingTemplate(template);
      setEditorOpen(true);
      haptics.selection();
    },
    [haptics]
  );

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingTemplate(null);
  }, []);

  const handleTemplateCreate = useCallback(
    (input: CreateTemplateInput) => {
      const newTemplate = create(input);
      if (newTemplate) {
        addToast({
          type: 'success',
          message: `Created template "${input.name}"`,
        });
        haptics.notification('success');
      }
    },
    [create, addToast, haptics]
  );

  const handleTemplateUpdate = useCallback(
    (id: string, input: UpdateTemplateInput) => {
      const updated = update(id, input);
      if (updated) {
        addToast({
          type: 'success',
          message: `Updated template "${input.name}"`,
        });
        haptics.notification('success');
      }
    },
    [update, addToast, haptics]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;

    const success = remove(deleteTarget.id);
    if (success) {
      addToast({
        type: 'success',
        message: `Deleted template "${deleteTarget.name}"`,
      });
      haptics.notification('success');
    } else {
      addToast({
        type: 'error',
        message: 'Failed to delete template',
      });
      haptics.notification('error');
    }
    setDeleteTarget(null);
  }, [deleteTarget, remove, addToast, haptics]);

  const handleSetDailyTemplate = useCallback(
    (templateId: string | null) => {
      setDailyNoteTemplate(templateId);
      haptics.selection();
      if (templateId) {
        const template = templates.find((t) => t.id === templateId);
        addToast({
          type: 'success',
          message: `Set "${template?.name}" as daily note template`,
        });
      } else {
        addToast({
          type: 'info',
          message: 'Cleared daily note template',
        });
      }
    },
    [setDailyNoteTemplate, templates, addToast, haptics]
  );

  const handleViewTemplate = useCallback(
    (template: Template) => {
      navigateToObject(template.id);
      onClose();
    },
    [navigateToObject, onClose]
  );

  return (
    <>
      <BottomSheet
        title="Templates"
        opened={opened}
        onClose={onClose}
        size="lg"
      >
        <Stack gap="lg" px="md" pb="xl">
          {/* Daily Note Template */}
          <Box>
            <Group gap="sm" mb="xs">
              <FileText
                size={18}
                style={{ color: 'var(--mantine-color-gray-6)' }}
              />
              <Text size="sm" fw={500}>
                Daily Note Template
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mb="sm">
              Auto-apply this template to new daily notes
            </Text>
            <Select
              data={[
                { value: '', label: 'None (empty daily notes)' },
                ...templates.map((t) => ({ value: t.id, label: t.name })),
              ]}
              value={dailyNoteTemplate?.id ?? ''}
              onChange={(value) => handleSetDailyTemplate(value || null)}
              placeholder="Select a template"
              clearable
              disabled={templates.length === 0}
              size="md"
            />
            {templates.length === 0 && (
              <Text size="xs" c="dimmed" mt="xs">
                Create a template first to use it for daily notes
              </Text>
            )}
          </Box>

          <Divider />

          {/* Template List */}
          <Box>
            <Group justify="space-between" align="center" mb="md">
              <Text size="sm" fw={500}>
                All Templates
              </Text>
              <Button
                variant="light"
                size="xs"
                leftSection={<Plus size={14} />}
                onClick={handleCreate}
              >
                Create
              </Button>
            </Group>

            {templates.length === 0 ? (
              <Box ta="center" py="xl">
                <Text size="sm" c="dimmed">
                  No templates yet
                </Text>
                <Button
                  variant="subtle"
                  size="sm"
                  mt="sm"
                  leftSection={<Plus size={14} />}
                  onClick={handleCreate}
                >
                  Create your first template
                </Button>
              </Box>
            ) : (
              <Stack gap="xs">
                {templates.map((template) => (
                  <Box
                    key={template.id}
                    p="sm"
                    style={{
                      backgroundColor: 'var(--surface-overlay)',
                      borderRadius: 8,
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap" mb="xs">
                      <UnstyledButton
                        onClick={() => handleViewTemplate(template)}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" fw={500} truncate>
                            {template.name}
                          </Text>
                          {template.isDailyNoteTemplate && (
                            <Badge
                              size="xs"
                              variant="light"
                              color="slate"
                              radius="sm"
                            >
                              Daily
                            </Badge>
                          )}
                          <ChevronRight
                            size={14}
                            style={{
                              color: 'var(--mantine-color-gray-4)',
                              marginLeft: 'auto',
                              flexShrink: 0,
                            }}
                          />
                        </Group>
                      </UnstyledButton>
                    </Group>

                    <Group gap="xs" mb="sm">
                      <Icon
                        name={getTypeIcon(template.targetTypeId)}
                        size={12}
                      />
                      <Text size="xs" c="dimmed">
                        Creates: {getTypeName(template.targetTypeId)}
                      </Text>
                      {template.description && (
                        <>
                          <Text size="xs" c="dimmed">
                            ·
                          </Text>
                          <Text
                            size="xs"
                            c="dimmed"
                            truncate
                            style={{ flex: 1 }}
                          >
                            {template.description}
                          </Text>
                        </>
                      )}
                    </Group>

                    <Group gap="xs">
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => handleEdit(template)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="subtle"
                        size="xs"
                        color="brick"
                        leftSection={<Trash2 size={12} />}
                        onClick={() => setDeleteTarget(template)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </BottomSheet>

      {/* Template Editor */}
      <TemplateEditorSheet
        opened={editorOpen}
        onClose={handleCloseEditor}
        template={editingTemplate}
        onCreate={handleTemplateCreate}
        onUpdate={handleTemplateUpdate}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        title="Delete Template"
        message={`Delete template "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        opened={!!deleteTarget}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
