/**
 * Lantern Enable Modal
 *
 * Confirmation dialog shown when user first enables Lantern (AI-powered search).
 * Shows download and indexing progress.
 */

import { useState } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  Progress,
  Alert,
  List,
  ThemeIcon,
} from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import { SemanticProgress } from '@/lib/semantic';

interface SemanticEnableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  progress: SemanticProgress | null;
  error: string | null;
}

export function SemanticEnableModal({
  isOpen,
  onClose,
  onConfirm,
  progress,
  error,
}: SemanticEnableModalProps) {
  const [isEnabling, setIsEnabling] = useState(false);

  const handleConfirm = async () => {
    setIsEnabling(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error is handled via error prop
    } finally {
      setIsEnabling(false);
    }
  };

  const handleCancel = () => {
    if (!isEnabling) {
      onClose();
    }
  };

  // Determine the modal title based on state
  const getTitle = () => {
    if (isEnabling && !error) return 'Setting up Lantern...';
    if (error) return 'Setup Failed';
    return 'Enable Lantern?';
  };

  // Get progress description based on operation
  const getProgressDescription = () => {
    if (!progress) return null;
    switch (progress.operation) {
      case 'download':
        return 'Downloading AI model... This only happens once.';
      case 'load':
        return 'Loading model into memory...';
      case 'index':
        return 'Building search index...';
      default:
        return null;
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleCancel}
      title={getTitle()}
      centered
      size="sm"
      closeOnClickOutside={!isEnabling}
      withCloseButton={!isEnabling || !!error}
    >
      <Stack gap="md">
        {/* Progress view - when enabling */}
        {isEnabling && !error && (
          <>
            {getProgressDescription() && (
              <Text size="sm" c="dimmed">
                {getProgressDescription()}
              </Text>
            )}
            {progress && (
              <Stack gap="xs">
                <Progress value={progress.percent} size="md" animated />
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    {progress.message}
                  </Text>
                  {progress.current !== undefined &&
                    progress.total !== undefined && (
                      <Text size="xs" c="dimmed">
                        {progress.current} / {progress.total}
                      </Text>
                    )}
                </Group>
              </Stack>
            )}
          </>
        )}

        {/* Error view */}
        {error && (
          <>
            <Alert
              color="brick"
              variant="light"
              icon={<Icon name="alert-triangle" size={16} />}
            >
              {error}
            </Alert>
            <Text size="sm" c="dimmed">
              Please check your internet connection and try again.
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" color="gray" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="filled" color="ember" onClick={handleConfirm}>
                Retry
              </Button>
            </Group>
          </>
        )}

        {/* Confirmation view - initial state */}
        {!isEnabling && !error && (
          <>
            <Text size="sm">
              This will download a 23MB AI model to enable concept-based search.
              All processing happens locally on this device.
            </Text>

            <Stack gap="xs">
              <Text size="sm" fw={600}>
                What you'll get:
              </Text>
              <List
                size="sm"
                icon={
                  <ThemeIcon size="xs" variant="transparent" color="sage">
                    <Icon name="check" size={12} />
                  </ThemeIcon>
                }
              >
                <List.Item>
                  Find related notes even with different wording
                </List.Item>
                <List.Item>
                  "Find similar" suggestions on every object
                </List.Item>
                <List.Item>
                  Conceptual matches alongside keyword results
                </List.Item>
              </List>
            </Stack>

            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Requirements:
              </Text>
              <List
                size="sm"
                icon={
                  <ThemeIcon size="xs" variant="transparent" color="gray">
                    <Icon name="info" size={12} />
                  </ThemeIcon>
                }
              >
                <List.Item>One-time 23MB download</List.Item>
                <List.Item>~500MB RAM when active</List.Item>
                <List.Item>Works offline after initial download</List.Item>
              </List>
            </Stack>

            <Group justify="flex-end" gap="sm" mt="md">
              <Button variant="subtle" color="gray" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="filled" color="ember" onClick={handleConfirm}>
                Download & Enable
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
