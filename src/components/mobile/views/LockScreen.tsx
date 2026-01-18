/**
 * Mobile Lock Screen
 * Shows when app is locked and biometric unlock is enabled.
 * User must authenticate with Face ID, Touch ID, fingerprint, or device passcode.
 * Features success animation with haptic feedback on unlock.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stack, Box, Text, Button } from '@mantine/core';
import { Lock, Fingerprint, Check } from 'lucide-react';
import { useBiometric, useHaptics, useReducedMotion } from '@/hooks';
import { usePlatform } from '@/hooks';
import { springs } from '@/lib/animations';

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
  const { notification } = useHaptics();
  const reduceMotion = useReducedMotion();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state to prevent state updates/callbacks after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleAuthenticate = useCallback(async () => {
    if (!isMounted.current) return;
    setIsAuthenticating(true);
    setError(null);

    try {
      const success = await authenticate('Unlock Skelenote');
      if (!isMounted.current) return;

      if (success) {
        // Show success animation with haptic
        await notification('success');
        if (isMounted.current) setIsSuccess(true);
        // Delay unlock to show success animation
        setTimeout(
          () => {
            if (isMounted.current) onUnlock();
          },
          reduceMotion ? 0 : 600
        );
      } else {
        await notification('error');
        if (isMounted.current)
          setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      if (!isMounted.current) return;
      await notification('error');
      setError('Authentication failed. Please try again.');
      console.error('[LockScreen] Auth error:', err);
    } finally {
      if (isMounted.current) {
        setIsAuthenticating(false);
      }
    }
  }, [authenticate, onUnlock, notification, reduceMotion]);

  // Auto-trigger biometric on mount (after a brief delay for UI to render)
  useEffect(() => {
    if (!biometricLoading) {
      const timer = setTimeout(() => {
        if (isMounted.current) handleAuthenticate();
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
        {/* App icon/branding with success animation */}
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: isSuccess
              ? 'var(--mantine-color-sage-6)'
              : 'var(--mantine-color-ember-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: reduceMotion ? 'none' : 'background-color 0.3s ease',
            overflow: 'hidden',
          }}
        >
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : springs.bouncy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={44} color="white" strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.div
                key="lock"
                initial={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={40} color="white" />
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.1 }}
            >
              <Text size="xl" fw={600} c="sage">
                Unlocked
              </Text>
            </motion.div>
          ) : (
            <motion.div
              key="normal-text"
              exit={{ opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
            >
              <Stack align="center" gap="xs">
                <Text size="xl" fw={600}>
                  Skelenote
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Unlock with {biometryName} to access your notes
                </Text>
              </Stack>
            </motion.div>
          )}
        </AnimatePresence>

        {error && !isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
          >
            <Text size="sm" c="brick" ta="center">
              {error}
            </Text>
          </motion.div>
        )}

        {!isSuccess && (
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
        )}
      </Stack>
    </Box>
  );
}
