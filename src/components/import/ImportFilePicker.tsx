/**
 * Import File Picker (Step 2)
 *
 * File selection with source-specific instructions.
 * Supports both file selection and folder selection (for Obsidian vaults).
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Text,
  Alert,
  FileInput,
  Button,
  Group,
  TextInput,
} from '@mantine/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Icon } from '@/components/ui/Icon';
import { getSourceConfig, type ImportSource } from './types';
import classes from './ImportWizard.module.css';

interface ImportFilePickerProps {
  source: ImportSource;
  onFilesSelected: (files: File[]) => void;
  onFolderSelected?: (path: string) => void;
  onBack: () => void;
}

export function ImportFilePicker({
  source,
  onFilesSelected,
  onFolderSelected,
  onBack,
}: ImportFilePickerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const config = getSourceConfig(source);

  // For Obsidian, we use folder selection
  const useFolderPicker = source === 'obsidian';

  const handleFileChange = (selectedFiles: File | File[] | null) => {
    if (!selectedFiles) {
      setFiles([]);
      return;
    }
    const fileArray = Array.isArray(selectedFiles)
      ? selectedFiles
      : [selectedFiles];
    setFiles(fileArray);
  };

  const handleFolderSelect = useCallback(async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Select Obsidian Vault',
      });

      if (selected && typeof selected === 'string') {
        setFolderPath(selected);
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
    }
  }, []);

  const handleContinue = () => {
    if (useFolderPicker && folderPath && onFolderSelected) {
      onFolderSelected(folderPath);
    } else if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const canContinue = useFolderPicker ? !!folderPath : files.length > 0;

  return (
    <Stack gap="md">
      <Alert variant="light" color="gray" className={classes.instructionsAlert}>
        <Text size="sm" fw={600} mb="xs">
          {config.instructions.title}
        </Text>
        <Stack gap={4}>
          {config.instructions.steps.map((step, i) => (
            <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
              <Text size="xs" c="dimmed" w={16}>
                {i + 1}.
              </Text>
              <Text size="xs" c="dimmed">
                {step}
              </Text>
            </Group>
          ))}
        </Stack>
      </Alert>

      {useFolderPicker ? (
        <Group gap="sm">
          <TextInput
            placeholder="No folder selected"
            value={folderPath || ''}
            readOnly
            leftSection={<Icon name="folder" size={14} />}
            style={{ flex: 1 }}
          />
          <Button
            variant="default"
            onClick={handleFolderSelect}
            leftSection={<Icon name="folder" size={14} />}
          >
            Browse
          </Button>
        </Group>
      ) : (
        <FileInput
          placeholder={`Select ${config.acceptedTypes} files`}
          accept={config.acceptedTypes}
          multiple
          leftSection={<Icon name="upload" size={14} />}
          value={files.length > 0 ? files : undefined}
          onChange={handleFileChange}
          clearable
        />
      )}

      {!useFolderPicker && files.length > 0 && (
        <Text size="xs" c="dimmed">
          {files.length} file{files.length !== 1 ? 's' : ''} selected
        </Text>
      )}

      {useFolderPicker && folderPath && (
        <Text size="xs" c="dimmed">
          Vault selected: {folderPath.split('/').pop()}
        </Text>
      )}

      <Group justify="space-between">
        <Button variant="subtle" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="filled"
          color="ember"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </Group>
    </Stack>
  );
}
