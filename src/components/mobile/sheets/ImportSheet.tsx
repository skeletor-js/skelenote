/**
 * Import Sheet for Mobile
 * Features: Import from Markdown files, Obsidian vaults, or JSON backups
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  Button,
  Progress,
  Alert,
  Group,
  Badge,
} from '@mantine/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import {
  FileText,
  Folder,
  Check,
  AlertTriangle,
  Upload,
  Archive,
} from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useObjects, useToast } from '@/contexts';
import { useHaptics } from '@/hooks';
import {
  importMarkdown,
  readVaultDirectory,
  parseVaultFiles,
  importObsidianVault,
  inferTypeFromVaultFile,
} from '@/lib/import';
import type { ObsidianImportProgress } from '@/lib/import';
import { BuiltInTypeIds } from '@/lib/types';

type ImportStep = 'select' | 'importing' | 'complete';

interface ImportSheetProps {
  opened: boolean;
  onClose: () => void;
}

interface ImportProgress {
  current: number;
  total: number;
  message: string;
  phase: 'reading' | 'parsing' | 'importing' | 'linking' | 'complete';
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function ImportSheet({ opened, onClose }: ImportSheetProps) {
  const { store, refreshData } = useObjects();
  const { addToast } = useToast();
  const { notification } = useHaptics();

  const [step, setStep] = useState<ImportStep>('select');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setStep('select');
    setProgress(null);
    setResult(null);
    onClose();
  }, [onClose]);

  // Import markdown files
  const handleMarkdownImport = useCallback(async () => {
    if (!store) return;

    setStep('importing');

    try {
      // Open file picker for markdown files
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Markdown',
            extensions: ['md', 'markdown', 'txt'],
          },
        ],
      });

      if (!selected || (Array.isArray(selected) && selected.length === 0)) {
        setStep('select');
        return;
      }

      const files = Array.isArray(selected) ? selected : [selected];

      setProgress({
        current: 0,
        total: files.length,
        message: 'Reading files...',
        phase: 'reading',
      });

      let imported = 0;
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const fileName = filePath.split('/').pop() || filePath;

        setProgress({
          current: i,
          total: files.length,
          message: `Importing ${fileName}...`,
          phase: 'importing',
        });

        try {
          const content = await readTextFile(filePath);
          const parsed = importMarkdown(content, {
            filePath: fileName,
            extractTitleFromH1: true,
          });

          const obj = store.create({
            typeId: parsed.typeId || BuiltInTypeIds.NOTE,
            properties: {
              title: parsed.title || fileName.replace(/\.md$/, ''),
              ...parsed.properties,
            },
            withContent: parsed.blocks.length > 0,
            inboxed: true,
          });

          if (parsed.blocks.length > 0) {
            store.setContent(obj.id, JSON.stringify(parsed.blocks));
          }

          imported++;
        } catch (err) {
          errors.push(
            `${fileName}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }

      refreshData();

      setResult({ imported, skipped: 0, errors });
      setStep('complete');

      if (imported > 0) {
        notification('success');
      } else {
        notification('error');
      }
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Import failed'],
      });
      setStep('complete');
      notification('error');
    }
  }, [store, refreshData, notification]);

  // Import Obsidian vault
  const handleObsidianImport = useCallback(async () => {
    if (!store) return;

    setStep('importing');

    try {
      // Open folder picker
      const selected = await open({
        directory: true,
        title: 'Select Obsidian Vault',
      });

      if (!selected || typeof selected !== 'string') {
        setStep('select');
        return;
      }

      const vaultPath = selected;

      setProgress({
        current: 0,
        total: 0,
        message: 'Reading vault...',
        phase: 'reading',
      });

      // Read all markdown files from the vault
      const vaultFiles = await readVaultDirectory(vaultPath);

      setProgress({
        current: 0,
        total: vaultFiles.length,
        message: 'Parsing files...',
        phase: 'parsing',
      });

      // Parse files
      const parsed = parseVaultFiles(vaultFiles);

      // Apply type inference
      for (const file of parsed) {
        const inference = inferTypeFromVaultFile(file);
        file.parsed.typeId = inference.typeId;
        file.selected = true;
      }

      // Import the vault
      const importResult = await importObsidianVault({
        store,
        vaultPath,
        files: parsed,
        onProgress: (obsidianProgress: ObsidianImportProgress) => {
          setProgress({
            current: obsidianProgress.current,
            total: obsidianProgress.total,
            message:
              obsidianProgress.currentFile || obsidianProgress.message || '',
            phase:
              obsidianProgress.phase === 'complete'
                ? 'complete'
                : obsidianProgress.phase === 'linking'
                  ? 'linking'
                  : 'importing',
          });
        },
      });

      refreshData();

      setResult({
        imported: importResult.imported,
        skipped: importResult.skipped,
        errors: importResult.errors,
      });
      setStep('complete');

      if (importResult.imported > 0) {
        notification('success');
        addToast({
          type: 'success',
          message: `Imported ${importResult.imported} note${importResult.imported !== 1 ? 's' : ''} from Obsidian`,
        });
      } else {
        notification('error');
      }
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Import failed'],
      });
      setStep('complete');
      notification('error');
    }
  }, [store, refreshData, notification, addToast]);

  // Import JSON backup
  const handleJSONImport = useCallback(async () => {
    if (!store) return;

    setStep('importing');

    try {
      // Open file picker for JSON
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'JSON Backup',
            extensions: ['json'],
          },
        ],
      });

      if (!selected || typeof selected !== 'string') {
        setStep('select');
        return;
      }

      setProgress({
        current: 0,
        total: 1,
        message: 'Reading backup file...',
        phase: 'reading',
      });

      const content = await readTextFile(selected);
      const backup = JSON.parse(content);

      // Handle Skelenote JSON backup format
      if (!backup.objects || !Array.isArray(backup.objects)) {
        throw new Error('Invalid backup format: missing objects array');
      }

      setProgress({
        current: 0,
        total: backup.objects.length,
        message: 'Importing objects...',
        phase: 'importing',
      });

      let imported = 0;
      const errors: string[] = [];

      for (let i = 0; i < backup.objects.length; i++) {
        const item = backup.objects[i];

        setProgress({
          current: i,
          total: backup.objects.length,
          message: `Importing ${item.properties?.title || 'object'}...`,
          phase: 'importing',
        });

        try {
          const obj = store.create({
            typeId: item.typeId || BuiltInTypeIds.NOTE,
            properties: item.properties || {},
            withContent: !!item.content,
            inboxed: item.inboxed ?? true,
          });

          if (item.content) {
            store.setContent(obj.id, item.content);
          }

          imported++;
        } catch (err) {
          errors.push(
            `Object ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }

      refreshData();

      setResult({ imported, skipped: 0, errors });
      setStep('complete');

      if (imported > 0) {
        notification('success');
      } else {
        notification('error');
      }
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Import failed'],
      });
      setStep('complete');
      notification('error');
    }
  }, [store, refreshData, notification]);

  // Calculate progress percentage
  const progressPercent = progress
    ? Math.round((progress.current / Math.max(progress.total, 1)) * 100)
    : 0;

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Import Data"
      size="lg"
    >
      <Stack gap="md" p="md">
        {/* Source Selection */}
        {step === 'select' && (
          <>
            <Text size="sm" c="dimmed">
              Choose an import source to bring your data into Skelenote.
            </Text>

            <Stack gap="sm">
              {/* Markdown Files */}
              <Button
                variant="light"
                leftSection={<FileText size={20} />}
                size="lg"
                justify="flex-start"
                onClick={handleMarkdownImport}
                styles={{
                  root: { height: 'auto', padding: '16px' },
                  inner: { justifyContent: 'flex-start' },
                }}
              >
                <Stack gap={2} align="flex-start">
                  <Text fw={500}>Markdown Files</Text>
                  <Text size="xs" c="dimmed">
                    Import .md files with frontmatter
                  </Text>
                </Stack>
              </Button>

              {/* Obsidian Vault */}
              <Button
                variant="light"
                leftSection={<Folder size={20} />}
                size="lg"
                justify="flex-start"
                onClick={handleObsidianImport}
                styles={{
                  root: { height: 'auto', padding: '16px' },
                  inner: { justifyContent: 'flex-start' },
                }}
              >
                <Stack gap={2} align="flex-start">
                  <Text fw={500}>Obsidian Vault</Text>
                  <Text size="xs" c="dimmed">
                    Import an entire vault with wiki-links
                  </Text>
                </Stack>
              </Button>

              {/* JSON Backup */}
              <Button
                variant="light"
                leftSection={<Archive size={20} />}
                size="lg"
                justify="flex-start"
                onClick={handleJSONImport}
                styles={{
                  root: { height: 'auto', padding: '16px' },
                  inner: { justifyContent: 'flex-start' },
                }}
              >
                <Stack gap={2} align="flex-start">
                  <Text fw={500}>JSON Backup</Text>
                  <Text size="xs" c="dimmed">
                    Restore from a Skelenote backup
                  </Text>
                </Stack>
              </Button>
            </Stack>
          </>
        )}

        {/* Importing Progress */}
        {step === 'importing' && progress && (
          <Stack gap="md">
            <Box ta="center" py="md">
              <Upload
                size={40}
                style={{ color: 'var(--mantine-color-ember-5)' }}
              />
            </Box>

            <Progress value={progressPercent} color="ember" animated striped />

            <Stack gap="xs" align="center">
              <Text size="sm" fw={500}>
                Importing...
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {progress.message}
              </Text>
              <Badge size="sm" variant="light">
                {progress.current} / {progress.total}
              </Badge>
            </Stack>
          </Stack>
        )}

        {/* Import Complete */}
        {step === 'complete' && result && (
          <Stack gap="md">
            <Box ta="center" py="md">
              {result.imported > 0 ? (
                <Check
                  size={40}
                  style={{ color: 'var(--mantine-color-sage-5)' }}
                />
              ) : (
                <AlertTriangle
                  size={40}
                  style={{ color: 'var(--mantine-color-ochre-5)' }}
                />
              )}
            </Box>

            <Stack gap="xs" align="center">
              <Text size="lg" fw={600}>
                {result.imported > 0 ? 'Import Complete' : 'Import Failed'}
              </Text>

              <Group gap="md">
                {result.imported > 0 && (
                  <Badge size="lg" variant="light" color="sage">
                    {result.imported} imported
                  </Badge>
                )}
                {result.skipped > 0 && (
                  <Badge size="lg" variant="light" color="gray">
                    {result.skipped} skipped
                  </Badge>
                )}
              </Group>
            </Stack>

            {/* Errors */}
            {result.errors.length > 0 && (
              <Alert
                icon={<AlertTriangle size={16} />}
                title={`${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`}
                color="brick"
                variant="light"
              >
                <Stack gap="xs">
                  {result.errors.slice(0, 3).map((error, i) => (
                    <Text key={i} size="xs">
                      {error}
                    </Text>
                  ))}
                  {result.errors.length > 3 && (
                    <Text size="xs" c="dimmed">
                      ...and {result.errors.length - 3} more
                    </Text>
                  )}
                </Stack>
              </Alert>
            )}

            {/* Actions */}
            <Group justify="center" mt="md">
              <Button variant="light" onClick={() => setStep('select')}>
                Import More
              </Button>
              <Button variant="filled" color="ember" onClick={handleClose}>
                Done
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </BottomSheet>
  );
}
