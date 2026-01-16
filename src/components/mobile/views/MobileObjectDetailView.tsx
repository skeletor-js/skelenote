/**
 * Mobile-optimized Object Detail View
 * Features: property chips, bottom sheet editors, action bar, collapsible backlinks
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Stack,
  Box,
  Text,
  Group,
  ActionIcon,
  ScrollArea,
  TextInput,
  UnstyledButton,
  Loader,
  Center,
  Badge,
} from '@mantine/core';
import {
  MoreHorizontal,
  Pin,
  PinOff,
  CalendarDays,
  Copy,
  Archive,
  Plus,
  ChevronRight,
  Circle,
  CheckCircle2,
  Loader as LoaderIcon,
  Clock,
  AlertTriangle,
  ChevronUp,
  Flag,
  Repeat,
  Sparkles,
} from 'lucide-react';
import {
  useNavigation,
  useObjects,
  useTypeRegistry,
  useToast,
  useSemanticSearchSafe,
} from '@/contexts';
import { usePlatform, usePinnedObjects, useDuplicate } from '@/hooks';
import {
  MobileViewHeader,
  ActionSheet,
  CollapsibleSection,
  type ActionSheetItem,
} from '../primitives';
import {
  PropertyEditorSheet,
  RelationPickerSheet,
  StatusPickerSheet,
  PriorityPickerSheet,
  DueDateSheet,
  RecurrenceSheet,
} from '../sheets';
import { Editor } from '@/components/editor';
import { RelationHelper, type Backlink } from '@/lib/loro';
import { linkObjectToDaily } from '@/lib/daily';
import { formatRecurrenceDisplay } from '@/components/object/editors/RecurrenceEditor';
import type { PropertyDefinition, PropertyValue } from '@/lib/types';
import { BuiltInTypeIds } from '@/lib/types';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import { Icon } from '@/components/ui/Icon';
import type { SemanticSearchResult } from '@/lib/semantic';
import dayjs from 'dayjs';

interface MobileObjectDetailViewProps {
  objectId: string;
}

interface SimilarItem {
  id: string;
  title: string;
  typeIcon: string;
  typeName: string;
  typeId: string;
  similarity: number;
}

// Status display config
const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string }> = {
  todo: { icon: Circle, color: 'gray' },
  'in-progress': { icon: LoaderIcon, color: 'slate' },
  waiting: { icon: Clock, color: 'ochre' },
  done: { icon: CheckCircle2, color: 'sage' },
};

// Priority display config
const PRIORITY_CONFIG: Record<
  string,
  { icon: typeof AlertTriangle; color: string }
> = {
  urgent: { icon: AlertTriangle, color: 'brick' },
  high: { icon: ChevronUp, color: 'ochre' },
  medium: { icon: Flag, color: 'clay' },
  low: { icon: Flag, color: 'gray' },
};

export function MobileObjectDetailView({
  objectId,
}: MobileObjectDetailViewProps) {
  const { store, refreshData, isLoading } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { navigateBack, navigateToObject } = useNavigation();
  const { safeAreaBottom } = usePlatform();
  const { isPinned, pin, unpin } = usePinnedObjects();
  const { duplicate } = useDuplicate();
  const { addToast } = useToast();
  const semanticContext = useSemanticSearchSafe();

  // Sheet states
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [propertySheetOpen, setPropertySheetOpen] = useState(false);
  const [relationPickerOpen, setRelationPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const [dueDateSheetOpen, setDueDateSheetOpen] = useState(false);
  const [recurrenceSheetOpen, setRecurrenceSheetOpen] = useState(false);
  const [editingProperty, setEditingProperty] =
    useState<PropertyDefinition | null>(null);

  // Find Similar state
  const [similarExpanded, setSimilarExpanded] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);

  // Check if semantic search is available
  const isSemanticEnabled =
    semanticContext?.isEnabled && semanticContext?.status === 'ready';
  const semanticThreshold = semanticContext?.threshold ?? 0.2;

  // Get object
  const object = useMemo(() => {
    if (!store) return null;
    return store.get(objectId) ?? null;
  }, [store, objectId]);

  // Get type definition
  const typeDef = useMemo(() => {
    if (!object) return null;
    return typeRegistry.get(object.typeId) ?? null;
  }, [object, typeRegistry]);

  // Check if this is a task
  const isTask = object?.typeId === BuiltInTypeIds.TASK;

  // Get content
  const content = useMemo(() => {
    if (!object || !store || !typeDef?.hasContent) return undefined;
    try {
      return store.getContent(object.id);
    } catch {
      return undefined;
    }
  }, [object, store, typeDef]);

  // Get backlinks using RelationHelper
  const backlinks = useMemo((): Backlink[] => {
    if (!store || !objectId) return [];
    const relationHelper = new RelationHelper(store, typeRegistry);
    return relationHelper.findBacklinks(objectId);
  }, [store, objectId, typeRegistry]);

  // Find similar objects (lazy load on expand)
  const findSimilarObjects = useCallback(async () => {
    if (!semanticContext || !store) return;

    const engine = semanticContext.getEngine();
    if (!engine || engine.status !== 'ready') return;

    setSimilarLoading(true);

    try {
      const results: SemanticSearchResult[] = await engine.findSimilar(
        objectId,
        {
          limit: 5,
          threshold: semanticThreshold,
        }
      );

      // Convert to display items
      const items: SimilarItem[] = results
        .filter((r) => r.objectId !== objectId) // Exclude self
        .map((result) => {
          const obj = store.get(result.objectId);
          if (!obj) return null;

          const typeDef = typeRegistry.get(obj.typeId);
          const title = String(
            obj.properties.title ?? obj.properties.name ?? 'Untitled'
          );

          return {
            id: obj.id,
            title,
            typeIcon: typeDef?.icon ?? 'file',
            typeName: typeDef?.name ?? obj.typeId,
            typeId: obj.typeId,
            similarity: result.score,
          };
        })
        .filter((item): item is SimilarItem => item !== null);

      setSimilarItems(items);
    } catch (error) {
      console.error('Failed to find similar objects:', error);
      setSimilarItems([]);
    } finally {
      setSimilarLoading(false);
    }
  }, [semanticContext, store, typeRegistry, objectId, semanticThreshold]);

  // Reset similar items when object changes
  useEffect(() => {
    setSimilarItems([]);
    setSimilarExpanded(false);
  }, [objectId]);

  // Load similar items when expanded
  useEffect(() => {
    if (
      similarExpanded &&
      similarItems.length === 0 &&
      !similarLoading &&
      isSemanticEnabled
    ) {
      findSimilarObjects();
    }
  }, [
    similarExpanded,
    similarItems.length,
    similarLoading,
    isSemanticEnabled,
    findSimilarObjects,
  ]);

  // Title
  const title =
    object?.properties.title ?? object?.properties.name ?? 'Untitled';

  // Pinned state
  const pinned = isPinned(objectId);

  // Task-specific values
  const taskStatus = isTask ? (object?.properties.status as string) : null;
  const taskPriority = isTask ? (object?.properties.priority as string) : null;
  const taskDueDate = isTask ? (object?.properties.dueDate as number) : null;
  const taskRecurrence = isTask
    ? (object?.properties.recurrence as string)
    : null;

  // Handle title change
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!store || !object) return;
      const propName = object.properties.title !== undefined ? 'title' : 'name';
      store.setProperty(objectId, propName, newTitle);
      refreshData();
    },
    [store, object, objectId, refreshData]
  );

  // Handle content change
  const handleContentChange = useCallback(
    (content: string) => {
      if (!store) return;
      store.setContent(objectId, content);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  // Handle property save
  const handlePropertySave = useCallback(
    (value: PropertyValue) => {
      if (!store || !editingProperty) return;
      store.setProperty(objectId, editingProperty.id, value);
      refreshData();
    },
    [store, objectId, editingProperty, refreshData]
  );

  // Handle relation save
  const handleRelationSave = useCallback(
    (value: string | string[] | null) => {
      if (!store || !editingProperty) return;
      store.setProperty(objectId, editingProperty.id, value);
      refreshData();
    },
    [store, objectId, editingProperty, refreshData]
  );

  // Handle status change
  const handleStatusChange = useCallback(
    (status: string) => {
      if (!store) return;
      store.setProperty(objectId, 'status', status);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  // Handle priority change
  const handlePriorityChange = useCallback(
    (priority: string | null) => {
      if (!store) return;
      store.setProperty(objectId, 'priority', priority);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  // Handle due date change
  const handleDueDateChange = useCallback(
    (date: number | null) => {
      if (!store) return;
      store.setProperty(objectId, 'dueDate', date);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  // Handle recurrence change
  const handleRecurrenceChange = useCallback(
    (recurrence: string | null) => {
      if (!store) return;
      store.setProperty(objectId, 'recurrence', recurrence);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  // Handle pin toggle
  const handleTogglePin = useCallback(() => {
    if (pinned) {
      unpin(objectId);
    } else {
      pin(objectId);
    }
  }, [pinned, pin, unpin, objectId]);

  // Handle link to daily
  const handleLinkToDaily = useCallback(async () => {
    if (!store || !object) return;
    await linkObjectToDaily(store, object);
    refreshData();
    addToast({ message: 'Linked to today', type: 'success' });
  }, [store, object, refreshData, addToast]);

  // Handle duplicate
  const handleDuplicate = useCallback(() => {
    if (!object) return;
    const duplicated = duplicate(object.id);
    if (duplicated) {
      navigateToObject(duplicated.id);
      addToast({ message: 'Duplicated', type: 'success' });
    }
  }, [object, duplicate, navigateToObject, addToast]);

  // Handle archive
  const handleArchive = useCallback(() => {
    if (!store) return;
    store.archive(objectId);
    refreshData();
    navigateBack();
    addToast({ message: 'Archived', type: 'success' });
  }, [store, objectId, refreshData, navigateBack, addToast]);

  // Open property editor
  const openPropertyEditor = useCallback((property: PropertyDefinition) => {
    setEditingProperty(property);

    // Use specialized sheets for certain property types
    if (property.id === 'status' && property.type === 'select') {
      setStatusPickerOpen(true);
    } else if (property.id === 'priority' && property.type === 'select') {
      setPriorityPickerOpen(true);
    } else if (property.id === 'dueDate' && property.type === 'date') {
      setDueDateSheetOpen(true);
    } else if (property.type === 'recurrence') {
      setRecurrenceSheetOpen(true);
    } else if (property.type === 'relation') {
      setRelationPickerOpen(true);
    } else {
      setPropertySheetOpen(true);
    }
  }, []);

  // Get visible properties (exclude status, priority, dueDate for tasks - they have special UI)
  const visibleProperties = useMemo((): PropertyDefinition[] => {
    if (!typeDef) return [];
    return typeDef.schema.filter((p: PropertyDefinition) => {
      // Exclude title/name (shown in header)
      if (['title', 'name'].includes(p.id)) return false;
      // Exclude content (separate editor)
      if (p.id === 'content') return false;
      // For tasks, exclude special properties (shown as badges)
      if (
        isTask &&
        ['status', 'priority', 'dueDate', 'recurrence'].includes(p.id)
      ) {
        return false;
      }
      return true;
    });
  }, [typeDef, isTask]);

  // Format property value for display
  const formatPropertyValue = useCallback(
    (property: PropertyDefinition, value: unknown): string => {
      if (value === null || value === undefined) return property.name;

      if (property.type === 'select' && property.config?.options) {
        const option = property.config.options.find((o: string) => o === value);
        const label = option ?? String(value);
        return label
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }

      if (property.type === 'date') {
        return dayjs(value as number).format('MMM D');
      }

      if (property.type === 'relation') {
        if (Array.isArray(value)) {
          return `${value.length} items`;
        }
        const related = store?.get(value as string);
        return (related?.properties.name ??
          related?.properties.title ??
          'Unknown') as string;
      }

      if (property.type === 'recurrence') {
        return formatRecurrenceDisplay(value as string);
      }

      return String(value);
    },
    [store]
  );

  // Action sheet items
  const actionItems: ActionSheetItem[] = [
    {
      id: 'pin',
      label: pinned ? 'Unpin' : 'Pin',
      icon: pinned ? PinOff : Pin,
      onAction: handleTogglePin,
    },
    {
      id: 'link-daily',
      label: 'Link to Today',
      icon: CalendarDays,
      onAction: handleLinkToDaily,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      onAction: handleDuplicate,
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      variant: 'danger',
      onAction: handleArchive,
    },
  ];

  if (isLoading || !object) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader title="Loading..." showBack onBack={navigateBack} />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  // Get status badge config
  const statusConfig = taskStatus ? STATUS_CONFIG[taskStatus] : null;
  const StatusIcon = statusConfig?.icon ?? Circle;

  // Get priority badge config
  const priorityConfig = taskPriority ? PRIORITY_CONFIG[taskPriority] : null;
  const PriorityIcon = priorityConfig?.icon ?? Flag;

  return (
    <Stack gap={0} h="100%">
      {/* Header */}
      <MobileViewHeader
        title={typeDef?.name ?? 'Object'}
        showBack
        onBack={navigateBack}
        rightSection={
          <ActionIcon
            variant="subtle"
            color="gray"
            size={44}
            onClick={() => setActionSheetOpen(true)}
          >
            <MoreHorizontal size={20} />
          </ActionIcon>
        }
      />

      {/* Scrollable content */}
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="md" p="md">
          {/* Title - inline editable */}
          <TextInput
            value={title as string}
            onChange={(e) => handleTitleChange(e.target.value)}
            variant="unstyled"
            size="xl"
            styles={{
              input: {
                fontSize: 20,
                fontWeight: 600,
                padding: 0,
              },
            }}
            placeholder="Untitled"
          />

          {/* Task-specific badges */}
          {isTask && (
            <Group gap="xs">
              {/* Status badge */}
              <UnstyledButton onClick={() => setStatusPickerOpen(true)}>
                <Badge
                  variant="light"
                  color={statusConfig?.color ?? 'gray'}
                  size="lg"
                  leftSection={<StatusIcon size={14} />}
                >
                  {taskStatus
                    ? taskStatus
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'Status'}
                </Badge>
              </UnstyledButton>

              {/* Priority badge */}
              {taskPriority && (
                <UnstyledButton onClick={() => setPriorityPickerOpen(true)}>
                  <Badge
                    variant="light"
                    color={priorityConfig?.color ?? 'gray'}
                    size="lg"
                    leftSection={<PriorityIcon size={14} />}
                  >
                    {taskPriority.replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Badge>
                </UnstyledButton>
              )}

              {/* Due date badge */}
              <UnstyledButton onClick={() => setDueDateSheetOpen(true)}>
                <Badge
                  variant="light"
                  color={taskDueDate ? 'ember' : 'gray'}
                  size="lg"
                  leftSection={<CalendarDays size={14} />}
                >
                  {taskDueDate
                    ? dayjs(taskDueDate).format('MMM D')
                    : 'Due date'}
                </Badge>
              </UnstyledButton>

              {/* Recurrence badge */}
              {taskRecurrence && (
                <UnstyledButton onClick={() => setRecurrenceSheetOpen(true)}>
                  <Badge
                    variant="light"
                    color="grape"
                    size="lg"
                    leftSection={<Repeat size={14} />}
                  >
                    {formatRecurrenceDisplay(taskRecurrence)}
                  </Badge>
                </UnstyledButton>
              )}
            </Group>
          )}

          {/* Property chips row */}
          {visibleProperties.length > 0 && (
            <Box
              style={{
                marginLeft: -16,
                marginRight: -16,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              <ScrollArea scrollbarSize={0} type="scroll">
                <Group gap="xs" wrap="nowrap">
                  {visibleProperties.map((prop: PropertyDefinition) => {
                    const value = object.properties[prop.id];
                    const hasValue = value !== null && value !== undefined;

                    return (
                      <UnstyledButton
                        key={prop.id}
                        onClick={() => openPropertyEditor(prop)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 16,
                          backgroundColor: hasValue
                            ? 'var(--mantine-color-gray-1)'
                            : 'transparent',
                          border: hasValue
                            ? 'none'
                            : '1px dashed var(--mantine-color-gray-4)',
                          flexShrink: 0,
                        }}
                      >
                        <Text size="xs" c={hasValue ? undefined : 'dimmed'}>
                          {hasValue
                            ? formatPropertyValue(prop, value)
                            : prop.name}
                        </Text>
                      </UnstyledButton>
                    );
                  })}
                  {/* Add property button */}
                  <UnstyledButton
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 16,
                      border: '1px dashed var(--mantine-color-gray-4)',
                      flexShrink: 0,
                    }}
                  >
                    <Plus
                      size={14}
                      style={{ color: 'var(--mantine-color-gray-5)' }}
                    />
                    <Text size="xs" c="dimmed">
                      Add
                    </Text>
                  </UnstyledButton>
                </Group>
              </ScrollArea>
            </Box>
          )}

          {/* Editor content */}
          {typeDef?.hasContent && (
            <Box style={{ minHeight: 300, paddingTop: 8 }}>
              <Editor
                objectId={object.id}
                initialContent={content ?? null}
                onContentChange={handleContentChange}
              />
            </Box>
          )}

          {/* Backlinks */}
          <CollapsibleSection title="Linked from" count={backlinks.length}>
            {backlinks.length === 0 ? (
              <Text c="dimmed" size="sm">
                No backlinks yet
              </Text>
            ) : (
              <Stack gap={0}>
                {backlinks.map((link: Backlink) => {
                  const sourceObj = store?.get(link.sourceId);
                  if (!sourceObj) return null;
                  return (
                    <UnstyledButton
                      key={link.sourceId}
                      onClick={() => navigateToObject(link.sourceId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 0',
                      }}
                    >
                      <Text size="sm" truncate style={{ flex: 1 }}>
                        {
                          (sourceObj.properties.title ??
                            sourceObj.properties.name ??
                            'Untitled') as string
                        }
                      </Text>
                      <ChevronRight
                        size={16}
                        style={{ color: 'var(--mantine-color-gray-4)' }}
                      />
                    </UnstyledButton>
                  );
                })}
              </Stack>
            )}
          </CollapsibleSection>

          {/* Find Similar - only show when semantic search is enabled */}
          {isSemanticEnabled && (
            <CollapsibleSection
              title={
                <Group gap="xs">
                  <Text size="sm" c="dimmed" fw={500}>
                    Find Similar
                  </Text>
                  <Badge size="xs" variant="light" color="clay" radius="sm">
                    <Group gap={4}>
                      <Sparkles size={10} />
                      AI
                    </Group>
                  </Badge>
                </Group>
              }
              count={similarItems.length > 0 ? similarItems.length : undefined}
              defaultOpen={false}
              onOpenChange={(open) => setSimilarExpanded(open)}
            >
              {similarLoading ? (
                <Group gap="xs" py="xs">
                  <Loader size="xs" />
                  <Text size="sm" c="dimmed">
                    Finding similar objects...
                  </Text>
                </Group>
              ) : similarItems.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No similar objects found
                </Text>
              ) : (
                <Stack gap={0}>
                  {similarItems.map((item) => {
                    // Get proper icon name
                    const iconName: IconName =
                      item.typeIcon.length <= 2
                        ? getIconFromEmoji(item.typeIcon)
                        : (item.typeIcon as IconName);

                    return (
                      <UnstyledButton
                        key={item.id}
                        onClick={() => navigateToObject(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 0',
                        }}
                      >
                        <Icon
                          name={iconName}
                          size={16}
                          style={{ color: 'var(--mantine-color-gray-5)' }}
                        />
                        <Text size="sm" truncate style={{ flex: 1 }}>
                          {item.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {Math.round(item.similarity * 100)}%
                        </Text>
                        <ChevronRight
                          size={16}
                          style={{ color: 'var(--mantine-color-gray-4)' }}
                        />
                      </UnstyledButton>
                    );
                  })}
                </Stack>
              )}
            </CollapsibleSection>
          )}
        </Stack>
      </ScrollArea>

      {/* Bottom action bar */}
      <Box
        px="md"
        py="sm"
        style={{
          borderTop: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface-paper)',
          paddingBottom: safeAreaBottom + 8,
        }}
      >
        <Group justify="space-around">
          <ActionIcon
            variant="subtle"
            size={44}
            onClick={handleTogglePin}
            aria-label={pinned ? 'Unpin' : 'Pin'}
          >
            {pinned ? (
              <PinOff
                size={20}
                style={{ color: 'var(--mantine-color-ember-5)' }}
              />
            ) : (
              <Pin size={20} />
            )}
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size={44}
            onClick={handleLinkToDaily}
            aria-label="Link to today"
          >
            <CalendarDays size={20} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size={44}
            onClick={handleDuplicate}
            aria-label="Duplicate"
          >
            <Copy size={20} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size={44}
            onClick={handleArchive}
            aria-label="Archive"
          >
            <Archive size={20} />
          </ActionIcon>
        </Group>
      </Box>

      {/* Action sheet */}
      <ActionSheet
        opened={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        actions={actionItems}
      />

      {/* Property editor sheet */}
      <PropertyEditorSheet
        opened={propertySheetOpen}
        onClose={() => {
          setPropertySheetOpen(false);
          setEditingProperty(null);
        }}
        property={editingProperty}
        value={
          editingProperty
            ? (object.properties[editingProperty.id] as PropertyValue)
            : null
        }
        onSave={handlePropertySave}
        onOpenRelationPicker={() => {
          setPropertySheetOpen(false);
          setRelationPickerOpen(true);
        }}
        onOpenRecurrenceSheet={() => {
          setPropertySheetOpen(false);
          setRecurrenceSheetOpen(true);
        }}
      />

      {/* Relation picker sheet */}
      <RelationPickerSheet
        opened={relationPickerOpen}
        onClose={() => {
          setRelationPickerOpen(false);
          setEditingProperty(null);
        }}
        property={editingProperty}
        value={
          editingProperty
            ? (object.properties[editingProperty.id] as string | string[])
            : null
        }
        onSave={handleRelationSave}
      />

      {/* Status picker sheet */}
      <StatusPickerSheet
        opened={statusPickerOpen}
        onClose={() => setStatusPickerOpen(false)}
        value={taskStatus}
        onSelect={handleStatusChange}
      />

      {/* Priority picker sheet */}
      <PriorityPickerSheet
        opened={priorityPickerOpen}
        onClose={() => setPriorityPickerOpen(false)}
        value={taskPriority}
        onSelect={handlePriorityChange}
      />

      {/* Due date sheet */}
      <DueDateSheet
        opened={dueDateSheetOpen}
        onClose={() => setDueDateSheetOpen(false)}
        value={taskDueDate}
        onSelect={handleDueDateChange}
      />

      {/* Recurrence sheet */}
      <RecurrenceSheet
        opened={recurrenceSheetOpen}
        onClose={() => setRecurrenceSheetOpen(false)}
        value={taskRecurrence}
        onSave={handleRecurrenceChange}
      />
    </Stack>
  );
}
