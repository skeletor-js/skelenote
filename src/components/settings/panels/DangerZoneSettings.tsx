/**
 * Danger Zone Settings Panel
 *
 * Destructive actions: Reset Vault.
 * Extracted from SyncSettings.tsx.
 */

import { useState, useCallback } from 'react';
import { Stack, Group, Text, Box, Button, Alert, Divider } from '@mantine/core';
import { Icon } from '@/components/ui';
import { useSyncContextSafe, useSkeletonKeySafe } from '@/contexts';

export function DangerZoneSettings() {
  const syncContext = useSyncContextSafe();
  const skeletonKeyContext = useSkeletonKeySafe();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Handle vault reset
  const handleResetVault = useCallback(async () => {
    if (!skeletonKeyContext) return;

    setIsResetting(true);
    try {
      // Disconnect sync first
      syncContext?.disconnect();

      // Reset the vault
      await skeletonKeyContext.resetVault();

      // The app will now show the Skeleton Key setup screen
    } catch (err) {
      console.error('[DangerZone] Failed to reset vault:', err);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  }, [skeletonKeyContext, syncContext]);

  return (
    <Stack gap="lg">
      <Box>
        <Group gap="xs" mb="xs">
          <Icon
            name="alert-triangle"
            size={18}
            color="var(--mantine-color-brick-5)"
          />
          <Text size="xl" fw={600} c="brick">
            Danger Zone
          </Text>
        </Group>
        <Text size="sm" c="dimmed">
          These actions are destructive and cannot be easily undone.
        </Text>
      </Box>

      <Divider />

      <Alert
        variant="light"
        color="brick"
        styles={{
          root: {
            borderLeft: '3px solid var(--mantine-color-brick-5)',
          },
        }}
      >
        <Stack gap="lg">
          {/* Reset Vault */}
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Reset Vault
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Reset your vault to use a different Skeleton Key. This will
              disconnect sync and clear your encryption key from this device.
              Your data will remain but you'll need to re-enter your Skeleton
              Key.
            </Text>

            {showResetConfirm ? (
              <Group gap="sm">
                <Text size="sm">Are you sure?</Text>
                <Button
                  size="xs"
                  color="brick"
                  onClick={handleResetVault}
                  disabled={isResetting}
                  loading={isResetting}
                >
                  Yes, Reset
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
              </Group>
            ) : (
              <Button
                variant="outline"
                color="brick"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
              >
                Reset Vault
              </Button>
            )}
          </Box>
        </Stack>
      </Alert>
    </Stack>
  );
}
