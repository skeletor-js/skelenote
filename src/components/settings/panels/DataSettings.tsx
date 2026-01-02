/**
 * Data Settings Panel
 *
 * Export functionality for backing up data.
 * Renamed from ExportSettings.tsx
 */

import { useState, useCallback } from 'react';
import { Stack, Group, Text, Button, Checkbox, Progress, Box } from '@mantine/core';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import { exportAllToZip, type BulkExportProgress } from '@/lib/export';

export function DataSettings() {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<BulkExportProgress | null>(null);
  const [organizeByType, setOrganizeByType] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Get object counts for display - grouped by type
  const objectCounts = useCallback(() => {
    if (!store || !typeRegistry) return { total: 0, byType: [] as { typeId: string; name: string; count: number }[] };

    const all = store.getAll({ includeArchived });

    // Group by type
    const typeCountMap = new Map<string, number>();
    for (const obj of all) {
      typeCountMap.set(obj.typeId, (typeCountMap.get(obj.typeId) || 0) + 1);
    }

    // Convert to array with type names, sorted by count descending
    const byType = Array.from(typeCountMap.entries())
      .map(([typeId, count]) => {
        const typeDef = typeRegistry.get(typeId);
        return {
          typeId,
          name: typeDef?.name || typeId,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

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
  }, [store, typeRegistry, organizeByType, includeArchived, addToast, progress?.total, objectCounts]);

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
        <Text size="lg" fw={600} mb="xs">Data</Text>
        <Text size="sm" c="dimmed">
          Export and manage your data.
        </Text>
      </Box>

      {/* Export Section */}
      <Box>
        <Text size="md" fw={600} mb="xs">Export</Text>
        <Text size="sm" c="dimmed" mb="md">
          Export all your objects as Markdown files in a ZIP archive.
          Perfect for backups or migrating to other tools like Obsidian.
        </Text>

        <Group gap="lg" mb="md" wrap="wrap">
          <Box ta="center">
            <Text size="xl" fw={700}>{counts.total}</Text>
            <Text size="xs" c="dimmed">total objects</Text>
          </Box>
          {counts.byType.map((typeCount) => (
            <Box key={typeCount.typeId} ta="center">
              <Text size="xl" fw={700}>{typeCount.count}</Text>
              <Text size="xs" c="dimmed">{typeCount.name.toLowerCase()}s</Text>
            </Box>
          ))}
        </Group>

        <Box mb="md">
          <Text size="sm" fw={500} mb="xs">Options</Text>
          <Stack gap="xs">
            <Checkbox
              label="Organize files into folders by type"
              checked={organizeByType}
              onChange={(e) => setOrganizeByType(e.target.checked)}
              disabled={isExporting}
            />
            <Checkbox
              label="Include archived objects"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              disabled={isExporting}
            />
          </Stack>
        </Box>

        {progress && (
          <Box mb="md">
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

        <Text size="xs" c="dimmed" mt="sm">
          Each object becomes a Markdown file with YAML frontmatter.
          Mentions are converted to [[wiki-links]].
        </Text>
      </Box>
    </Stack>
  );
}
