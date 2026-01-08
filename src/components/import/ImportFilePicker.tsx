/**
 * Import File Picker (Step 2)
 *
 * File selection with source-specific instructions.
 */

import { useState } from 'react';
import { Stack, Text, Alert, FileInput, Button, Group } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import { getSourceConfig, type ImportSource } from './types';
import classes from './ImportWizard.module.css';

interface ImportFilePickerProps {
  source: ImportSource;
  onFilesSelected: (files: File[]) => void;
  onBack: () => void;
}

export function ImportFilePicker({
  source,
  onFilesSelected,
  onBack,
}: ImportFilePickerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const config = getSourceConfig(source);

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

  const handleContinue = () => {
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const placeholderText =
    source === 'json'
      ? 'Select .json file'
      : `Select ${config.acceptedTypes} files`;

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

      <FileInput
        placeholder={placeholderText}
        accept={config.acceptedTypes}
        multiple={source !== 'json'}
        leftSection={<Icon name="upload" size={14} />}
        value={files.length > 1 ? files : files[0] || null}
        onChange={handleFileChange}
        clearable
      />

      {files.length > 0 && (
        <Text size="xs" c="dimmed">
          {files.length} file{files.length !== 1 ? 's' : ''} selected
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
          disabled={files.length === 0}
        >
          Continue
        </Button>
      </Group>
    </Stack>
  );
}
