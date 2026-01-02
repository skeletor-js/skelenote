/**
 * QuickCapture - Modal for quickly capturing new objects
 */

import { useState, useCallback, useEffect } from 'react';
import { Modal, Stack, Group, Text, Button, Kbd } from '@mantine/core';
import { useObjects, useNavigation } from '@/contexts';
import { useLinkToDaily, useTemplates } from '@/hooks';
import { TypeSelector, type CaptureType } from './TypeSelector';
import { CaptureForm } from './CaptureForm';
import { TemplatePicker } from '@/components/templates';
import type { Template } from '@/lib/templates';

/**
 * Validate if a string is a valid URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

interface QuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCapture({ isOpen, onClose }: QuickCaptureProps) {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();
  const { linkToDaily } = useLinkToDaily();
  const { templates, createObject: createFromTemplate } = useTemplates();
  const [selectedType, setSelectedType] = useState<CaptureType>('task');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType('task');
      setFormValues({});
      setShowTemplatePicker(false);
    }
  }, [isOpen]);

  // Handle type selection - open template picker when template is selected
  const handleTypeSelect = useCallback((type: CaptureType) => {
    setSelectedType(type);
    if (type === 'template') {
      setShowTemplatePicker(true);
    }
  }, []);

  // Handle template selection from picker
  const handleTemplateSelect = useCallback(
    (template: Template) => {
      setShowTemplatePicker(false);

      // Create object from template
      const objectId = createFromTemplate(template.id, { navigate: false });
      if (objectId && store) {
        // Link to today's daily note
        const newObject = store.get(objectId);
        if (newObject) {
          linkToDaily(newObject);
        }
        refreshData();
        onClose();
        navigateToObject(objectId);
      }
    },
    [createFromTemplate, store, linkToDaily, refreshData, onClose, navigateToObject]
  );

  // Handle template picker close
  const handleTemplatePickerClose = useCallback(() => {
    setShowTemplatePicker(false);
    // Reset to task type when closing without selection
    setSelectedType('task');
  }, []);

  // Handle form field change
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Check if form is valid
  const isValid = useCallback(() => {
    if (selectedType === 'task' || selectedType === 'note') {
      return (formValues.title?.trim() ?? '') !== '';
    }
    if (selectedType === 'link') {
      const url = formValues.url?.trim() ?? '';
      return url !== '' && isValidUrl(url);
    }
    return false;
  }, [selectedType, formValues]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!store || !isValid()) return;

    let properties: Record<string, string | number | boolean | string[] | null> = {};

    if (selectedType === 'task') {
      properties = {
        title: formValues.title?.trim() ?? 'Untitled Task',
        status: 'todo',
      };
    } else if (selectedType === 'note') {
      properties = {
        title: formValues.title?.trim() ?? 'Untitled Note',
      };
    } else if (selectedType === 'link') {
      properties = {
        url: formValues.url?.trim() ?? '',
        title: formValues.title?.trim() || formValues.url?.trim() || 'Untitled Link',
      };
    }

    const newObject = store.create({
      typeId: selectedType,
      properties,
      inboxed: true,
    });

    // Link to today's daily note
    linkToDaily(newObject);

    refreshData();
    onClose();
    navigateToObject(newObject.id);
  }, [store, selectedType, formValues, isValid, linkToDaily, refreshData, onClose, navigateToObject]);

  return (
    <>
      <Modal
        opened={isOpen}
        onClose={onClose}
        title="Quick Capture"
        centered
        size="md"
      >
        <Stack gap="lg">
          <TypeSelector
            selectedType={selectedType}
            onSelectType={handleTypeSelect}
            hideTemplate={templates.length === 0}
          />

          {selectedType !== 'template' && (
            <CaptureForm
              type={selectedType}
              values={formValues}
              onChange={handleFieldChange}
              onSubmit={handleSubmit}
            />
          )}

          <Group justify="space-between" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Group gap={4}>
              <Text size="xs" c="dimmed">Press</Text>
              <Kbd size="xs">Enter</Kbd>
              <Text size="xs" c="dimmed">to save</Text>
            </Group>
            <Group gap="sm">
              <Button variant="subtle" color="gray" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!isValid()}>
                Save
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* Template Picker */}
      <TemplatePicker
        isOpen={showTemplatePicker}
        onClose={handleTemplatePickerClose}
        onSelect={handleTemplateSelect}
      />
    </>
  );
}
