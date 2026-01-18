/**
 * Search Settings Panel
 *
 * Lantern (AI-powered search) configuration including enable/disable toggle.
 * Extracted from SemanticSettings.tsx
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  Checkbox,
  Progress,
  Box,
  Alert,
  SegmentedControl,
  Divider,
} from '@mantine/core';
import { useSemanticSearchSafe, useObjects } from '@/contexts';
import { SemanticEnableModal } from '../SemanticEnableModal';
import { IndexableContent, extractPlainText } from '@/lib/semantic';

export function SearchSettings() {
  const semanticContext = useSemanticSearchSafe();
  const objectsContext = useObjects();
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Get indexable content from objects
  const getIndexableContent = useCallback((): IndexableContent[] => {
    if (!objectsContext?.store) return [];

    const store = objectsContext.store;
    const objects = store.getAll();
    const typeRegistry = objectsContext.typeRegistry;

    return objects.map((obj) => {
      // Get title from properties
      const titleProp = obj.properties.title ?? obj.properties.name;
      const title = typeof titleProp === 'string' ? titleProp : obj.id;

      // Get content if object has content
      let content = '';
      if (obj.hasContent) {
        const rawContent = store.getContent(obj.id);
        if (rawContent) {
          // Extract plain text from BlockNote content
          try {
            const blocks = JSON.parse(rawContent);
            content = extractPlainText(blocks);
          } catch {
            content = rawContent;
          }
        }
      }

      // Add properties to content for better matching
      const propTexts: string[] = [];
      const typeDef = typeRegistry?.get(obj.typeId);
      if (typeDef?.schema) {
        for (const propDef of typeDef.schema) {
          const value = obj.properties[propDef.id];
          if (value && typeof value === 'string' && propDef.type === 'text') {
            propTexts.push(value);
          }
        }
      }

      return {
        objectId: obj.id,
        title,
        content: [content, ...propTexts].filter(Boolean).join('\n'),
      };
    });
  }, [objectsContext]);

  const handleEnable = useCallback(async () => {
    if (!semanticContext) return;
    const content = getIndexableContent();
    await semanticContext.enable(content);
  }, [semanticContext, getIndexableContent]);

  const handleRebuildIndex = useCallback(async () => {
    if (!semanticContext) return;
    setIsRebuilding(true);
    try {
      const content = getIndexableContent();
      await semanticContext.rebuildIndex(content);
    } finally {
      setIsRebuilding(false);
    }
  }, [semanticContext, getIndexableContent]);

  const handleDisable = useCallback(async () => {
    if (!semanticContext) return;
    setIsDisabling(true);
    try {
      await semanticContext.disable(true);
    } finally {
      setIsDisabling(false);
      setShowDisableConfirm(false);
    }
  }, [semanticContext]);

  if (!semanticContext) {
    return null;
  }

  const {
    isEnabled,
    status,
    indexedCount,
    progress,
    error,
    threshold,
    setThreshold,
  } = semanticContext;

  // Format last indexed time
  const formatLastIndexed = () => {
    const engine = semanticContext.getEngine();
    const stats = engine?.getStats();
    if (!stats?.lastIndexedAt) return 'Never';

    const diff = Date.now() - stats.lastIndexedAt;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(stats.lastIndexedAt).toLocaleDateString();
  };

  // Get threshold preset value
  const getThresholdPreset = () => {
    if (threshold <= 0.15) return 'broad';
    if (threshold <= 0.25) return 'balanced';
    if (threshold <= 0.45) return 'strict';
    return 'very-strict';
  };

  const handleThresholdChange = (value: string) => {
    switch (value) {
      case 'broad':
        setThreshold(0.15);
        break;
      case 'balanced':
        setThreshold(0.2);
        break;
      case 'strict':
        setThreshold(0.35);
        break;
      case 'very-strict':
        setThreshold(0.5);
        break;
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Text size="xl" fw={600} mb="xs">
          Search
        </Text>
        <Text size="sm" c="dimmed">
          Lantern finds connections across your notes — even when the words
          don't match.
        </Text>
      </Box>

      <Divider />

      {!isEnabled ? (
        <Stack gap="md">
          <Checkbox
            label="Enable Lantern"
            checked={false}
            onChange={() => setShowEnableModal(true)}
          />

          <Text size="sm" c="dimmed">
            Find conceptually similar content, not just keyword matches. All
            processing happens locally on your device.
          </Text>

          <Alert variant="light" color="slate" title="Requirements">
            <Stack gap={4}>
              <Text size="sm">• Requires one-time 23MB download</Text>
              <Text size="sm">• Uses ~500MB RAM when active</Text>
              <Text size="sm">• Works offline after setup</Text>
            </Stack>
          </Alert>
        </Stack>
      ) : (
        <Stack gap="lg">
          <Group justify="space-between">
            <Checkbox
              label="Enable Lantern"
              checked={true}
              onChange={() => setShowDisableConfirm(true)}
              disabled={isDisabling}
            />
            <Text
              size="sm"
              c={
                status === 'ready'
                  ? 'sage'
                  : status === 'indexing'
                    ? 'ochre'
                    : 'gray'
              }
            >
              {status === 'ready'
                ? 'Active'
                : status === 'indexing'
                  ? 'Indexing...'
                  : status}
            </Text>
          </Group>

          {showDisableConfirm && (
            <Alert variant="light" color="ochre">
              <Stack gap="xs">
                <Text size="sm">
                  This will delete the search index (~50MB). You can re-enable
                  later.
                </Text>
                <Group gap="sm">
                  <Button
                    size="xs"
                    color="brick"
                    onClick={handleDisable}
                    disabled={isDisabling}
                    loading={isDisabling}
                  >
                    Yes, Disable
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => setShowDisableConfirm(false)}
                    disabled={isDisabling}
                  >
                    Cancel
                  </Button>
                </Group>
              </Stack>
            </Alert>
          )}

          <Box>
            <Text size="sm" fw={500} mb="xs">
              Index Status
            </Text>
            <Group gap="lg">
              <Box ta="center">
                <Text size="xl" fw={600}>
                  {indexedCount}
                </Text>
                <Text size="xs" c="dimmed">
                  objects indexed
                </Text>
              </Box>
              <Box ta="center">
                <Text size="xl" fw={600}>
                  {formatLastIndexed()}
                </Text>
                <Text size="xs" c="dimmed">
                  last updated
                </Text>
              </Box>
            </Group>

            {progress && (
              <Box mt="sm">
                <Progress value={progress.percent} mb="xs" />
                <Text size="sm" c="dimmed">
                  {progress.message}
                </Text>
              </Box>
            )}

            <Button
              variant="light"
              size="sm"
              mt="sm"
              onClick={handleRebuildIndex}
              disabled={isRebuilding || status !== 'ready'}
              loading={isRebuilding}
            >
              Rebuild Index
            </Button>
            <Text size="xs" c="dimmed" mt="xs">
              Use if search quality degrades or after bulk imports.
            </Text>
          </Box>

          <Box>
            <Text size="sm" fw={500} mb="xs">
              Similarity Threshold
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Controls how closely related results must be. Lower = more
              results, Higher = stricter matching.
            </Text>
            <SegmentedControl
              value={getThresholdPreset()}
              onChange={handleThresholdChange}
              radius="sm"
              data={[
                { label: 'Broad (15%)', value: 'broad' },
                { label: 'Balanced (20%)', value: 'balanced' },
                { label: 'Strict (35%)', value: 'strict' },
                { label: 'Very Strict (50%)', value: 'very-strict' },
              ]}
              fullWidth
            />
          </Box>
        </Stack>
      )}

      {error && (
        <Alert color="brick" mt="md">
          {error}
        </Alert>
      )}

      <SemanticEnableModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onConfirm={handleEnable}
        progress={progress}
        error={error}
      />
    </Stack>
  );
}
