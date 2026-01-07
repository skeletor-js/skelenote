/**
 * Template Settings
 *
 * Settings panel for managing templates - view, edit, delete, and set daily note template.
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Group,
  Title,
  Text,
  Box,
  Select,
  Badge,
  Button,
  Divider,
} from '@mantine/core';
import { Plus } from 'lucide-react';
import { Icon } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTemplates } from '@/hooks';
import { useTypeRegistry, useNavigation, useToast } from '@/contexts';
import { TemplateEditor } from '@/components/templates';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import type { Template } from '@/lib/templates';

export function TemplateSettings() {
  const { templates, remove, setDailyNoteTemplate, dailyNoteTemplate } =
    useTemplates();
  const typeRegistry = useTypeRegistry();
  const { navigateToObject } = useNavigation();
  const { addToast } = useToast();

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  }, []);

  const handleEdit = useCallback((template: Template) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;

    const success = remove(deleteTarget.id);
    if (success) {
      addToast({
        type: 'success',
        message: `Deleted template "${deleteTarget.name}"`,
      });
    } else {
      addToast({
        type: 'error',
        message: 'Failed to delete template',
      });
    }
    setDeleteTarget(null);
  }, [deleteTarget, remove, addToast]);

  const handleSetDailyTemplate = useCallback(
    (templateId: string | null) => {
      setDailyNoteTemplate(templateId);
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
    [setDailyNoteTemplate, templates, addToast]
  );

  const handleViewContent = useCallback(
    (template: Template) => {
      navigateToObject(template.id);
    },
    [navigateToObject]
  );

  const getTypeDisplay = (typeId: string): { icon: IconName; name: string } => {
    const typeDef = typeRegistry.get(typeId);
    if (typeDef) {
      // Convert emoji icon to Lucide icon name
      const iconName = getIconFromEmoji(typeDef.icon);
      return { icon: iconName, name: typeDef.name };
    }
    return { icon: 'file', name: typeId };
  };

  return (
    <Box component="section">
      <Title order={2} mb="md">
        Templates
      </Title>

      <Group justify="space-between" align="flex-start" mb="lg">
        <Text size="sm" c="dimmed" style={{ flex: 1 }}>
          Templates are reusable blueprints for creating objects with pre-filled
          content. Use placeholders like {'{{date}}'} for dynamic content.
        </Text>
        <Button
          variant="light"
          size="xs"
          leftSection={<Plus size={14} />}
          onClick={handleCreate}
        >
          Create Template
        </Button>
      </Group>

      {templates.length === 0 ? (
        <Box ta="center" py="xl">
          <Text size="sm" c="dimmed">
            No templates yet.
          </Text>
        </Box>
      ) : (
        <Stack gap="xs" mb="lg">
          {templates.map((template) => {
            const typeDisplay = getTypeDisplay(template.targetTypeId);
            return (
              <Group
                key={template.id}
                justify="space-between"
                p="sm"
                wrap="nowrap"
                style={(theme) => ({
                  borderRadius: theme.radius.sm,
                  backgroundColor: 'var(--mantine-color-gray-0)',
                })}
              >
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs" mb={4}>
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
                        Daily Note
                      </Badge>
                    )}
                  </Group>
                  <Group gap="xs">
                    <Group gap={4}>
                      <Icon name={typeDisplay.icon} size={12} />
                      <Text size="xs" c="dimmed">
                        Creates: {typeDisplay.name}
                      </Text>
                    </Group>
                    {template.description && (
                      <>
                        <Text size="xs" c="dimmed">
                          ·
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {template.description}
                        </Text>
                      </>
                    )}
                  </Group>
                </Box>

                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => handleViewContent(template)}
                  >
                    View
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => handleEdit(template)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="brick"
                    onClick={() => setDeleteTarget(template)}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>
            );
          })}
        </Stack>
      )}

      {templates.length > 0 && (
        <>
          <Divider my="lg" />

          <Box>
            <Text size="sm" fw={500} mb="xs">
              Daily Note Template
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Automatically apply this template when creating new daily notes.
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
            />
          </Box>
        </>
      )}

      <TemplateEditor
        template={editingTemplate}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Template"
        message={`Delete template "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
