/**
 * Mobile Templates View
 * Features: List templates, create new, edit, delete, apply
 */

import { useMemo, useCallback, useState } from 'react';
import {
  Stack,
  Text,
  Box,
  Center,
  Loader,
  TextInput,
  Group,
  Badge,
} from '@mantine/core';
import {
  Search,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  FileText,
} from 'lucide-react';
import { useNavigation, useTypeRegistry } from '@/contexts';
import { useTemplates, useConfirmDialog } from '@/hooks';
import { useObjects } from '@/contexts';
import {
  MobileViewHeader,
  PullToRefresh,
  HeaderAddButton,
  SwipeableRow,
  ActionSheet,
  type ActionSheetItem,
} from '../primitives';
import { TemplateEditorSheet } from '../sheets';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@/lib/templates';

export function MobileTemplatesView() {
  const { navigateToView } = useNavigation();
  const { templates, remove, duplicate, create, update, isLoading } =
    useTemplates();
  const { refreshData } = useObjects();
  const { confirm } = useConfirmDialog();
  const typeRegistry = useTypeRegistry();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Action sheet state
  const [actionSheetTemplate, setActionSheetTemplate] =
    useState<Template | null>(null);

  // Editor sheet state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Filter by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter((template) => {
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query)
      );
    });
  }, [templates, searchQuery]);

  // Group templates by target type
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    filteredTemplates.forEach((template) => {
      const key = template.targetTypeId;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(template);
    });
    return groups;
  }, [filteredTemplates]);

  // Get type name from registry
  const getTypeName = useCallback(
    (typeId: string): string => {
      const typeDef = typeRegistry.get(typeId);
      return typeDef?.name || typeId;
    },
    [typeRegistry]
  );

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

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    refreshData();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, [refreshData]);

  // Handle template tap - for now just show action sheet
  const handleTemplatePress = useCallback((template: Template) => {
    setActionSheetTemplate(template);
  }, []);

  // Handle long press - show action sheet
  const handleLongPress = useCallback((template: Template) => {
    setActionSheetTemplate(template);
  }, []);

  // Handle delete with confirmation
  const handleDelete = useCallback(
    async (template: Template) => {
      setActionSheetTemplate(null);

      const confirmed = await confirm({
        title: 'Delete Template',
        message: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });

      if (confirmed) {
        remove(template.id);
      }
    },
    [confirm, remove]
  );

  // Handle duplicate
  const handleDuplicate = useCallback(
    (template: Template) => {
      setActionSheetTemplate(null);
      duplicate(template.id);
    },
    [duplicate]
  );

  // Handle edit - open editor sheet with the selected template
  const handleEdit = useCallback((template: Template) => {
    setActionSheetTemplate(null);
    setEditingTemplate(template);
    setEditorOpen(true);
  }, []);

  // Handle create - open editor sheet for new template
  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    setEditorOpen(true);
  }, []);

  // Handle create template from editor
  const handleCreateTemplate = useCallback(
    (input: CreateTemplateInput) => {
      create(input);
    },
    [create]
  );

  // Handle update template from editor
  const handleUpdateTemplate = useCallback(
    (id: string, input: UpdateTemplateInput) => {
      update(id, input);
    },
    [update]
  );

  // Action sheet actions
  const actionSheetActions: ActionSheetItem[] = actionSheetTemplate
    ? [
        {
          id: 'edit',
          label: 'Edit Template',
          icon: Pencil,
          onAction: () => handleEdit(actionSheetTemplate),
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          icon: Copy,
          onAction: () => handleDuplicate(actionSheetTemplate),
        },
        {
          id: 'delete',
          label: 'Delete Template',
          icon: Trash2,
          onAction: () => handleDelete(actionSheetTemplate),
          variant: 'danger',
        },
      ]
    : [];

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="Templates"
          showBack
          onBack={() => navigateToView('browse')}
        />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader
        title="Templates"
        count={templates.length > 0 ? templates.length : undefined}
        showBack
        onBack={() => navigateToView('browse')}
        rightSection={
          <HeaderAddButton label="New template" onClick={handleCreate} />
        }
      />

      {/* Search bar */}
      {templates.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <TextInput
            placeholder="Search templates..."
            leftSection={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
          />
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredTemplates.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <FileText
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                {templates.length === 0
                  ? 'No templates yet'
                  : 'No templates match your search'}
              </Text>
              {templates.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">
                  Templates help you quickly create objects with predefined
                  content and properties
                </Text>
              )}
            </Stack>
          ) : (
            // Template list grouped by type
            <Stack gap={0}>
              {Object.entries(groupedTemplates).map(
                ([typeId, typeTemplates]) => (
                  <Box key={typeId}>
                    {/* Type header */}
                    <Box
                      px="md"
                      py="xs"
                      style={{
                        backgroundColor: 'var(--surface-overlay)',
                        borderBottom: '1px solid var(--border-default)',
                      }}
                    >
                      <Group gap="xs">
                        <Icon
                          name={getTypeIcon(typeId)}
                          size={14}
                          style={{ color: 'var(--mantine-color-gray-5)' }}
                        />
                        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                          {getTypeName(typeId)}
                        </Text>
                        <Badge size="xs" variant="light" color="gray">
                          {typeTemplates.length}
                        </Badge>
                      </Group>
                    </Box>

                    {/* Templates in this group */}
                    {typeTemplates.map((template) => (
                      <SwipeableRow
                        key={template.id}
                        leftActions={[
                          {
                            id: 'edit',
                            icon: Pencil,
                            color: 'sage',
                            label: 'Edit',
                            onAction: () => handleEdit(template),
                          },
                          {
                            id: 'duplicate',
                            icon: Copy,
                            color: 'ember',
                            label: 'Copy',
                            onAction: () => handleDuplicate(template),
                          },
                        ]}
                        rightActions={[
                          {
                            id: 'delete',
                            icon: Trash2,
                            color: 'brick',
                            label: 'Delete',
                            onAction: () => handleDelete(template),
                          },
                        ]}
                        onLongPress={() => handleLongPress(template)}
                      >
                        <Box
                          onClick={() => handleTemplatePress(template)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-default)',
                            cursor: 'pointer',
                            backgroundColor: 'var(--surface-paper)',
                          }}
                        >
                          <Group gap="sm" wrap="nowrap">
                            {/* Template info */}
                            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                              <Group gap="xs" wrap="nowrap">
                                <Text size="sm" fw={500} truncate>
                                  {template.name}
                                </Text>
                                {template.isDailyNoteTemplate && (
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color="ember"
                                  >
                                    Daily
                                  </Badge>
                                )}
                              </Group>
                              {template.description && (
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {template.description}
                                </Text>
                              )}
                            </Stack>

                            {/* Chevron */}
                            <ChevronRight
                              size={16}
                              style={{
                                color: 'var(--mantine-color-gray-4)',
                                flexShrink: 0,
                              }}
                            />
                          </Group>
                        </Box>
                      </SwipeableRow>
                    ))}
                  </Box>
                )
              )}
            </Stack>
          )}
        </Box>
      </PullToRefresh>

      {/* Action Sheet */}
      <ActionSheet
        opened={!!actionSheetTemplate}
        onClose={() => setActionSheetTemplate(null)}
        title={actionSheetTemplate?.name ?? 'Template Actions'}
        actions={actionSheetActions}
      />

      {/* Editor Sheet */}
      <TemplateEditorSheet
        opened={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={editingTemplate}
        onCreate={handleCreateTemplate}
        onUpdate={handleUpdateTemplate}
      />
    </Stack>
  );
}
