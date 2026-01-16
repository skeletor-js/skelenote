/**
 * Quick Create Project Sheet
 * Bottom sheet for quickly creating new projects on mobile
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Stack, TextInput, Group, Button, Text } from '@mantine/core';
import { BottomSheet } from '../primitives';
import { useObjects } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';
import type { ProjectStatus } from '@/lib/types/built-in-types';

interface QuickCreateProjectSheetProps {
  opened: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on-hold', label: 'On Hold' },
];

export function QuickCreateProjectSheet({
  opened,
  onClose,
  onProjectCreated,
}: QuickCreateProjectSheetProps) {
  const { store, refreshData } = useObjects();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (opened) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setName('');
      setStatus('active');
    }
  }, [opened]);

  // Create project
  const handleCreate = useCallback(() => {
    if (!store || !name.trim()) return;

    const project = store.create({
      typeId: BuiltInTypeIds.PROJECT,
      properties: {
        name: name.trim(),
        status,
      },
      inboxed: false,
    });

    refreshData();
    onProjectCreated?.(project.id);
    onClose();
  }, [store, name, status, refreshData, onProjectCreated, onClose]);

  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title="New Project"
      size="md"
    >
      <Stack gap="md">
        {/* Name input */}
        <TextInput
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          size="md"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              handleCreate();
            }
          }}
        />

        {/* Status quick options */}
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Status
          </Text>
          <Group gap="xs">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={status === option.value ? 'filled' : 'light'}
                color={status === option.value ? 'ember' : 'gray'}
                size="sm"
                onClick={() => setStatus(option.value)}
              >
                {option.label}
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
          disabled={!name.trim()}
        >
          Create Project
        </Button>
      </Stack>
    </BottomSheet>
  );
}
