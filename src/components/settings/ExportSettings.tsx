/**
 * Export Settings
 *
 * Settings panel for bulk exporting all objects to a ZIP file.
 */

import { useState, useCallback } from 'react';
import { Stack, Group, Title, Text, Button, Checkbox, Progress, Box } from '@mantine/core';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import { exportAllToZip, type BulkExportProgress } from '@/lib/export';

export function ExportSettings() {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<BulkExportProgress | null>(null);
  const [organizeByType, setOrganizeByType] = useState(true);

  // Get object counts for display
  const objectCounts = useCallback(() => {
    if (!store) return { total: 0, notes: 0, tasks: 0, projects: 0, others: 0 };

    const all = store.getAll();
    const nonDaily = all.filter((obj) => !obj.properties.isDailyNote);

    return {
      total: nonDaily.length,
      notes: nonDaily.filter((obj) => obj.typeId === 'note').length,
      tasks: nonDaily.filter((obj) => obj.typeId === 'task').length,
      projects: nonDaily.filter((obj) => obj.typeId === 'project').length,
      others: nonDaily.filter(
        (obj) => !['note', 'task', 'project'].includes(obj.typeId)
      ).length,
    };
  }, [store]);

  const handleExport = useCallback(async () => {
    if (!store || !typeRegistry) return;

    setIsExporting(true);
    setProgress(null);

    try {
      const objects = store.getAll();

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

      const filePath = await exportAllToZip(
        objects,
        typeRegistry,
        getContent,
        resolveObjectName,
        { organizeByType },
        setProgress
      );

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
        message: error instanceof Error ? error.message : 'Export failed. Please try again.',
      });
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }, [store, typeRegistry, organizeByType, addToast, progress?.total, objectCounts]);

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
    <Box component="section">
      <Title order={3} mb="md">Export Data</Title>

      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Export all your objects as Markdown files in a ZIP archive.
          Perfect for backups or migrating to other tools like Obsidian.
        </Text>

        <Group gap="lg">
          <Box ta="center">
            <Text size="xl" fw={700}>{counts.total}</Text>
            <Text size="xs" c="dimmed">total objects</Text>
          </Box>
          {counts.notes > 0 && (
            <Box ta="center">
              <Text size="xl" fw={700}>{counts.notes}</Text>
              <Text size="xs" c="dimmed">notes</Text>
            </Box>
          )}
          {counts.tasks > 0 && (
            <Box ta="center">
              <Text size="xl" fw={700}>{counts.tasks}</Text>
              <Text size="xs" c="dimmed">tasks</Text>
            </Box>
          )}
          {counts.projects > 0 && (
            <Box ta="center">
              <Text size="xl" fw={700}>{counts.projects}</Text>
              <Text size="xs" c="dimmed">projects</Text>
            </Box>
          )}
        </Group>

        <Box>
          <Text size="sm" fw={500} mb="xs">Options</Text>
          <Checkbox
            label="Organize files into folders by type"
            checked={organizeByType}
            onChange={(e) => setOrganizeByType(e.target.checked)}
            disabled={isExporting}
          />
          <Text size="xs" c="dimmed" mt="xs">
            Creates folders like /notes/, /tasks/, /projects/ in the ZIP.
          </Text>
        </Box>

        {progress && (
          <Box>
            <Progress value={progressPercent} mb="xs" />
            <Text size="sm" c="dimmed">
              {getProgressMessage()} ({progress.current}/{progress.total})
            </Text>
          </Box>
        )}

        <Button
          onClick={handleExport}
          disabled={isExporting || counts.total === 0}
          loading={isExporting}
        >
          {isExporting ? 'Exporting...' : `Export All (${counts.total} objects)`}
        </Button>

        <Text size="xs" c="dimmed">
          Each object becomes a Markdown file with YAML frontmatter.
          Mentions are converted to [[wiki-links]].
        </Text>
      </Stack>
    </Box>
  );
}
