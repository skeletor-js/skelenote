/**
 * About Settings Panel
 *
 * App information, version, and keyboard shortcuts link.
 */

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Box,
  Button,
  Code,
  Anchor,
  Divider,
} from '@mantine/core';
import { Icon } from '@/components/ui';
import { KeyboardShortcutsModal } from '@/components/help';

// Version is defined in package.json
const APP_VERSION = '0.1.0';

export function AboutSettings() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <Stack gap="lg">
      <Box>
        <Text size="xl" fw={600} mb="xs">
          About
        </Text>
        <Text size="sm" c="dimmed">
          Information about Skelenote.
        </Text>
      </Box>

      <Divider />

      {/* Version */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          Version
        </Text>
        <Group gap="xs">
          <Code>{APP_VERSION}</Code>
        </Group>
      </Box>

      {/* Keyboard Shortcuts */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          Keyboard Shortcuts
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          View all available keyboard shortcuts for quick navigation and
          actions.
        </Text>
        <Button
          variant="light"
          size="sm"
          leftSection={<Icon name="keyboard" size={14} />}
          onClick={() => setShowShortcuts(true)}
        >
          View Shortcuts
        </Button>
      </Box>

      {/* Links */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          Links
        </Text>
        <Stack gap="xs">
          <Group gap="xs">
            <Icon name="book-open" size={14} />
            <Anchor href="https://skelenote.app/docs" target="_blank" size="sm">
              Documentation
            </Anchor>
          </Group>
          <Group gap="xs">
            <Icon name="github" size={14} />
            <Anchor
              href="https://github.com/skelenote/skelenote"
              target="_blank"
              size="sm"
            >
              GitHub Repository
            </Anchor>
          </Group>
          <Group gap="xs">
            <Icon name="message-circle" size={14} />
            <Anchor
              href="https://skelenote.app/feedback"
              target="_blank"
              size="sm"
            >
              Send Feedback
            </Anchor>
          </Group>
        </Stack>
      </Box>

      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </Stack>
  );
}
