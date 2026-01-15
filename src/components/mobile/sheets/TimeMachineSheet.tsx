/**
 * Time Machine Sheet
 * Features: View version history for an object, preview versions, restore
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  Button,
  Group,
  Badge,
  ScrollArea,
  Center,
} from '@mantine/core';
import { History, RotateCcw, Clock } from 'lucide-react';
import { useObjects, useToast } from '@/contexts';
import { BottomSheet } from '../primitives';
import type { ChangePoint, ObjectVersionHistory } from '@/lib/loro/versions';

interface TimeMachineSheetProps {
  opened: boolean;
  onClose: () => void;
  objectId: string;
  objectTitle: string;
}

export function TimeMachineSheet({
  opened,
  onClose,
  objectId,
  objectTitle,
}: TimeMachineSheetProps) {
  const { docStore, refreshData } = useObjects();
  const { addToast } = useToast();

  const [selectedVersion, setSelectedVersion] = useState<ChangePoint | null>(
    null
  );
  const [isRestoring, setIsRestoring] = useState(false);

  // Get version history for this object
  const history = useMemo<ObjectVersionHistory | null>(() => {
    if (!opened || !docStore) return null;
    return docStore.getVersionHistoryForObject(objectId);
  }, [opened, docStore, objectId]);

  // Get change points sorted newest first
  const changePoints = useMemo(() => {
    if (!history) return [];
    return [...history.changePoints].sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  // Format timestamp for display
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatTime(timestamp);
  };

  // Handle restore
  const handleRestore = useCallback(
    (changePoint: ChangePoint) => {
      setIsRestoring(true);
      try {
        const success = docStore.restoreFromVersion(changePoint.frontier, {
          type: 'single',
          objectId,
        });
        if (success) {
          refreshData();
          addToast({
            type: 'success',
            message: 'Version restored successfully',
          });
          onClose();
        } else {
          addToast({
            type: 'error',
            message: 'Failed to restore version',
          });
        }
      } catch (error) {
        addToast({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to restore version',
        });
      } finally {
        setIsRestoring(false);
      }
    },
    [docStore, objectId, refreshData, addToast, onClose]
  );

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setSelectedVersion(null);
    setIsRestoring(false);
    onClose();
  }, [onClose]);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Version History"
      size="lg"
    >
      <Stack gap={0} style={{ height: '100%' }}>
        {/* Object info */}
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <Group gap="sm">
            <History
              size={16}
              style={{ color: 'var(--mantine-color-gray-5)' }}
            />
            <Text size="sm" fw={500} truncate style={{ flex: 1 }}>
              {objectTitle}
            </Text>
            <Badge size="sm" variant="light" color="gray">
              {changePoints.length} version
              {changePoints.length !== 1 ? 's' : ''}
            </Badge>
          </Group>
        </Box>

        {/* Version list */}
        <ScrollArea style={{ flex: 1 }} px="md" py="sm">
          {changePoints.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="sm">
                <Clock
                  size={40}
                  style={{ color: 'var(--mantine-color-gray-4)' }}
                />
                <Text size="sm" c="dimmed" ta="center">
                  No version history available
                </Text>
              </Stack>
            </Center>
          ) : (
            <Stack gap="xs">
              {changePoints.map((cp, index) => {
                const isLatest = index === 0;
                const isSelected = selectedVersion === cp;

                return (
                  <Box
                    key={`${cp.timestamp}-${cp.peerId}`}
                    onClick={() => setSelectedVersion(isSelected ? null : cp)}
                    style={{
                      padding: '12px',
                      borderRadius: 8,
                      border: isSelected
                        ? '2px solid var(--mantine-color-ember-5)'
                        : '1px solid var(--border-default)',
                      backgroundColor: isSelected
                        ? 'var(--mantine-color-ember-0)'
                        : 'var(--surface-paper)',
                      cursor: 'pointer',
                    }}
                  >
                    <Stack gap="xs">
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs">
                          <Text size="sm" fw={500}>
                            {formatTime(cp.timestamp)}
                          </Text>
                          {isLatest && (
                            <Badge size="xs" variant="light" color="sage">
                              Current
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatRelativeTime(cp.timestamp)}
                        </Text>
                      </Group>

                      <Group gap="xs" wrap="nowrap">
                        {cp.deviceName && (
                          <Text size="xs" c="dimmed">
                            {cp.deviceName}
                          </Text>
                        )}
                        <Text size="xs" c="dimmed">
                          {cp.changeCount} change
                          {cp.changeCount !== 1 ? 's' : ''}
                        </Text>
                        {cp.isFromRevokedDevice && (
                          <Badge size="xs" variant="light" color="brick">
                            Revoked device
                          </Badge>
                        )}
                      </Group>

                      {/* Restore button when selected */}
                      {isSelected && !isLatest && (
                        <Button
                          variant="filled"
                          color="ember"
                          size="sm"
                          leftSection={<RotateCcw size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(cp);
                          }}
                          loading={isRestoring}
                          mt="xs"
                        >
                          Restore this version
                        </Button>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </ScrollArea>

        {/* Footer info */}
        <Box
          px="md"
          py="sm"
          style={{
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-overlay)',
          }}
        >
          <Text size="xs" c="dimmed" ta="center">
            Tap a version to select, then restore to go back in time
          </Text>
        </Box>
      </Stack>
    </BottomSheet>
  );
}
