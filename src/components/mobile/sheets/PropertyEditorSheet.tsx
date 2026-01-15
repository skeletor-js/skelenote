/**
 * Property Editor Sheet
 * Bottom sheet for editing object properties on mobile
 * Supports: text, number, date, select, checkbox, url, email, phone, relation, recurrence
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Stack,
  Text,
  UnstyledButton,
  TextInput,
  Group,
  Badge,
  ActionIcon,
  Box,
} from '@mantine/core';
import { Check, ExternalLink, Mail, Phone, X, Plus } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { DatePickerInput } from '@mantine/dates';
import { open } from '@tauri-apps/plugin-shell';
import dayjs from 'dayjs';
import { useObjects } from '@/contexts';
import type { PropertyDefinition, PropertyValue } from '@/lib/types';
import { formatRecurrenceDisplay } from '@/components/object/editors/RecurrenceEditor';

/**
 * Wrapper for DatePickerInput that handles timestamp <-> string conversion
 * Mantine 8 DatePickerInput expects string values in YYYY-MM-DD format
 */
function DatePickerInputWrapper({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const dateValue = useMemo(() => {
    if (!value) return null;
    return dayjs(value).format('YYYY-MM-DD');
  }, [value]);

  const handleChange = (dateString: string | null) => {
    if (!dateString) {
      onChange(null);
      return;
    }
    const parsed = dayjs(dateString);
    if (!parsed.isValid()) {
      onChange(null);
      return;
    }
    // Set to midnight local time
    onChange(parsed.startOf('day').valueOf());
  };

  return (
    <DatePickerInput
      value={dateValue}
      onChange={handleChange}
      placeholder="Select date"
      size="md"
      valueFormat="MMM D, YYYY"
      clearable
    />
  );
}

/**
 * URL validation
 */
function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Email validation
 */
function isValidEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface PropertyEditorSheetProps {
  opened: boolean;
  onClose: () => void;
  property: PropertyDefinition | null;
  value: PropertyValue | null;
  onSave: (value: PropertyValue) => void;
  onOpenRelationPicker?: () => void;
  onOpenRecurrenceSheet?: () => void;
}

export function PropertyEditorSheet({
  opened,
  onClose,
  property,
  value,
  onSave,
  onOpenRelationPicker,
  onOpenRecurrenceSheet,
}: PropertyEditorSheetProps) {
  const { store } = useObjects();
  const [editValue, setEditValue] = useState<PropertyValue | null>(null);
  const [urlError, setUrlError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  // Reset edit value when property changes
  useEffect(() => {
    setEditValue(value);
    setUrlError(false);
    setEmailError(false);
  }, [value, property]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(editValue ?? null);
    onClose();
  }, [editValue, onSave, onClose]);

  // Handle URL open
  const handleOpenUrl = useCallback(async () => {
    const url = editValue as string;
    if (url && isValidUrl(url)) {
      await open(url);
    }
  }, [editValue]);

  // Handle email send
  const handleSendEmail = useCallback(async () => {
    const email = editValue as string;
    if (email && isValidEmail(email)) {
      await open(`mailto:${email}`);
    }
  }, [editValue]);

  // Handle phone call
  const handleCallPhone = useCallback(async () => {
    const phone = editValue as string;
    if (phone) {
      await open(`tel:${phone}`);
    }
  }, [editValue]);

  // Get relation object names
  const getRelationObjectName = useCallback(
    (objectId: string): string => {
      if (!store) return objectId.substring(0, 8);
      const obj = store.get(objectId);
      return (obj?.properties.title ??
        obj?.properties.name ??
        'Unknown') as string;
    },
    [store]
  );

  // Remove relation value
  const handleRemoveRelation = useCallback(
    (objectId: string) => {
      if (property?.multiple) {
        const values = (editValue as string[]) ?? [];
        setEditValue(values.filter((id) => id !== objectId));
      } else {
        setEditValue(null);
      }
    },
    [property, editValue]
  );

  if (!property) return null;

  const options = property.config?.options;
  const isUrlValid =
    !urlError && (editValue ? isValidUrl(editValue as string) : true);
  const isEmailValid =
    !emailError && (editValue ? isValidEmail(editValue as string) : true);

  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title={property.name}
      size="md"
    >
      <Stack gap="md">
        {/* Text input */}
        {property.type === 'text' && (
          <TextInput
            value={(editValue as string) ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={`Enter ${property.name.toLowerCase()}`}
            size="md"
          />
        )}

        {/* Number input */}
        {property.type === 'number' && (
          <TextInput
            type="number"
            value={(editValue as number)?.toString() ?? ''}
            onChange={(e) =>
              setEditValue(e.target.value ? Number(e.target.value) : null)
            }
            placeholder={`Enter ${property.name.toLowerCase()}`}
            size="md"
          />
        )}

        {/* URL input with validation and open action */}
        {property.type === 'url' && (
          <TextInput
            type="url"
            value={(editValue as string) ?? ''}
            onChange={(e) => {
              setEditValue(e.target.value || null);
              setUrlError(!isValidUrl(e.target.value));
            }}
            placeholder="https://..."
            size="md"
            error={!isUrlValid && 'Invalid URL'}
            rightSection={
              editValue && isUrlValid ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={handleOpenUrl}
                >
                  <ExternalLink size={16} />
                </ActionIcon>
              ) : undefined
            }
          />
        )}

        {/* Email input with validation and mailto action */}
        {property.type === 'email' && (
          <TextInput
            type="email"
            value={(editValue as string) ?? ''}
            onChange={(e) => {
              setEditValue(e.target.value || null);
              setEmailError(!isValidEmail(e.target.value));
            }}
            placeholder="email@example.com"
            size="md"
            error={!isEmailValid && 'Invalid email'}
            rightSection={
              editValue && isEmailValid ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={handleSendEmail}
                >
                  <Mail size={16} />
                </ActionIcon>
              ) : undefined
            }
          />
        )}

        {/* Phone input with call action */}
        {property.type === 'phone' && (
          <TextInput
            type="tel"
            value={(editValue as string) ?? ''}
            onChange={(e) => setEditValue(e.target.value || null)}
            placeholder="+1 (555) 123-4567"
            size="md"
            rightSection={
              editValue ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={handleCallPhone}
                >
                  <Phone size={16} />
                </ActionIcon>
              ) : undefined
            }
          />
        )}

        {/* Date picker - Mantine 8 uses string values in YYYY-MM-DD format */}
        {property.type === 'date' && (
          <DatePickerInputWrapper
            value={editValue as number | null}
            onChange={(timestamp) => setEditValue(timestamp)}
          />
        )}

        {/* Select options */}
        {property.type === 'select' && options && (
          <Stack gap="xs">
            {options.map((option: string) => {
              const isSelected = editValue === option;
              return (
                <UnstyledButton
                  key={option}
                  onClick={() => {
                    setEditValue(option);
                    onSave(option);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 8,
                    backgroundColor: isSelected
                      ? 'var(--mantine-color-ember-0)'
                      : 'var(--mantine-color-gray-0)',
                  }}
                >
                  {isSelected && (
                    <Check
                      size={18}
                      style={{ color: 'var(--mantine-color-ember-5)' }}
                    />
                  )}
                  <Text size="sm" style={{ marginLeft: isSelected ? 0 : 30 }}>
                    {option
                      .replace(/-/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Stack>
        )}

        {/* Relation property - display with object names */}
        {property.type === 'relation' && (
          <Stack gap="sm">
            {/* Current relations */}
            {(
              (property.multiple
                ? ((editValue as string[]) ?? [])
                : editValue
                  ? [editValue as string]
                  : []) as string[]
            ).length > 0 && (
              <Group gap="xs" wrap="wrap">
                {(
                  (property.multiple
                    ? ((editValue as string[]) ?? [])
                    : editValue
                      ? [editValue as string]
                      : []) as string[]
                ).map((id: string) => (
                  <Badge
                    key={id}
                    variant="light"
                    color="ember"
                    size="lg"
                    rightSection={
                      <ActionIcon
                        variant="transparent"
                        size="xs"
                        onClick={() => handleRemoveRelation(id)}
                      >
                        <X size={12} />
                      </ActionIcon>
                    }
                  >
                    {getRelationObjectName(id)}
                  </Badge>
                ))}
              </Group>
            )}

            {/* Add relation button */}
            <UnstyledButton
              onClick={() => {
                onOpenRelationPicker?.();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <Plus
                size={18}
                style={{ color: 'var(--mantine-color-gray-6)' }}
              />
              <Text size="sm" c="dimmed">
                Add {property.name.toLowerCase()}
              </Text>
            </UnstyledButton>
          </Stack>
        )}

        {/* Recurrence property - display summary and open editor */}
        {property.type === 'recurrence' && (
          <Stack gap="sm">
            <Box
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <Text size="sm">
                {formatRecurrenceDisplay(editValue as string | null)}
              </Text>
            </Box>
            <UnstyledButton
              onClick={() => {
                onOpenRecurrenceSheet?.();
              }}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: 'var(--mantine-color-ember-0)',
                textAlign: 'center',
              }}
            >
              <Text size="sm" c="ember" fw={500}>
                Edit recurrence
              </Text>
            </UnstyledButton>
          </Stack>
        )}

        {/* Checkbox */}
        {property.type === 'checkbox' && (
          <Group gap="xs">
            <UnstyledButton
              onClick={() => {
                setEditValue(true);
                onSave(true);
                onClose();
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor:
                  editValue === true
                    ? 'var(--mantine-color-ember-0)'
                    : 'var(--mantine-color-gray-0)',
                textAlign: 'center',
              }}
            >
              <Text size="sm" fw={editValue === true ? 600 : 400}>
                Yes
              </Text>
            </UnstyledButton>
            <UnstyledButton
              onClick={() => {
                setEditValue(false);
                onSave(false);
                onClose();
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor:
                  editValue === false
                    ? 'var(--mantine-color-ember-0)'
                    : 'var(--mantine-color-gray-0)',
                textAlign: 'center',
              }}
            >
              <Text size="sm" fw={editValue === false ? 600 : 400}>
                No
              </Text>
            </UnstyledButton>
          </Group>
        )}

        {/* Save button for text-based inputs (not select/checkbox which auto-save) */}
        {['text', 'number', 'url', 'email', 'phone', 'date'].includes(
          property.type
        ) && (
          <UnstyledButton
            onClick={handleSave}
            disabled={property.type === 'url' && !isUrlValid}
            style={{
              padding: '16px',
              borderRadius: 8,
              backgroundColor:
                property.type === 'url' && !isUrlValid
                  ? 'var(--mantine-color-gray-3)'
                  : 'var(--mantine-color-ember-5)',
              textAlign: 'center',
            }}
          >
            <Text
              size="md"
              fw={600}
              c={property.type === 'url' && !isUrlValid ? 'dimmed' : 'white'}
            >
              Save
            </Text>
          </UnstyledButton>
        )}

        {/* Clear value button for optional properties */}
        {!property.required &&
          editValue !== null &&
          editValue !== undefined && (
            <UnstyledButton
              onClick={() => {
                onSave(null);
                onClose();
              }}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <Text size="sm" c="dimmed">
                Clear value
              </Text>
            </UnstyledButton>
          )}
      </Stack>
    </BottomSheet>
  );
}
