/**
 * Quick Capture Sheet
 * Bottom sheet for quickly capturing notes, tasks, or links on mobile
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Stack,
  TextInput,
  Group,
  Button,
  SegmentedControl,
  UnstyledButton,
  Text,
} from '@mantine/core';
import { FileText, ChevronRight } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { TemplatePickerSheet } from './TemplatePickerSheet';
import { useObjects } from '@/contexts';
import { BuiltInTypeIds, type PropertyValue } from '@/lib/types';
import { createFromTemplate, type Template } from '@/lib/templates';

type CaptureType = 'note' | 'task' | 'link';

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
  const [title, setTitle] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('note');
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
      // Reset state when closed
      setTitle('');
      setCaptureType('note');
      setSelectedTemplate(null);
    }
  }, [opened]);

  // Reset template when capture type changes
  useEffect(() => {
    setSelectedTemplate(null);
  }, [captureType]);

  // Get the type ID based on capture type
  const getTypeId = useCallback((): string => {
    switch (captureType) {
      case 'task':
        return BuiltInTypeIds.TASK;
      case 'link':
        return BuiltInTypeIds.LINK;
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
    const baseProps: Record<string, PropertyValue> = {
      title: title.trim(),
    };

    switch (captureType) {
      case 'task':
        return {
          ...baseProps,
          status: 'todo',
          priority: 'none',
        };
      case 'link':
        return {
          ...baseProps,
          url: '',
        };
      case 'note':
      default:
        return baseProps;
    }
  }, [captureType, title]);

  // Create item
  const handleCreate = useCallback(() => {
    if (!store || !title.trim()) return;

    let itemId: string;

    if (selectedTemplate) {
      // Create from template
      const result = createFromTemplate(store, selectedTemplate.id, {
        title: title.trim(),
        properties: getDefaultProperties(),
      });
      itemId = result.objectId;
    } else {
      // Create without template
      const item = store.create({
        typeId: getTypeId(),
        properties: getDefaultProperties(),
        inboxed: true, // Items go to inbox for processing
      });
      itemId = item.id;
    }

    refreshData();
    onItemCreated?.(itemId);
    onClose();
  }, [
    store,
    title,
    selectedTemplate,
    getTypeId,
    getDefaultProperties,
    refreshData,
    onItemCreated,
    onClose,
  ]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: Template | null) => {
    setSelectedTemplate(template);
  }, []);

  return (
    <>
      <BottomSheet
        opened={opened}
        onClose={onClose}
        title="Quick Capture"
        size="auto"
      >
        <Stack gap="md">
          {/* Type selector */}
          <SegmentedControl
            value={captureType}
            onChange={(value) => setCaptureType(value as CaptureType)}
            data={[
              { label: 'Note', value: 'note' },
              { label: 'Task', value: 'task' },
              { label: 'Link', value: 'link' },
            ]}
            fullWidth
            color="ember"
          />

          {/* Template selector (only for notes) */}
          {captureType === 'note' && (
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
          )}

          {/* Title input */}
          <TextInput
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              captureType === 'task'
                ? 'What needs to be done?'
                : captureType === 'link'
                  ? 'Link title or description'
                  : 'Quick thought or note'
            }
            size="md"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) {
                handleCreate();
              }
            }}
          />

          {/* Action buttons */}
          <Group gap="sm">
            <Button
              variant="light"
              color="gray"
              size="lg"
              flex={1}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              color="ember"
              size="lg"
              flex={2}
              onClick={handleCreate}
              disabled={!title.trim()}
            >
              Capture
            </Button>
          </Group>
        </Stack>
      </BottomSheet>

      {/* Template Picker */}
      <TemplatePickerSheet
        opened={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        targetTypeId={getTypeId()}
        onSelectTemplate={handleTemplateSelect}
      />
    </>
  );
}
