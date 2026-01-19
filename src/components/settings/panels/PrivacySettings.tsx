/**
 * Privacy Settings Panel
 *
 * Controls for analytics opt-out and privacy preferences.
 */

import { Stack, Text, Box, Checkbox, Divider, Alert } from '@mantine/core';
import { useAnalytics } from '@/contexts';

export function PrivacySettings() {
  const { isEnabled, enable, disable } = useAnalytics();

  const handleToggle = () => {
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Text size="xl" fw={600} mb="xs">
          Privacy
        </Text>
        <Text size="sm" c="dimmed">
          Control how Skelenote collects usage data.
        </Text>
      </Box>

      <Divider />

      <Box>
        <Checkbox
          label="Send anonymous usage data"
          checked={isEnabled}
          onChange={handleToggle}
        />
        <Text size="xs" c="dimmed" mt="xs">
          Help improve Skelenote by sharing anonymous usage statistics. No
          personal data, note content, or identifiable information is ever
          collected.
        </Text>
      </Box>

      <Alert variant="light" color="slate" title="What we collect">
        <Stack gap={4}>
          <Text size="sm">Feature usage (which views you open)</Text>
          <Text size="sm">App version and platform</Text>
          <Text size="sm">Error reports for debugging</Text>
        </Stack>
      </Alert>

      <Alert variant="light" color="sage" title="What we never collect">
        <Stack gap={4}>
          <Text size="sm">Note content or titles</Text>
          <Text size="sm">Personal information</Text>
          <Text size="sm">Skeleton Key or encryption data</Text>
        </Stack>
      </Alert>
    </Stack>
  );
}
