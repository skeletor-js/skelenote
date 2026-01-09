/**
 * Notion Connect Component
 *
 * Token input for connecting to Notion API.
 * Token is stored in memory only (not persisted) for security.
 */

import { useState } from 'react';
import {
  Stack,
  Text,
  Alert,
  TextInput,
  Button,
  Group,
  Anchor,
  Loader,
} from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { NotionClient } from '@/lib/import/notion-api';
import classes from './ImportWizard.module.css';

interface NotionConnectProps {
  onConnect: (client: NotionClient) => void;
  onBack: () => void;
}

export function NotionConnect({ onConnect, onBack }: NotionConnectProps) {
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!token.trim()) {
      setError('Please enter your integration token');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      // Dynamically import the Notion API module
      const { createNotionClient, testConnection } =
        await import('@/lib/import/notion-api');

      const client = createNotionClient(token.trim());
      const result = await testConnection(client);

      if (result.success) {
        onConnect(client);
      } else {
        setError(result.error || 'Failed to connect to Notion');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to connect to Notion'
      );
    } finally {
      setTesting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !testing) {
      handleConnect();
    }
  };

  return (
    <Stack gap="md">
      <Alert variant="light" color="gray" className={classes.instructionsAlert}>
        <Text size="sm" fw={600} mb="xs">
          Connect to Notion
        </Text>
        <Stack gap={4}>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <Text size="xs" c="dimmed" w={16}>
              1.
            </Text>
            <Text size="xs" c="dimmed">
              Go to{' '}
              <Anchor
                href="https://www.notion.so/my-integrations"
                target="_blank"
                size="xs"
              >
                notion.so/my-integrations
              </Anchor>{' '}
              and create a new integration
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <Text size="xs" c="dimmed" w={16}>
              2.
            </Text>
            <Text size="xs" c="dimmed">
              Give it a name (e.g., "Skelenote Import") and select your
              workspace
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <Text size="xs" c="dimmed" w={16}>
              3.
            </Text>
            <Text size="xs" c="dimmed">
              Copy the "Internal Integration Secret" from the Configuration tab
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <Text size="xs" c="dimmed" w={16}>
              4.
            </Text>
            <Text size="xs" c="dimmed">
              Share your databases with the integration via the "..." menu →
              "Add connections"
            </Text>
          </Group>
        </Stack>
      </Alert>

      <TextInput
        label="Integration Token"
        description="Paste your Notion integration secret token"
        placeholder="secret_..."
        value={token}
        onChange={(e) => setToken(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        error={error}
        leftSection={<Icon name="key" size={14} />}
        disabled={testing}
        type="password"
      />

      <Alert
        variant="light"
        color="ochre"
        icon={<Icon name="shield" size={14} />}
      >
        <Text size="xs">
          Your token is stored in memory only and will be forgotten when you
          close this window. We never save or transmit your Notion credentials.
        </Text>
      </Alert>

      <Group justify="space-between">
        <Button variant="subtle" onClick={onBack} disabled={testing}>
          Back
        </Button>
        <Button
          variant="filled"
          color="ember"
          onClick={handleConnect}
          disabled={!token.trim() || testing}
          leftSection={testing ? <Loader size={14} color="white" /> : undefined}
        >
          {testing ? 'Connecting...' : 'Connect'}
        </Button>
      </Group>
    </Stack>
  );
}
