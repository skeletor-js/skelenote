/**
 * Import Progress View (Step 4)
 *
 * Displays import progress with ETA.
 */

import { Stack, Progress, Text, Box, Group } from '@mantine/core';
import type { ImportProgress } from './types';
import classes from './ImportWizard.module.css';

interface ImportProgressViewProps {
  progress: ImportProgress;
}

const getPhaseLabel = (phase: ImportProgress['phase']): string => {
  switch (phase) {
    case 'parsing':
      return 'Parsing documents...';
    case 'importing':
      return 'Creating objects...';
    case 'linking':
      return 'Resolving links...';
    case 'complete':
      return 'Import complete!';
  }
};

const formatEta = (
  startTime: number,
  current: number,
  total: number
): string => {
  if (current === 0 || current >= total) return '';

  const elapsed = Date.now() - startTime;
  const avgTimePerItem = elapsed / current;
  const remaining = (total - current) * avgTimePerItem;
  const seconds = Math.ceil(remaining / 1000);

  if (seconds < 60) return `${seconds}s remaining`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s remaining`;
};

export function ImportProgressView({ progress }: ImportProgressViewProps) {
  const percentage =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const eta = formatEta(progress.startTime, progress.current, progress.total);

  return (
    <Stack gap="md">
      <Box className={classes.progressBox}>
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={500}>
            {getPhaseLabel(progress.phase)}
          </Text>
          <Text size="xs" c="dimmed">
            {progress.current} / {progress.total}
          </Text>
        </Group>

        <Progress
          value={percentage}
          color="ember"
          size="sm"
          radius="sm"
          mb="xs"
        />

        <Group justify="space-between">
          <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
            {progress.currentDocument}
          </Text>
          {eta && progress.phase !== 'complete' && (
            <Text size="xs" c="dimmed">
              {eta}
            </Text>
          )}
        </Group>
      </Box>
    </Stack>
  );
}
