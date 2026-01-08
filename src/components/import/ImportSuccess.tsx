/**
 * Import Success View (Step 5)
 *
 * Displays import summary with View in Inbox action.
 */

import { Stack, Text, Box, Group, Button, Alert } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import { useNavigation } from '@/contexts';
import type { ImportResult } from './types';
import classes from './ImportWizard.module.css';

interface ImportSuccessProps {
  result: ImportResult;
  onImportMore: () => void;
}

export function ImportSuccess({ result, onImportMore }: ImportSuccessProps) {
  const { navigateToView } = useNavigation();

  const handleViewInInbox = () => {
    navigateToView('inbox');
  };

  return (
    <Stack gap="md">
      <Box ta="center" py="md">
        <Box
          className={`${classes.successIconContainer} ${classes.successIcon}`}
          mb="md"
        >
          <Icon name="check" size={24} color="var(--mantine-color-sage-5)" />
        </Box>
        <Text size="lg" fw={600} mb="xs">
          Import Complete
        </Text>
        <Text size="sm" c="dimmed">
          Your documents have been imported to Skelenote.
        </Text>
      </Box>

      {/* Stats summary */}
      <Box className={classes.statsBox}>
        <Group justify="center" gap="lg">
          <Box ta="center">
            <Text size="lg" fw={600} c="sage">
              {result.imported}
            </Text>
            <Text size="xs" c="dimmed">
              imported
            </Text>
          </Box>
          {result.skipped > 0 && (
            <Box ta="center">
              <Text size="lg" fw={600} c="dimmed">
                {result.skipped}
              </Text>
              <Text size="xs" c="dimmed">
                skipped
              </Text>
            </Box>
          )}
          {result.errors > 0 && (
            <Box ta="center">
              <Text size="lg" fw={600} c="brick">
                {result.errors}
              </Text>
              <Text size="xs" c="dimmed">
                errors
              </Text>
            </Box>
          )}
        </Group>
      </Box>

      {/* Warnings if any */}
      {result.warnings.length > 0 && (
        <Alert variant="light" color="ochre" className={classes.warningAlert}>
          <Text size="xs" fw={500} mb="xs">
            {result.warnings.length} warning
            {result.warnings.length > 1 ? 's' : ''}
          </Text>
          <Stack gap={2}>
            {result.warnings.slice(0, 3).map((w, i) => (
              <Text key={i} size="xs" c="dimmed">
                {w}
              </Text>
            ))}
            {result.warnings.length > 3 && (
              <Text size="xs" c="dimmed">
                +{result.warnings.length - 3} more
              </Text>
            )}
          </Stack>
        </Alert>
      )}

      <Group justify="center" gap="sm">
        <Button variant="subtle" onClick={onImportMore}>
          Import More
        </Button>
        <Button variant="filled" color="ember" onClick={handleViewInInbox}>
          View in Inbox
        </Button>
      </Group>
    </Stack>
  );
}
