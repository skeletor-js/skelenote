/**
 * Quick Capture Sheet
 * Compact drawer rising from the bottom tab bar for rapid object capture
 *
 * Features:
 * - framer-motion powered animations
 * - Stays low on screen (thumb-friendly)
 * - Icon-only type selector (7 types)
 * - Property chips for quick property access
 * - Type-specific fields (URL for Links)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Stack,
  TextInput,
  Group,
  Button,
  ScrollArea,
  UnstyledButton,
  Text,
  Collapse,
  Box,
  Portal,
} from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ChevronRight,
  ChevronDown,
  CircleCheck,
  Link2,
  Calendar,
  User,
  Folder,
  Layers,
  Flag,
  Tag,
  Clock,
  Mail,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import { PropertyChip } from '../primitives';
import { TemplatePickerSheet } from './TemplatePickerSheet';
import { DueDateSheet } from './DueDateSheet';
import { PriorityPickerSheet, getPriorityInfo } from './PriorityPickerSheet';
import { ProjectPickerSheet } from './ProjectPickerSheet';
import { AreaPickerSheet } from './AreaPickerSheet';
import { TagPickerSheet } from './TagPickerSheet';
import { useObjects } from '@/contexts';
import { useLinkToDaily, useReducedMotion } from '@/hooks';
import { BuiltInTypeIds, type PropertyValue } from '@/lib/types';
import { createFromTemplate, type Template } from '@/lib/templates';

type CaptureType =
  | 'note'
  | 'task'
  | 'link'
  | 'meeting'
  | 'person'
  | 'project'
  | 'area';

const TYPE_OPTIONS = [
  { value: 'note' as const, label: 'Note', icon: FileText },
  { value: 'task' as const, label: 'Task', icon: CircleCheck },
  { value: 'link' as const, label: 'Link', icon: Link2 },
  { value: 'meeting' as const, label: 'Meeting', icon: Calendar },
  { value: 'person' as const, label: 'Person', icon: User },
  { value: 'project' as const, label: 'Project', icon: Folder },
  { value: 'area' as const, label: 'Area', icon: Layers },
];

interface QuickCaptureSheetProps {
  opened: boolean;
  onClose: () => void;
  onItemCreated?: (itemId: string) => void;
}

export function QuickCaptureSheet({
  opened,
  onClose,
  onItemCreated,
}: QuickCaptureSheetProps) {
  const { store, refreshData } = useObjects();
  const { linkToDaily } = useLinkToDaily();
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  // Core fields
  const [title, setTitle] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('task');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  // Property values
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [email, setEmail] = useState('');

  // UI state
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  // Sheet states
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [dueDateSheetOpen, setDueDateSheetOpen] = useState(false);
  const [prioritySheetOpen, setPrioritySheetOpen] = useState(false);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [areaSheetOpen, setAreaSheetOpen] = useState(false);
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);
  const [startTimeSheetOpen, setStartTimeSheetOpen] = useState(false);

  // Get project/area names for chip display
  const projectName = useMemo(() => {
    if (!store || !projectId) return undefined;
    const project = store.get(projectId);
    return (project?.properties.name as string) ?? undefined;
  }, [store, projectId]);

  const areaName = useMemo(() => {
    if (!store || !areaId) return undefined;
    const area = store.get(areaId);
    return (area?.properties.name as string) ?? undefined;
  }, [store, areaId]);

  // Focus input when opened
  useEffect(() => {
    if (opened) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
    } else {
      // Reset state when closed
      setTitle('');
      setCaptureType('task');
      setSelectedTemplate(null);
      setDueDate(null);
      setPriority(null);
      setProjectId(null);
      setAreaId(null);
      setTagIds([]);
      setUrl('');
      setStartTime(null);
      setEmail('');
      setMoreOptionsOpen(false);
    }
  }, [opened]);

  // Reset type-specific properties when type changes (keep project/area/tags)
  useEffect(() => {
    setDueDate(null);
    setPriority(null);
    setUrl('');
    setStartTime(null);
    setEmail('');
    setMoreOptionsOpen(false);
    setSelectedTemplate(null);
  }, [captureType]);

  // Get the type ID based on capture type
  const getTypeId = useCallback((): string => {
    switch (captureType) {
      case 'task':
        return BuiltInTypeIds.TASK;
      case 'link':
        return BuiltInTypeIds.LINK;
      case 'meeting':
        return BuiltInTypeIds.MEETING;
      case 'person':
        return BuiltInTypeIds.PERSON;
      case 'project':
        return BuiltInTypeIds.PROJECT;
      case 'area':
        return BuiltInTypeIds.AREA;
      case 'note':
      default:
        return BuiltInTypeIds.NOTE;
    }
  }, [captureType]);

  // Get default properties based on type
  const getDefaultProperties = useCallback((): Record<
    string,
    PropertyValue
  > => {
    const base: Record<string, PropertyValue> = {};

    // Add common relations if set
    if (projectId) base.project = projectId;
    if (areaId) base.area = areaId;
    if (tagIds.length > 0) base.tags = tagIds;

    switch (captureType) {
      case 'task':
        return {
          ...base,
          title: title.trim(),
          status: 'todo',
          priority: priority ?? 'none',
          dueDate: dueDate,
        };
      case 'link':
        return {
          ...base,
          title: title.trim(),
          url: url.trim(),
        };
      case 'meeting':
        return {
          ...base,
          title: title.trim(),
          startTime: startTime ?? Date.now(),
          durationMinutes: '60',
        };
      case 'person': {
        const personProps: Record<string, PropertyValue> = {
          ...base,
          name: title.trim(),
        };
        if (email.trim()) personProps.email = email.trim();
        return personProps;
      }
      case 'project':
        return {
          ...base,
          name: title.trim(),
          status: 'active',
        };
      case 'area': {
        const areaProps: Record<string, PropertyValue> = {
          name: title.trim(),
        };
        // Areas only have tags, no project/area relations
        if (tagIds.length > 0) areaProps.tags = tagIds;
        return areaProps;
      }
      case 'note':
      default:
        return {
          ...base,
          title: title.trim(),
        };
    }
  }, [
    captureType,
    title,
    priority,
    dueDate,
    url,
    startTime,
    email,
    projectId,
    areaId,
    tagIds,
  ]);

  // Create item
  const handleCreate = useCallback(() => {
    if (!store || !title.trim()) return;

    let item;

    if (selectedTemplate) {
      // Create from template, with chip values as overrides
      const result = createFromTemplate(store, selectedTemplate.id, {
        title: title.trim(),
        properties: getDefaultProperties(),
      });
      item = store.get(result.objectId);
    } else {
      // Create without template
      item = store.create({
        typeId: getTypeId(),
        properties: getDefaultProperties(),
        inboxed: true,
      });
    }

    // Auto-link to today's daily note
    if (item) {
      linkToDaily(item);
    }

    refreshData();
    onItemCreated?.(item?.id ?? '');
    onClose();
  }, [
    store,
    title,
    selectedTemplate,
    getTypeId,
    getDefaultProperties,
    linkToDaily,
    refreshData,
    onItemCreated,
    onClose,
  ]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: Template | null) => {
    setSelectedTemplate(template);
  }, []);

  // Get placeholder based on type
  const getPlaceholder = useCallback((): string => {
    switch (captureType) {
      case 'task':
        return 'What needs to be done?';
      case 'link':
        return 'Link title';
      case 'meeting':
        return 'Meeting title';
      case 'person':
        return 'Person name';
      case 'project':
        return 'Project name';
      case 'area':
        return 'Area name';
      case 'note':
      default:
        return 'Quick thought or note';
    }
  }, [captureType]);

  // Format due date for chip display
  const formattedDueDate = useMemo(() => {
    if (!dueDate) return undefined;
    const date = dayjs(dueDate);
    const today = dayjs().startOf('day');
    if (date.isSame(today, 'day')) return 'Today';
    if (date.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
    return date.format('MMM D');
  }, [dueDate]);

  // Get priority info for chip display
  const priorityInfo = useMemo(() => {
    if (!priority || priority === 'none') return null;
    return getPriorityInfo(priority);
  }, [priority]);

  // Format tags count for chip display
  const tagsDisplay = useMemo(() => {
    if (tagIds.length === 0) return undefined;
    return `${tagIds.length} tag${tagIds.length > 1 ? 's' : ''}`;
  }, [tagIds]);

  // Format start time for chip display
  const formattedStartTime = useMemo(() => {
    if (!startTime) return undefined;
    return dayjs(startTime).format('MMM D, h:mm A');
  }, [startTime]);

  // Render property chips based on type
  const renderPropertyChips = () => {
    const chips: React.ReactNode[] = [];

    // Task: Due, Priority, Project, Area, Tags
    if (captureType === 'task') {
      chips.push(
        <PropertyChip
          key="due"
          icon={Calendar}
          label="Due"
          value={formattedDueDate}
          onPress={() => setDueDateSheetOpen(true)}
        />,
        <PropertyChip
          key="priority"
          icon={Flag}
          label="Priority"
          value={priorityInfo?.label}
          color={priorityInfo?.color}
          onPress={() => setPrioritySheetOpen(true)}
        />,
        <PropertyChip
          key="project"
          icon={Folder}
          label="Project"
          value={projectName}
          onPress={() => setProjectSheetOpen(true)}
        />,
        <PropertyChip
          key="area"
          icon={Layers}
          label="Area"
          value={areaName}
          onPress={() => setAreaSheetOpen(true)}
        />,
        <PropertyChip
          key="tags"
          icon={Tag}
          label="Tags"
          value={tagsDisplay}
          onPress={() => setTagsSheetOpen(true)}
        />
      );
    }

    // Note: Project, Area, Tags
    if (captureType === 'note') {
      chips.push(
        <PropertyChip
          key="project"
          icon={Folder}
          label="Project"
          value={projectName}
          onPress={() => setProjectSheetOpen(true)}
        />,
        <PropertyChip
          key="area"
          icon={Layers}
          label="Area"
          value={areaName}
          onPress={() => setAreaSheetOpen(true)}
        />,
        <PropertyChip
          key="tags"
          icon={Tag}
          label="Tags"
          value={tagsDisplay}
          onPress={() => setTagsSheetOpen(true)}
        />
      );
    }

    // Link: Project, Area, Tags (URL auto-shows)
    if (captureType === 'link') {
      chips.push(
        <PropertyChip
          key="project"
          icon={Folder}
          label="Project"
          value={projectName}
          onPress={() => setProjectSheetOpen(true)}
        />,
        <PropertyChip
          key="area"
          icon={Layers}
          label="Area"
          value={areaName}
          onPress={() => setAreaSheetOpen(true)}
        />,
        <PropertyChip
          key="tags"
          icon={Tag}
          label="Tags"
          value={tagsDisplay}
          onPress={() => setTagsSheetOpen(true)}
        />
      );
    }

    // Meeting: Start Time, Project
    if (captureType === 'meeting') {
      chips.push(
        <PropertyChip
          key="startTime"
          icon={Clock}
          label="Start Time"
          value={formattedStartTime}
          onPress={() => setStartTimeSheetOpen(true)}
        />,
        <PropertyChip
          key="project"
          icon={Folder}
          label="Project"
          value={projectName}
          onPress={() => setProjectSheetOpen(true)}
        />
      );
    }

    // Person: Email
    if (captureType === 'person') {
      chips.push(
        <PropertyChip
          key="email"
          icon={Mail}
          label="Email"
          value={email || undefined}
          onPress={() => setMoreOptionsOpen(true)}
        />
      );
    }

    // Project: Area, Tags
    if (captureType === 'project') {
      chips.push(
        <PropertyChip
          key="area"
          icon={Layers}
          label="Area"
          value={areaName}
          onPress={() => setAreaSheetOpen(true)}
        />,
        <PropertyChip
          key="tags"
          icon={Tag}
          label="Tags"
          value={tagsDisplay}
          onPress={() => setTagsSheetOpen(true)}
        />
      );
    }

    // Area: Tags only
    if (captureType === 'area') {
      chips.push(
        <PropertyChip
          key="tags"
          icon={Tag}
          label="Tags"
          value={tagsDisplay}
          onPress={() => setTagsSheetOpen(true)}
        />
      );
    }

    return chips;
  };

  // Check if more options should be available
  const hasMoreOptions = captureType === 'person' || captureType === 'meeting';

  // Animation variants for the drawer
  const drawerVariants = {
    hidden: {
      y: '100%',
      opacity: reducedMotion ? 0 : 1,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        damping: 30,
        stiffness: 400,
        mass: 0.8,
      },
    },
    exit: {
      y: '100%',
      opacity: reducedMotion ? 0 : 1,
      transition: {
        type: 'spring' as const,
        damping: 35,
        stiffness: 400,
        mass: 0.8,
      },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  return (
    <>
      <Portal>
        <AnimatePresence>
          {opened && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  backdropFilter: 'blur(2px)',
                  WebkitBackdropFilter: 'blur(2px)',
                  zIndex: 999,
                }}
              />

              {/* Drawer - positioned at bottom, above tab bar */}
              <motion.div
                key="drawer"
                variants={drawerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  // Position above the tab bar (49px) + safe area
                  bottom: 'calc(49px + var(--safe-area-inset-bottom, 0px))',
                  backgroundColor: 'var(--surface-paper)',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  maxHeight: '70vh',
                  overflow: 'hidden',
                }}
              >
                {/* Drag handle */}
                <Box
                  py="xs"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <Box
                    style={{
                      width: 36,
                      height: 4,
                      backgroundColor: 'var(--mantine-color-gray-3)',
                      borderRadius: 2,
                    }}
                  />
                </Box>

                {/* Header */}
                <Group
                  justify="space-between"
                  px="md"
                  pb="xs"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <Text size="md" fw={600}>
                    Quick Capture
                  </Text>
                  <UnstyledButton
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                    }}
                  >
                    <X
                      size={18}
                      style={{ color: 'var(--mantine-color-gray-5)' }}
                    />
                  </UnstyledButton>
                </Group>

                {/* Content */}
                <Box px="md" py="md">
                  <Stack gap="md">
                    {/* Type selector - icon-only */}
                    <ScrollArea type="never" scrollbarSize={0} offsetScrollbars>
                      <Group gap="xs" wrap="nowrap" justify="center">
                        {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                          const isActive = captureType === value;
                          return (
                            <UnstyledButton
                              key={value}
                              onClick={() => setCaptureType(value)}
                              aria-label={label}
                              style={{
                                width: 44,
                                height: 44,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 8,
                                backgroundColor: isActive
                                  ? 'var(--mantine-color-ember-0)'
                                  : 'transparent',
                                border: isActive
                                  ? '1px solid var(--mantine-color-ember-3)'
                                  : '1px solid transparent',
                                transition: 'all 150ms ease',
                              }}
                            >
                              <Icon
                                size={20}
                                style={{
                                  color: isActive
                                    ? 'var(--mantine-color-ember-5)'
                                    : 'var(--mantine-color-gray-5)',
                                }}
                              />
                            </UnstyledButton>
                          );
                        })}
                      </Group>
                    </ScrollArea>

                    {/* Template selector */}
                    <UnstyledButton
                      onClick={() => setTemplatePickerOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--surface-paper)',
                      }}
                    >
                      <FileText
                        size={16}
                        style={{
                          color: selectedTemplate
                            ? 'var(--mantine-color-ember-5)'
                            : 'var(--mantine-color-gray-5)',
                        }}
                      />
                      <Text size="sm" style={{ flex: 1 }}>
                        {selectedTemplate
                          ? selectedTemplate.name
                          : 'No template'}
                      </Text>
                      <ChevronRight
                        size={14}
                        style={{ color: 'var(--mantine-color-gray-4)' }}
                      />
                    </UnstyledButton>

                    {/* Title input */}
                    <TextInput
                      ref={inputRef}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={getPlaceholder()}
                      size="md"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && title.trim()) {
                          handleCreate();
                        }
                      }}
                    />

                    {/* URL input for Link type */}
                    {captureType === 'link' && (
                      <TextInput
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        leftSection={<Link2 size={16} />}
                        size="md"
                      />
                    )}

                    {/* Property chips row */}
                    <ScrollArea type="never" scrollbarSize={0}>
                      <Group gap="xs" wrap="nowrap" py={4}>
                        {renderPropertyChips()}
                      </Group>
                    </ScrollArea>

                    {/* More options section (for Person/Meeting) */}
                    {hasMoreOptions && (
                      <Box>
                        <UnstyledButton
                          onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 0',
                            width: '100%',
                          }}
                        >
                          {moreOptionsOpen ? (
                            <ChevronDown
                              size={14}
                              style={{ color: 'var(--mantine-color-gray-5)' }}
                            />
                          ) : (
                            <ChevronRight
                              size={14}
                              style={{ color: 'var(--mantine-color-gray-5)' }}
                            />
                          )}
                          <Text size="xs" c="dimmed" fw={500}>
                            More options
                          </Text>
                        </UnstyledButton>

                        <Collapse in={moreOptionsOpen}>
                          <Stack gap="sm" py="sm">
                            {captureType === 'person' && (
                              <TextInput
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                leftSection={<Mail size={16} />}
                                size="md"
                              />
                            )}
                            {captureType === 'meeting' && (
                              <>
                                <PropertyChip
                                  icon={Layers}
                                  label="Area"
                                  value={areaName}
                                  onPress={() => setAreaSheetOpen(true)}
                                />
                                <PropertyChip
                                  icon={Tag}
                                  label="Tags"
                                  value={tagsDisplay}
                                  onPress={() => setTagsSheetOpen(true)}
                                />
                              </>
                            )}
                          </Stack>
                        </Collapse>
                      </Box>
                    )}

                    {/* Action buttons */}
                    <Group gap="sm">
                      <Button
                        variant="light"
                        color="gray"
                        size="md"
                        flex={1}
                        onClick={onClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="ember"
                        size="md"
                        flex={2}
                        onClick={handleCreate}
                        disabled={!title.trim()}
                      >
                        Capture
                      </Button>
                    </Group>
                  </Stack>
                </Box>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>

      {/* Picker sheets */}
      <TemplatePickerSheet
        opened={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        targetTypeId={getTypeId()}
        onSelectTemplate={handleTemplateSelect}
      />

      <DueDateSheet
        opened={dueDateSheetOpen}
        onClose={() => setDueDateSheetOpen(false)}
        value={dueDate}
        onSelect={setDueDate}
      />

      <PriorityPickerSheet
        opened={prioritySheetOpen}
        onClose={() => setPrioritySheetOpen(false)}
        value={priority}
        onSelect={setPriority}
      />

      <ProjectPickerSheet
        opened={projectSheetOpen}
        onClose={() => setProjectSheetOpen(false)}
        value={projectId}
        onSave={setProjectId}
      />

      <AreaPickerSheet
        opened={areaSheetOpen}
        onClose={() => setAreaSheetOpen(false)}
        value={areaId}
        onSave={setAreaId}
      />

      <TagPickerSheet
        opened={tagsSheetOpen}
        onClose={() => setTagsSheetOpen(false)}
        value={tagIds}
        onSave={setTagIds}
      />

      {/* Start time uses DueDateSheet for now */}
      <DueDateSheet
        opened={startTimeSheetOpen}
        onClose={() => setStartTimeSheetOpen(false)}
        value={startTime}
        onSelect={setStartTime}
      />
    </>
  );
}
