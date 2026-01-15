/**
 * Data Settings Sheet
 * Features: Export data to various formats, import data
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  Button,
  Select,
  Progress,
  Alert,
} from '@mantine/core';
import { Download, Upload, Check, AlertTriangle } from 'lucide-react';
import { BottomSheet } from '../primitives';

type ExportFormat = 'json' | 'markdown';
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';
type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

interface DataSettingsSheetProps {
  opened: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  onImport: () => Promise<void>;
}

export function DataSettingsSheet({
  opened,
  onClose,
  onExport,
  onImport,
}: DataSettingsSheetProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle export
  const handleExport = useCallback(async () => {
    setExportStatus('exporting');
    setExportProgress(0);
    setErrorMessage(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => Math.min(prev + 20, 90));
      }, 200);

      await onExport(exportFormat);

      clearInterval(progressInterval);
      setExportProgress(100);
      setExportStatus('success');

      // Reset after delay
      setTimeout(() => {
        setExportStatus('idle');
        setExportProgress(0);
      }, 2000);
    } catch (err) {
      setExportStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Export failed');
    }
  }, [exportFormat, onExport]);

  // Handle import
  const handleImport = useCallback(async () => {
    setImportStatus('importing');
    setErrorMessage(null);

    try {
      await onImport();
      setImportStatus('success');

      // Reset after delay
      setTimeout(() => {
        setImportStatus('idle');
      }, 2000);
    } catch (err) {
      setImportStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Import failed');
    }
  }, [onImport]);

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setExportStatus('idle');
    setExportProgress(0);
    setImportStatus('idle');
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Data Management"
      size="lg"
    >
      <Stack gap="lg" p="md">
        {/* Error Alert */}
        {errorMessage && (
          <Alert
            icon={<AlertTriangle size={20} />}
            title="Error"
            color="brick"
            variant="light"
            withCloseButton
            onClose={() => setErrorMessage(null)}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Export Section */}
        <Box
          style={{
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            backgroundColor: 'var(--surface-paper)',
          }}
        >
          <Stack gap="md">
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Export Data
              </Text>
              <Text size="sm" c="dimmed">
                Download your notes, tasks, and projects in your preferred
                format.
              </Text>
            </Stack>

            <Select
              label="Format"
              value={exportFormat}
              onChange={(value) =>
                setExportFormat((value as ExportFormat) || 'json')
              }
              data={[
                { value: 'json', label: 'JSON (complete backup)' },
                { value: 'markdown', label: 'Markdown (readable)' },
              ]}
              size="sm"
            />

            {exportStatus === 'exporting' && (
              <Progress
                value={exportProgress}
                color="ember"
                size="sm"
                striped
                animated
              />
            )}

            <Button
              variant="light"
              leftSection={
                exportStatus === 'success' ? (
                  <Check size={16} />
                ) : (
                  <Download size={16} />
                )
              }
              color={exportStatus === 'success' ? 'sage' : 'ember'}
              onClick={handleExport}
              loading={exportStatus === 'exporting'}
              disabled={exportStatus === 'success'}
            >
              {exportStatus === 'success' ? 'Exported!' : 'Export Data'}
            </Button>
          </Stack>
        </Box>

        {/* Import Section */}
        <Box
          style={{
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            backgroundColor: 'var(--surface-paper)',
          }}
        >
          <Stack gap="md">
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Import Data
              </Text>
              <Text size="sm" c="dimmed">
                Import data from a previous export or migrate from another app.
              </Text>
            </Stack>

            <Button
              variant="light"
              leftSection={
                importStatus === 'success' ? (
                  <Check size={16} />
                ) : (
                  <Upload size={16} />
                )
              }
              color={importStatus === 'success' ? 'sage' : 'ember'}
              onClick={handleImport}
              loading={importStatus === 'importing'}
              disabled={importStatus === 'success'}
            >
              {importStatus === 'success' ? 'Imported!' : 'Choose File'}
            </Button>

            <Text size="xs" c="dimmed">
              Supported formats: JSON backup, Notion export, Obsidian vault
            </Text>
          </Stack>
        </Box>
      </Stack>
    </BottomSheet>
  );
}
