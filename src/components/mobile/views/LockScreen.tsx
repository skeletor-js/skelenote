/**
 * Mobile Lock Screen
 * Shows when app is locked and biometric unlock is enabled.
 * User must authenticate with Face ID, Touch ID, fingerprint, or device passcode.
 */

import { useState, useEffect, useCallback } from 'react';
import { Stack, Box, Text, Button } from '@mantine/core';
import { Lock, Fingerprint } from 'lucide-react';
import { useBiometric } from '@/hooks';
import { usePlatform } from '@/hooks';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const {
    biometryName,
    authenticate,
    isLoading: biometricLoading,
  } = useBiometric();
  const { safeAreaTop, safeAreaBottom } = usePlatform();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthenticate = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const success = await authenticate('Unlock Skelenote');
      if (success) {
        onUnlock();
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
      console.error('[LockScreen] Auth error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  }, [authenticate, onUnlock]);

  // Auto-trigger biometric on mount (after a brief delay for UI to render)
  useEffect(() => {
    if (!biometricLoading) {
      const timer = setTimeout(() => {
        handleAuthenticate();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [biometricLoading, handleAuthenticate]);

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--surface-canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: safeAreaTop,
        paddingBottom: safeAreaBottom,
      }}
    >
      <Stack align="center" gap="xl" style={{ maxWidth: 300, padding: 24 }}>
        {/* App icon/branding */}
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: 'var(--mantine-color-ember-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock size={40} color="white" />
        </Box>

        <Stack align="center" gap="xs">
          <Text size="xl" fw={600}>
            Skelenote
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Unlock with {biometryName} to access your notes
          </Text>
        </Stack>

        {error && (
          <Text size="sm" c="brick" ta="center">
            {error}
          </Text>
        )}

        <Button
          size="lg"
          variant="filled"
          color="ember"
          leftSection={<Fingerprint size={20} />}
          onClick={handleAuthenticate}
          loading={isAuthenticating}
          disabled={biometricLoading}
          fullWidth
        >
          Unlock with {biometryName}
        </Button>
      </Stack>
    </Box>
  );
}
