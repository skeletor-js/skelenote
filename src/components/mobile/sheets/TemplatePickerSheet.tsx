/**
 * Template Picker Sheet
 * Bottom sheet for selecting a template when creating new objects
 */

import { useMemo, useCallback } from 'react';
import {
  Stack,
  Text,
  UnstyledButton,
  Center,
  Loader,
  Badge,
} from '@mantine/core';
import { FileText, Layout } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useObjects, useTypeRegistry } from '@/contexts';
import { getTemplatesForType, type Template } from '@/lib/templates';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji, type IconName } from '@/lib/icons';

interface TemplatePickerSheetProps {
  opened: boolean;
  onClose: () => void;
  targetTypeId: string;
  onSelectTemplate: (template: Template | null) => void;
}

export function TemplatePickerSheet({
  opened,
  onClose,
  targetTypeId,
  onSelectTemplate,
}: TemplatePickerSheetProps) {
  const { store, isLoading } = useObjects();
  const typeRegistry = useTypeRegistry();

  // Get templates for the target type
  const templates = useMemo(() => {
    if (!store) return [];
    return getTemplatesForType(store, targetTypeId);
  }, [store, targetTypeId]);

  // Get type info
  const typeDef = useMemo(
    () => typeRegistry.get(targetTypeId),
    [typeRegistry, targetTypeId]
  );

  // Get type icon
  const getTypeIcon = useCallback((): IconName => {
    if (!typeDef?.icon) return 'file';
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  }, [typeDef]);

  // Handle template selection
  const handleSelect = useCallback(
    (template: Template | null) => {
      onSelectTemplate(template);
      onClose();
    },
    [onSelectTemplate, onClose]
  );

  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title="Choose Template"
      size="md"
    >
      <Stack gap="sm">
        {isLoading ? (
          <Center py="xl">
            <Loader size="sm" color="ember" />
          </Center>
        ) : templates.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <Layout
              size={40}
              style={{ color: 'var(--mantine-color-gray-4)' }}
            />
            <Text size="sm" c="dimmed" ta="center">
              No templates for {typeDef?.name || 'this type'}
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Create templates on desktop to use them here
            </Text>
          </Stack>
        ) : (
          <>
            {/* Blank option */}
            <UnstyledButton
              onClick={() => handleSelect(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--surface-paper)',
              }}
            >
              <Icon
                name={getTypeIcon()}
                size={20}
                style={{ color: 'var(--mantine-color-gray-5)' }}
              />
              <Stack gap={0} style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  Blank {typeDef?.name || 'Item'}
                </Text>
                <Text size="xs" c="dimmed">
                  Start fresh without a template
                </Text>
              </Stack>
            </UnstyledButton>

            {/* Template options */}
            {templates.map((template) => (
              <UnstyledButton
                key={template.id}
                onClick={() => handleSelect(template)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--surface-paper)',
                }}
              >
                <FileText
                  size={20}
                  style={{ color: 'var(--mantine-color-ember-5)' }}
                />
                <Stack gap={0} style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    {template.name}
                  </Text>
                  {template.description && (
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {template.description}
                    </Text>
                  )}
                </Stack>
                {template.hasContent && (
                  <Badge size="xs" variant="light" color="gray">
                    Content
                  </Badge>
                )}
              </UnstyledButton>
            ))}
          </>
        )}
      </Stack>
    </BottomSheet>
  );
}
