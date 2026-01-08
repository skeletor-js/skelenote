/**
 * Data Settings Panel
 *
 * Export functionality for backing up data.
 * Renamed from ExportSettings.tsx
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  Checkbox,
  Progress,
  Box,
  SegmentedControl,
  Divider,
} from '@mantine/core';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import {
  exportAllToZip,
  exportAllToPDFZip,
  type BulkExportProgress,
  type ExportFormat,
  EXPORT_FORMATS,
} from '@/lib/export';
import { BuiltInTypeIds } from '@/lib/types';

export function DataSettings() {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<BulkExportProgress | null>(null);
  const [organizeByType, setOrganizeByType] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown');
  const [pdfTheme, setPdfTheme] = useState<'light' | 'dark'>('light');

  // Get implemented formats for the selector
  const implementedFormats = EXPORT_FORMATS.filter((f) => f.implemented);

  // Get object counts for display - grouped by type
  const objectCounts = useCallback(() => {
    if (!store || !typeRegistry)
      return {
        total: 0,
        byType: [] as { typeId: string; name: string; count: number }[],
      };

    const all = store.getAll({ includeArchived });

    // Group by type, but separate daily notes
    const typeCountMap = new Map<string, number>();
    let dailyNoteCount = 0;

    for (const obj of all) {
      if (obj.typeId === BuiltInTypeIds.NOTE && obj.properties.isDailyNote) {
        dailyNoteCount++;
      } else {
        typeCountMap.set(obj.typeId, (typeCountMap.get(obj.typeId) || 0) + 1);
      }
    }

    // Convert to array with type names, sorted by count descending
    const byType = Array.from(typeCountMap.entries()).map(([typeId, count]) => {
      const typeDef = typeRegistry.get(typeId);
      return {
        typeId,
        name: typeDef?.name || typeId,
        count,
      };
    });

    // Add daily notes if there are any
    if (dailyNoteCount > 0) {
      byType.push({
        typeId: 'daily-note',
        name: 'Daily Note',
        count: dailyNoteCount,
      });
    }

    byType.sort((a, b) => b.count - a.count);

    return {
      total: all.length,
      byType,
    };
  }, [store, typeRegistry, includeArchived]);

  const handleExport = useCallback(async () => {
    if (!store || !typeRegistry) return;

    setIsExporting(true);
    setProgress(null);

    try {
      const objects = store.getAll({ includeArchived });

      // Create resolver function for object names
      const resolveObjectName = (id: string): string | undefined => {
        const obj = store.get(id);
        if (!obj) return undefined;
        const name = obj.properties.title ?? obj.properties.name;
        return name ? String(name) : undefined;
      };

      // Create content getter
      const getContent = (objectId: string): string => {
        try {
          return store.getContent(objectId);
        } catch {
          return '';
        }
      };

      let filePath: string | null = null;

      if (exportFormat === 'pdf') {
        filePath = await exportAllToPDFZip(
          objects,
          typeRegistry,
          getContent,
          resolveObjectName,
          { organizeByType, pdfTheme },
          setProgress
        );
      } else {
        filePath = await exportAllToZip(
          objects,
          typeRegistry,
          getContent,
          resolveObjectName,
          { organizeByType },
          setProgress
        );
      }

      if (filePath) {
        const filename = filePath.split('/').pop() || filePath;
        addToast({
          type: 'success',
          message: `Exported ${progress?.total || objectCounts().total} objects to ${filename}`,
        });
      }
    } catch (error) {
      console.error('Bulk export failed:', error);
      addToast({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Export failed. Please try again.',
      });
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }, [
    store,
    typeRegistry,
    organizeByType,
    includeArchived,
    exportFormat,
    pdfTheme,
    addToast,
    progress?.total,
    objectCounts,
  ]);

  const counts = objectCounts();

  // Calculate progress percentage
  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const getProgressMessage = () => {
    if (!progress) return '';
    switch (progress.phase) {
      case 'preparing':
        return 'Preparing export...';
      case 'exporting':
        return `Exporting ${progress.currentObject || '...'}`;
      case 'compressing':
        return 'Creating ZIP file...';
      case 'complete':
        return 'Export complete!';
      default:
        return '';
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Text size="xl" fw={600} mb="xs">
          Data
        </Text>
        <Text size="sm" c="dimmed">
          Export and manage your data.
        </Text>
      </Box>

      <Divider />

      {/* Export Section */}
      <Box>
        <Text size="md" fw={600} mb="xs">
          Export
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          {exportFormat === 'pdf'
            ? 'Export all your objects as styled PDF files in a ZIP archive.'
            : 'Export all your objects as Markdown files in a ZIP archive. Perfect for backups or migrating to other tools like Obsidian.'}
        </Text>

        {/* Format Selector */}
        <Box mb="md">
          <Text size="sm" fw={500} mb="xs">
            Format
          </Text>
          <SegmentedControl
            value={exportFormat}
            onChange={(value) => setExportFormat(value as ExportFormat)}
            disabled={isExporting}
            radius="sm"
            fullWidth
            data={implementedFormats.map((f) => ({
              value: f.value,
              label: (
                <Group gap="xs" justify="center">
                  <Icon name={f.icon as IconName} size={14} />
                  <Text size="sm">{f.label}</Text>
                </Group>
              ),
            }))}
          />
        </Box>

        {/* PDF Theme (only when PDF selected) */}
        {exportFormat === 'pdf' && (
          <Box mb="md">
            <Text size="sm" fw={500} mb="xs">
              Theme
            </Text>
            <SegmentedControl
              value={pdfTheme}
              onChange={(value) => setPdfTheme(value as 'light' | 'dark')}
              disabled={isExporting}
              radius="sm"
              fullWidth
              data={[
                {
                  value: 'light',
                  label: (
                    <Group gap="xs" justify="center">
                      <Icon name="sun" size={14} />
                      <Text size="sm">Light</Text>
                    </Group>
                  ),
                },
                {
                  value: 'dark',
                  label: (
                    <Group gap="xs" justify="center">
                      <Icon name="moon" size={14} />
                      <Text size="sm">Dark</Text>
                    </Group>
                  ),
                },
              ]}
            />
          </Box>
        )}

        <Box
          mb="md"
          style={{
            border: '1px solid var(--mantine-color-gray-2)',
            borderRadius: 'var(--mantine-radius-sm)',
            padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
            backgroundColor: 'var(--mantine-color-gray-0)',
            width: '100%',
          }}
        >
          <Group gap="md" wrap="wrap">
            <Box style={{ whiteSpace: 'nowrap' }}>
              <Text span fw={600} size="sm">
                {counts.total}
              </Text>
              <Text span size="xs" c="dimmed" ml={4}>
                total objects
              </Text>
            </Box>

            {counts.byType.map((typeCount) => (
              <Group key={typeCount.typeId} gap="md" wrap="nowrap">
                <Text c="dimmed" size="xs">
                  ·
                </Text>
                <Box style={{ whiteSpace: 'nowrap' }}>
                  <Text span fw={600} size="sm">
                    {typeCount.count}
                  </Text>
                  <Text span size="xs" c="dimmed" ml={4}>
                    {typeCount.count === 1
                      ? typeCount.name.toLowerCase()
                      : `${typeCount.name.toLowerCase()}s`}
                  </Text>
                </Box>
              </Group>
            ))}
          </Group>
        </Box>

        <Stack gap="xs" mb="lg">
          <Checkbox
            label="Organize files into folders by type"
            checked={organizeByType}
            onChange={(e) => setOrganizeByType(e.target.checked)}
            disabled={isExporting}
            size="sm"
          />
          <Checkbox
            label="Include archived objects"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            disabled={isExporting}
            size="sm"
          />
        </Stack>

        {progress && (
          <Box mb="md">
            <Progress value={progressPercent} mb="xs" />
            <Text size="sm" c="dimmed">
              {getProgressMessage()} ({progress.current}/{progress.total})
            </Text>
          </Box>
        )}

        <Button
          variant="filled"
          color="ember"
          onClick={handleExport}
          disabled={isExporting || counts.total === 0}
          loading={isExporting}
        >
          {isExporting
            ? 'Exporting...'
            : `Export All (${counts.total} objects)`}
        </Button>
      </Box>
    </Stack>
  );
}
