/**
 * Quick Add Task Sheet
 * Bottom sheet for quickly adding new tasks on mobile
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Stack,
  TextInput,
  Group,
  Button,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { FileText, ChevronRight } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { TemplatePickerSheet } from './TemplatePickerSheet';
import { useObjects } from '@/contexts';
import { useLinkToDaily } from '@/hooks';
import { BuiltInTypeIds } from '@/lib/types';
import { createFromTemplate, type Template } from '@/lib/templates';

interface QuickAddTaskSheetProps {
  opened: boolean;
  onClose: () => void;
  onTaskCreated?: (taskId: string) => void;
}

export function QuickAddTaskSheet({
  opened,
  onClose,
  onTaskCreated,
}: QuickAddTaskSheetProps) {
  const { store, refreshData } = useObjects();
  const { linkToDaily } = useLinkToDaily();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<'today' | 'tomorrow' | 'week' | null>(
    null
  );
  const [priority, setPriority] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (opened) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setTitle('');
      setDueDate(null);
      setPriority(null);
      setSelectedTemplate(null);
    }
  }, [opened]);

  // Calculate due date timestamp
  const getDueDateTimestamp = useCallback((): number | null => {
    if (!dueDate) return null;
    const date = new Date();
    date.setHours(23, 59, 59, 999);

    if (dueDate === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    } else if (dueDate === 'week') {
      date.setDate(date.getDate() + 7);
    }

    return date.getTime();
  }, [dueDate]);

  // Create task
  const handleCreate = useCallback(() => {
    if (!store || !title.trim()) return;

    const properties = {
      title: title.trim(),
      status: 'todo',
      dueDate: getDueDateTimestamp(),
      priority: priority ?? 'none',
    };

    let task;

    if (selectedTemplate) {
      // Create from template
      const result = createFromTemplate(store, selectedTemplate.id, {
        title: title.trim(),
        properties,
      });
      task = store.get(result.objectId);
    } else {
      // Create without template
      task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties,
        inboxed: false,
      });
    }

    // Auto-link to today's daily note (matches desktop behavior)
    if (task) {
      linkToDaily(task);
    }

    refreshData();
    onTaskCreated?.(task?.id ?? '');
    onClose();
  }, [
    store,
    title,
    getDueDateTimestamp,
    priority,
    selectedTemplate,
    linkToDaily,
    refreshData,
    onTaskCreated,
    onClose,
  ]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: Template | null) => {
    setSelectedTemplate(template);
  }, []);

  return (
    <>
      <BottomSheet opened={opened} onClose={onClose} title="New Task" size="md">
        <Stack gap="md">
          {/* Template selector */}
          <UnstyledButton
            onClick={() => setTemplatePickerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-paper)',
            }}
          >
            <FileText
              size={18}
              style={{
                color: selectedTemplate
                  ? 'var(--mantine-color-ember-5)'
                  : 'var(--mantine-color-gray-5)',
              }}
            />
            <Text size="sm" style={{ flex: 1 }}>
              {selectedTemplate ? selectedTemplate.name : 'No template'}
            </Text>
            <ChevronRight
              size={16}
              style={{ color: 'var(--mantine-color-gray-4)' }}
            />
          </UnstyledButton>

          {/* Title input */}
          <TextInput
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            size="md"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) {
                handleCreate();
              }
            }}
          />

          {/* Due date quick options */}
          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={500}>
              Due Date
            </Text>
            <Group gap="xs">
              {(['today', 'tomorrow', 'week'] as const).map((option) => (
                <Button
                  key={option}
                  variant={dueDate === option ? 'filled' : 'light'}
                  color={dueDate === option ? 'ember' : 'gray'}
                  size="sm"
                  onClick={() => setDueDate(dueDate === option ? null : option)}
                >
                  {option === 'today' && 'Today'}
                  {option === 'tomorrow' && 'Tomorrow'}
                  {option === 'week' && '+1 Week'}
                </Button>
              ))}
            </Group>
          </Stack>

          {/* Priority quick options */}
          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={500}>
              Priority
            </Text>
            <Group gap="xs">
              {(['low', 'medium', 'high', 'urgent'] as const).map((option) => (
                <Button
                  key={option}
                  variant={priority === option ? 'filled' : 'light'}
                  color={priority === option ? 'ember' : 'gray'}
                  size="sm"
                  onClick={() =>
                    setPriority(priority === option ? null : option)
                  }
                  tt="capitalize"
                >
                  {option}
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
            disabled={!title.trim()}
          >
            Create Task
          </Button>
        </Stack>
      </BottomSheet>

      {/* Template Picker */}
      <TemplatePickerSheet
        opened={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        targetTypeId={BuiltInTypeIds.TASK}
        onSelectTemplate={handleTemplateSelect}
      />
    </>
  );
}
