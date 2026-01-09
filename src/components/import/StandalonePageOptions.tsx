/**
 * Standalone Page Options Component
 *
 * Handles bulk categorization of standalone Notion pages (not in databases).
 * Defaults to importing all as Notes, which go to Inbox for triage.
 */

import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Button,
  Group,
  Paper,
  Loader,
  Alert,
  SegmentedControl,
} from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { NotionClient } from '@/lib/import/notion-api';
import classes from './ImportWizard.module.css';

export type StandaloneImportOption = 'import' | 'skip';

interface StandalonePageOptionsProps {
  client: NotionClient;
  onContinue: (option: StandaloneImportOption) => void;
  onBack: () => void;
}

export function StandalonePageOptions({
  client,
  onContinue,
  onBack,
}: StandalonePageOptionsProps) {
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [option, setOption] = useState<StandaloneImportOption>('import');

  useEffect(() => {
    countStandalonePages();
  }, [client]);

  const countStandalonePages = async () => {
    setLoading(true);
    setError(null);

    try {
      const { listStandalonePages } = await import('@/lib/import/notion-api');
      const pages = await listStandalonePages(client);
      setPageCount(pages.length);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch standalone pages from Notion'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Stack gap="md" align="center" py="xl">
        <Loader color="ember" />
        <Text size="sm" c="dimmed">
          Checking for standalone pages...
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
          <Button variant="light" onClick={countStandalonePages}>
            Retry
          </Button>
        </Group>
      </Stack>
    );
  }

  // No standalone pages - skip this step entirely
  if (pageCount === 0) {
    return (
      <Stack gap="md">
        <Alert
          variant="light"
          color="sage"
          icon={<Icon name="check" size={14} />}
        >
          <Text size="sm" fw={500}>
            No standalone pages found
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            All your Notion content is organized in databases. You can proceed
            with the import.
          </Text>
        </Alert>

        <Group justify="space-between">
          <Button variant="subtle" onClick={onBack}>
            Back
          </Button>
          <Button
            variant="filled"
            color="ember"
            onClick={() => onContinue('skip')}
          >
            Continue
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Group gap="sm">
            <Icon
              name="file-text"
              size={18}
              color="var(--mantine-color-ember-6)"
            />
            <Text size="sm" fw={500}>
              Standalone Pages
            </Text>
          </Group>

          <Text size="xs" c="dimmed">
            Found {pageCount.toLocaleString()} page{pageCount !== 1 ? 's' : ''}{' '}
            not in any database. These are typically quick notes, scratch pages,
            or pages in your workspace root.
          </Text>

          <SegmentedControl
            fullWidth
            value={option}
            onChange={(value) => setOption(value as StandaloneImportOption)}
            data={[
              {
                value: 'import',
                label: (
                  <Group gap="xs" justify="center">
                    <Icon name="download" size={14} />
                    <span>Import as Notes</span>
                  </Group>
                ),
              },
              {
                value: 'skip',
                label: (
                  <Group gap="xs" justify="center">
                    <Icon name="x" size={14} />
                    <span>Skip</span>
                  </Group>
                ),
              },
            ]}
          />
        </Stack>
      </Paper>

      {option === 'import' && (
        <Alert
          variant="light"
          color="gray"
          icon={<Icon name="info" size={14} />}
          className={classes.instructionsAlert}
        >
          <Text size="xs">
            All standalone pages will be imported as Notes and sent to your
            Inbox. You can review and change their type later using bulk
            actions.
          </Text>
        </Alert>
      )}

      {option === 'skip' && (
        <Alert
          variant="light"
          color="ochre"
          icon={<Icon name="alert-triangle" size={14} />}
        >
          <Text size="xs">
            Standalone pages will not be imported. You can always import them
            later by running the Notion import again.
          </Text>
        </Alert>
      )}

      <Group justify="space-between">
        <Button variant="subtle" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="filled"
          color="ember"
          onClick={() => onContinue(option)}
        >
          {option === 'import'
            ? `Import ${pageCount.toLocaleString()} Page${pageCount !== 1 ? 's' : ''}`
            : 'Skip & Continue'}
        </Button>
      </Group>
    </Stack>
  );
}
