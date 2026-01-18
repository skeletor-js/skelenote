/**
 * SearchSettingsSheet - Mobile settings for Lantern (AI-powered search)
 *
 * Features:
 * - Enable/disable Lantern toggle
 * - Progress indicator during download/indexing
 * - Index stats when enabled (count, last updated)
 * - Similarity threshold selector
 * - Rebuild index action
 */

import { useState, useCallback } from 'react';
import {
  Stack,
  Group,
  Text,
  Switch,
  Progress,
  Box,
  Alert,
  Button,
  SegmentedControl,
  Divider,
} from '@mantine/core';
import { Sparkles, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useSemanticSearchSafe, useObjects } from '@/contexts';
import { useHaptics } from '@/hooks';
import { IndexableContent, extractPlainText } from '@/lib/semantic';

interface SearchSettingsSheetProps {
  opened: boolean;
  onClose: () => void;
}

export function SearchSettingsSheet({
  opened,
  onClose,
}: SearchSettingsSheetProps) {
  const semanticContext = useSemanticSearchSafe();
  const objectsContext = useObjects();
  const haptics = useHaptics();

  const [isEnabling, setIsEnabling] = useState(false);
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
    setIsEnabling(true);
    haptics.impact('medium');
    try {
      const content = getIndexableContent();
      await semanticContext.enable(content);
      haptics.notification('success');
    } catch {
      haptics.notification('error');
    } finally {
      setIsEnabling(false);
    }
  }, [semanticContext, getIndexableContent, haptics]);

  const handleRebuildIndex = useCallback(async () => {
    if (!semanticContext) return;
    setIsRebuilding(true);
    haptics.impact('medium');
    try {
      const content = getIndexableContent();
      await semanticContext.rebuildIndex(content);
      haptics.notification('success');
    } catch {
      haptics.notification('error');
    } finally {
      setIsRebuilding(false);
    }
  }, [semanticContext, getIndexableContent, haptics]);

  const handleDisable = useCallback(async () => {
    if (!semanticContext) return;
    setIsDisabling(true);
    haptics.impact('medium');
    try {
      await semanticContext.disable(true);
      haptics.notification('success');
    } finally {
      setIsDisabling(false);
      setShowDisableConfirm(false);
    }
  }, [semanticContext, haptics]);

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
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
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
    haptics.selection();
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

  // Get progress description
  const getProgressDescription = () => {
    if (!progress) return null;
    switch (progress.operation) {
      case 'download':
        return 'Downloading AI model...';
      case 'load':
        return 'Loading model...';
      case 'index':
        return 'Building search index...';
      default:
        return progress.message;
    }
  };

  return (
    <BottomSheet
      title="Search Settings"
      opened={opened}
      onClose={onClose}
      size="lg"
    >
      <Stack gap="lg" px="md" pb="xl">
        {/* Enable toggle */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Sparkles
              size={20}
              style={{ color: 'var(--mantine-color-clay-5)' }}
            />
            <Box>
              <Text size="sm" fw={500}>
                Lantern
              </Text>
              <Text size="xs" c="dimmed">
                Find connections across your notes
              </Text>
            </Box>
          </Group>
          <Switch
            checked={isEnabled}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                handleEnable();
              } else {
                setShowDisableConfirm(true);
              }
            }}
            disabled={isEnabling || isDisabling}
            size="md"
          />
        </Group>

        {/* Progress during enable */}
        {isEnabling && progress && (
          <Box>
            <Text size="xs" c="dimmed" mb="xs">
              {getProgressDescription()}
            </Text>
            <Progress value={progress.percent} size="sm" animated />
            {progress.current !== undefined && progress.total !== undefined && (
              <Text size="xs" c="dimmed" ta="right" mt={4}>
                {progress.current} / {progress.total}
              </Text>
            )}
          </Box>
        )}

        {/* Disable confirmation */}
        {showDisableConfirm && (
          <Alert
            variant="light"
            color="ochre"
            icon={<AlertTriangle size={16} />}
          >
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
                  Disable
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

        {/* Not enabled info */}
        {!isEnabled && !isEnabling && (
          <>
            <Alert variant="light" color="slate" icon={<Info size={16} />}>
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  Requirements
                </Text>
                <Text size="xs">One-time 23MB download</Text>
                <Text size="xs">~500MB RAM when active</Text>
                <Text size="xs">Works offline after setup</Text>
              </Stack>
            </Alert>

            <Box>
              <Text size="sm" fw={500} mb="xs">
                What you'll get
              </Text>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Find related notes even with different wording
                </Text>
                <Text size="xs" c="dimmed">
                  "Find similar" suggestions on every object
                </Text>
                <Text size="xs" c="dimmed">
                  AI-powered results alongside text search
                </Text>
              </Stack>
            </Box>
          </>
        )}

        {/* Enabled state - Index status and settings */}
        {isEnabled && !isEnabling && (
          <>
            <Divider />

            {/* Index status */}
            <Box>
              <Text size="sm" fw={500} mb="sm">
                Index Status
              </Text>
              <Group justify="space-around">
                <Box ta="center">
                  <Text size="xl" fw={600}>
                    {indexedCount}
                  </Text>
                  <Text size="xs" c="dimmed">
                    indexed
                  </Text>
                </Box>
                <Box ta="center">
                  <Text size="xl" fw={600}>
                    {formatLastIndexed()}
                  </Text>
                  <Text size="xs" c="dimmed">
                    last update
                  </Text>
                </Box>
                <Box ta="center">
                  <Text
                    size="xl"
                    fw={600}
                    c={
                      status === 'ready'
                        ? 'sage'
                        : status === 'indexing'
                          ? 'ochre'
                          : 'gray'
                    }
                  >
                    {status === 'ready' ? 'Ready' : status}
                  </Text>
                  <Text size="xs" c="dimmed">
                    status
                  </Text>
                </Box>
              </Group>

              {/* Rebuilding progress */}
              {isRebuilding && progress && (
                <Box mt="sm">
                  <Progress value={progress.percent} size="sm" animated />
                  <Text size="xs" c="dimmed" mt={4}>
                    {progress.message}
                  </Text>
                </Box>
              )}
            </Box>

            <Divider />

            {/* Similarity threshold */}
            <Box>
              <Text size="sm" fw={500} mb="xs">
                Similarity Threshold
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                Lower = more results. Higher = stricter matching.
              </Text>
              <SegmentedControl
                value={getThresholdPreset()}
                onChange={handleThresholdChange}
                radius="sm"
                size="xs"
                data={[
                  { label: 'Broad', value: 'broad' },
                  { label: 'Balanced', value: 'balanced' },
                  { label: 'Strict', value: 'strict' },
                  { label: 'Very Strict', value: 'very-strict' },
                ]}
                fullWidth
              />
            </Box>

            <Divider />

            {/* Actions */}
            <Button
              variant="light"
              leftSection={<RefreshCw size={16} />}
              onClick={handleRebuildIndex}
              disabled={isRebuilding || status !== 'ready'}
              loading={isRebuilding}
              fullWidth
            >
              Rebuild Index
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              Use if search quality degrades or after bulk imports
            </Text>
          </>
        )}

        {/* Error */}
        {error && (
          <Alert color="brick" icon={<AlertTriangle size={16} />}>
            {error}
          </Alert>
        )}
      </Stack>
    </BottomSheet>
  );
}
