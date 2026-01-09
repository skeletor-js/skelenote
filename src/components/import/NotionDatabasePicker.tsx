/**
 * Notion Database Picker Component
 *
 * Lists accessible Notion databases and allows selection for import.
 */

import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Checkbox,
  Button,
  Group,
  Badge,
  Loader,
  Alert,
  Paper,
  ScrollArea,
} from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { NotionClient } from '@/lib/import/notion-api';
import { inferBuiltInType } from '@/lib/import/notion-type-inference';
import { summarizeDatabaseSchema } from '@/lib/import/notion-properties';
import type { SelectedDatabase } from '@/lib/import/notion-import';
import classes from './ImportWizard.module.css';

interface NotionDatabasePickerProps {
  client: NotionClient;
  onContinue: (databases: SelectedDatabase[]) => void;
  onBack: () => void;
}

export function NotionDatabasePicker({
  client,
  onContinue,
  onBack,
}: NotionDatabasePickerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [databases, setDatabases] = useState<SelectedDatabase[]>([]);

  useEffect(() => {
    loadDatabases();
  }, [client]);

  const loadDatabases = async () => {
    setLoading(true);
    setError(null);

    try {
      const { listDatabases } = await import('@/lib/import/notion-api');
      const dbs = await listDatabases(client);

      const selected: SelectedDatabase[] = dbs.map((db) => {
        const inference = inferBuiltInType(db);
        return {
          database: db,
          targetTypeId: inference.typeId,
          selected: true, // Select all by default
        };
      });

      setDatabases(selected);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load databases from Notion'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    setDatabases((prev) =>
      prev.map((db, i) =>
        i === index ? { ...db, selected: !db.selected } : db
      )
    );
  };

  const selectAll = () => {
    setDatabases((prev) => prev.map((db) => ({ ...db, selected: true })));
  };

  const selectNone = () => {
    setDatabases((prev) => prev.map((db) => ({ ...db, selected: false })));
  };

  const selectedCount = databases.filter((db) => db.selected).length;

  const handleContinue = () => {
    if (selectedCount > 0) {
      onContinue(databases);
    }
  };

  if (loading) {
    return (
      <Stack gap="md" align="center" py="xl">
        <Loader color="ember" />
        <Text size="sm" c="dimmed">
          Loading databases from Notion...
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap="md">
        <Alert color="red" icon={<Icon name="alert-triangle" size={16} />}>
          {error}
        </Alert>
        <Group justify="space-between">
          <Button variant="subtle" onClick={onBack}>
            Back
          </Button>
          <Button variant="light" onClick={loadDatabases}>
            Retry
          </Button>
        </Group>
      </Stack>
    );
  }

  if (databases.length === 0) {
    return (
      <Stack gap="md">
        <Alert
          color="ochre"
          icon={<Icon name="info" size={16} />}
          className={classes.warningAlert}
        >
          <Text size="sm" fw={500}>
            No databases found
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Make sure you've shared your databases with the integration. Open
            each database in Notion, click "..." menu, then "Add connections"
            and select your integration.
          </Text>
        </Alert>
        <Group justify="space-between">
          <Button variant="subtle" onClick={onBack}>
            Back
          </Button>
          <Button variant="light" onClick={loadDatabases}>
            Refresh
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {databases.length} database{databases.length !== 1 ? 's' : ''} found
        </Text>
        <Group gap="xs">
          <Button variant="subtle" size="xs" onClick={selectAll}>
            Select all
          </Button>
          <Button variant="subtle" size="xs" onClick={selectNone}>
            Select none
          </Button>
        </Group>
      </Group>

      <ScrollArea.Autosize mah={300}>
        <Stack gap="xs">
          {databases.map((db, index) => (
            <DatabaseRow
              key={db.database.id}
              database={db}
              onToggle={() => toggleSelection(index)}
            />
          ))}
        </Stack>
      </ScrollArea.Autosize>

      <Group justify="space-between">
        <Button variant="subtle" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="filled"
          color="ember"
          onClick={handleContinue}
          disabled={selectedCount === 0}
        >
          Continue ({selectedCount} selected)
        </Button>
      </Group>
    </Stack>
  );
}

interface DatabaseRowProps {
  database: SelectedDatabase;
  onToggle: () => void;
}

function DatabaseRow({ database, onToggle }: DatabaseRowProps) {
  const { database: db, selected } = database;
  const inference = inferBuiltInType(db);
  const summary = summarizeDatabaseSchema(db);

  return (
    <Paper
      p="sm"
      withBorder
      className={classes.sourceCard}
      data-selected={selected || undefined}
      style={{ cursor: 'pointer' }}
      onClick={onToggle}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Checkbox
            checked={selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
          />
          <Stack gap={2}>
            <Group gap="xs">
              {db.icon && (
                <Text size="sm" span>
                  {db.icon.startsWith('http') ? '' : db.icon}
                </Text>
              )}
              <Text size="sm" fw={500}>
                {db.name}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {summary}
            </Text>
          </Stack>
        </Group>

        <Group gap="xs">
          <Badge
            size="xs"
            variant="light"
            color={inference.confidence >= 70 ? 'sage' : 'gray'}
          >
            → {inference.typeName}
          </Badge>
          {db.pageCount !== undefined && db.pageCount > 0 && (
            <Badge size="xs" variant="outline" color="gray">
              {db.pageCount === -1 ? '1+' : db.pageCount} pages
            </Badge>
          )}
        </Group>
      </Group>
    </Paper>
  );
}
