/**
 * Danger Zone Settings Sheet
 * Features: Reset vault, clear data with confirmation
 */

import { useState, useCallback } from 'react';
import { Stack, Text, Box, Button, TextInput, Alert } from '@mantine/core';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { BottomSheet } from '../primitives';

interface DangerZoneSheetProps {
  opened: boolean;
  onClose: () => void;
  onResetVault: () => void;
}

export function DangerZoneSheet({
  opened,
  onClose,
  onResetVault,
}: DangerZoneSheetProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const CONFIRM_PHRASE = 'DELETE';
  const isConfirmValid = confirmText === CONFIRM_PHRASE;

  // Handle reset vault
  const handleResetVault = useCallback(() => {
    if (isConfirmValid) {
      onResetVault();
      onClose();
    }
  }, [isConfirmValid, onResetVault, onClose]);

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setConfirmText('');
    setIsConfirming(false);
    onClose();
  }, [onClose]);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Danger Zone"
      size="md"
    >
      <Stack gap="lg" p="md">
        <Alert
          icon={<AlertTriangle size={20} />}
          title="Warning"
          color="brick"
          variant="light"
        >
          Actions in this section are irreversible. Please proceed with caution.
        </Alert>

        {/* Reset Vault Section */}
        <Box
          style={{
            padding: 16,
            border: '1px solid var(--mantine-color-brick-3)',
            borderRadius: 8,
            backgroundColor: 'var(--mantine-color-brick-0)',
          }}
        >
          <Stack gap="md">
            <Stack gap="xs">
              <Text size="sm" fw={600} c="brick">
                Reset Vault
              </Text>
              <Text size="sm" c="dimmed">
                This will permanently delete all your data including notes,
                tasks, projects, and settings. Your Skeleton Key will be
                destroyed.
              </Text>
            </Stack>

            {!isConfirming ? (
              <Button
                variant="light"
                color="brick"
                leftSection={<Trash2 size={16} />}
                onClick={() => setIsConfirming(true)}
              >
                Reset Vault
              </Button>
            ) : (
              <Stack gap="sm">
                <Text size="xs" c="dimmed">
                  Type <strong>{CONFIRM_PHRASE}</strong> to confirm:
                </Text>
                <TextInput
                  placeholder={`Type ${CONFIRM_PHRASE}`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  error={confirmText.length > 0 && !isConfirmValid}
                  autoFocus
                />
                <Button
                  color="brick"
                  disabled={!isConfirmValid}
                  onClick={handleResetVault}
                  fullWidth
                >
                  Permanently Delete Everything
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    setConfirmText('');
                    setIsConfirming(false);
                  }}
                >
                  Cancel
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      </Stack>
    </BottomSheet>
  );
}
