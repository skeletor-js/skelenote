/**
 * Notion Type Mapper Component
 *
 * Allows users to review and override type mappings for Notion databases.
 * Includes expandable property mapping for each database.
 */

import {
  Stack,
  Text,
  Select,
  Button,
  Group,
  Badge,
  Paper,
  ScrollArea,
  Alert,
} from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import {
  inferBuiltInType,
  formatConfidence,
} from '@/lib/import/notion-type-inference';
import {
  summarizeDatabaseSchema,
  inferPropertyMappings,
  type PropertyMapping,
} from '@/lib/import/notion-properties';
import { NotionPropertyMapper } from './NotionPropertyMapper';
import { BuiltInTypeIds } from '@/lib/types';
import type { SelectedDatabase } from '@/lib/import/notion-import';
import classes from './ImportWizard.module.css';

interface NotionTypeMapperProps {
  databases: SelectedDatabase[];
  onDatabasesChange: (databases: SelectedDatabase[]) => void;
  onStartImport: () => void;
  onBack: () => void;
}

const TYPE_OPTIONS = [
  { value: BuiltInTypeIds.TASK, label: 'Task' },
  { value: BuiltInTypeIds.NOTE, label: 'Note' },
  { value: BuiltInTypeIds.PROJECT, label: 'Project' },
  { value: BuiltInTypeIds.AREA, label: 'Area' },
  { value: BuiltInTypeIds.MEETING, label: 'Meeting' },
  { value: BuiltInTypeIds.LINK, label: 'Link' },
  { value: BuiltInTypeIds.PERSON, label: 'Person' },
  { value: BuiltInTypeIds.TAG, label: 'Tag' },
];

export function NotionTypeMapper({
  databases,
  onDatabasesChange,
  onStartImport,
  onBack,
}: NotionTypeMapperProps) {
  const selectedDatabases = databases.filter((db) => db.selected);

  const updateTypeMapping = (index: number, typeId: string) => {
    const selectedIndex = databases.findIndex(
      (db) => db.database.id === selectedDatabases[index].database.id
    );
    if (selectedIndex >= 0) {
      const updated = [...databases];
      const db = updated[selectedIndex];
      // Re-infer property mappings when type changes
      const newMappings = inferPropertyMappings(db.database, typeId);
      updated[selectedIndex] = {
        ...db,
        targetTypeId: typeId,
        propertyMappings: newMappings,
      };
      onDatabasesChange(updated);
    }
  };

  const updatePropertyMappings = (
    index: number,
    mappings: PropertyMapping[]
  ) => {
    const selectedIndex = databases.findIndex(
      (db) => db.database.id === selectedDatabases[index].database.id
    );
    if (selectedIndex >= 0) {
      const updated = [...databases];
      updated[selectedIndex] = {
        ...updated[selectedIndex],
        propertyMappings: mappings,
      };
      onDatabasesChange(updated);
    }
  };

  // Initialize property mappings if not present
  const ensurePropertyMappings = (db: SelectedDatabase): PropertyMapping[] => {
    if (db.propertyMappings) return db.propertyMappings;
    return inferPropertyMappings(db.database, db.targetTypeId);
  };

  // Calculate total estimated pages
  const totalPages = selectedDatabases.reduce((sum, db) => {
    const count = db.database.pageCount;
    return sum + (count && count > 0 ? (count === -1 ? 1 : count) : 0);
  }, 0);

  return (
    <Stack gap="md">
      <Alert
        variant="light"
        color="gray"
        icon={<Icon name="info" size={14} />}
        className={classes.instructionsAlert}
      >
        <Text size="xs">
          Review the type mappings below. Each Notion database will be imported
          as the specified Skelenote type. You can change the mapping if the
          auto-detected type doesn't match your data.
        </Text>
      </Alert>

      <ScrollArea.Autosize mah={280}>
        <Stack gap="xs">
          {selectedDatabases.map((db, index) => (
            <TypeMappingRow
              key={db.database.id}
              database={db}
              propertyMappings={ensurePropertyMappings(db)}
              onTypeChange={(typeId) => updateTypeMapping(index, typeId)}
              onPropertyMappingsChange={(mappings) =>
                updatePropertyMappings(index, mappings)
              }
            />
          ))}
        </Stack>
      </ScrollArea.Autosize>

      <Paper p="xs" className={classes.statsBox}>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {selectedDatabases.length} database
            {selectedDatabases.length !== 1 ? 's' : ''} selected
          </Text>
          <Text size="xs" c="dimmed">
            ~{totalPages > 0 ? totalPages : '?'} pages to import
          </Text>
        </Group>
      </Paper>

      <Alert
        variant="light"
        color="ochre"
        icon={<Icon name="clock" size={14} />}
      >
        <Text size="xs">
          Import may take a while depending on the number of pages. All imported
          items will arrive in your Inbox for review.
        </Text>
      </Alert>

      <Group justify="space-between">
        <Button variant="subtle" onClick={onBack}>
          Back
        </Button>
        <Button variant="filled" color="ember" onClick={onStartImport}>
          Start Import
        </Button>
      </Group>
    </Stack>
  );
}

interface TypeMappingRowProps {
  database: SelectedDatabase;
  propertyMappings: PropertyMapping[];
  onTypeChange: (typeId: string) => void;
  onPropertyMappingsChange: (mappings: PropertyMapping[]) => void;
}

function TypeMappingRow({
  database,
  propertyMappings,
  onTypeChange,
  onPropertyMappingsChange,
}: TypeMappingRowProps) {
  const { database: db, targetTypeId } = database;
  const inference = inferBuiltInType(db);
  const summary = summarizeDatabaseSchema(db);

  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs">
              {db.icon && !db.icon.startsWith('http') && (
                <Text size="sm" span>
                  {db.icon}
                </Text>
              )}
              <Text size="sm" fw={500} truncate>
                {db.name}
              </Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed" truncate>
                {summary}
              </Text>
              <Badge size="xs" variant="dot" color="gray">
                {formatConfidence(inference.confidence)} confidence
              </Badge>
            </Group>
          </Stack>

          <Group gap="xs" wrap="nowrap">
            <Icon
              name="arrow-right"
              size={12}
              color="var(--mantine-color-gray-5)"
            />
            <Select
              size="xs"
              value={targetTypeId}
              onChange={(value) => value && onTypeChange(value)}
              data={TYPE_OPTIONS}
              w={120}
              comboboxProps={{ withinPortal: true }}
            />
          </Group>
        </Group>

        {/* Property mapping (expandable) */}
        <NotionPropertyMapper
          targetTypeId={targetTypeId}
          mappings={propertyMappings}
          onMappingsChange={onPropertyMappingsChange}
        />
      </Stack>
    </Paper>
  );
}
