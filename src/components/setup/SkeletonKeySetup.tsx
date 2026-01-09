/**
 * Skeleton Key Setup Component
 *
 * First-run setup flow for creating or importing the Skeleton Key.
 * The Skeleton Key is a 24-word BIP39 mnemonic that serves as the
 * master encryption key for zero-knowledge sync.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Stack,
  Group,
  Title,
  Text,
  Button,
  TextInput,
  Textarea,
  Alert,
  SimpleGrid,
  Box,
  Image,
  Center,
  UnstyledButton,
  ThemeIcon,
} from '@mantine/core';
import { useSkeletonKey } from '@/contexts/SkeletonKeyContext';
import { Icon } from '@/components/ui/Icon';

type SetupStep = 'choice' | 'generate' | 'confirm' | 'import' | 'complete';

export function SkeletonKeySetup() {
  const {
    generateNewKey,
    importFromMnemonic,
    getQRCode,
    validateMnemonicPhrase,
    isLoading,
    error,
    clearError,
  } = useSkeletonKey();

  const [step, setStep] = useState<SetupStep>('choice');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [importInput, setImportInput] = useState('');
  const [confirmInputs, setConfirmInputs] = useState<string[]>(['', '', '']);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Split mnemonic into words
  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);

  // Generate 3 random word indices for verification
  const [verificationIndices] = useState(() => {
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * 24));
    }
    return Array.from(indices).sort((a, b) => a - b);
  });

  // Handle creating a new Skeleton Key
  const handleCreate = useCallback(async () => {
    try {
      clearError();
      setLocalError(null);
      const newMnemonic = await generateNewKey();
      setMnemonic(newMnemonic);

      // Generate QR code
      const qr = await getQRCode(newMnemonic);
      setQrCode(qr);

      setStep('generate');
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to generate key'
      );
    }
  }, [generateNewKey, getQRCode, clearError]);

  // Handle proceeding to confirmation
  const handleProceedToConfirm = useCallback(() => {
    setStep('confirm');
    setConfirmInputs(['', '', '']);
  }, []);

  // Handle copying mnemonic to clipboard
  const handleCopyMnemonic = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[SkeletonKeySetup] Failed to copy:', err);
      setLocalError('Failed to copy to clipboard');
    }
  }, [mnemonic]);

  // Handle confirmation input changes
  const handleConfirmInputChange = useCallback(
    (index: number, value: string) => {
      setConfirmInputs((prev) => {
        const newInputs = [...prev];
        newInputs[index] = value.toLowerCase().trim();
        return newInputs;
      });
    },
    []
  );

  // Verify confirmation words and complete setup
  const handleVerifyAndComplete = useCallback(async () => {
    setLocalError(null);

    // Check each verification word
    const isCorrect = verificationIndices.every(
      (wordIndex, inputIndex) =>
        confirmInputs[inputIndex].toLowerCase() ===
        words[wordIndex].toLowerCase()
    );

    if (!isCorrect) {
      setLocalError(
        "The words don't match. Please check your backup and try again."
      );
      return;
    }

    try {
      await importFromMnemonic(mnemonic);
      setStep('complete');
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to save Skeleton Key'
      );
    }
  }, [verificationIndices, confirmInputs, words, mnemonic, importFromMnemonic]);

  // Handle importing an existing Skeleton Key
  const handleImport = useCallback(async () => {
    setLocalError(null);

    const normalizedInput = importInput.trim().toLowerCase();

    // Validate first
    const isValid = await validateMnemonicPhrase(normalizedInput);
    if (!isValid) {
      setLocalError(
        'Invalid Skeleton Key. Please enter all 24 words separated by spaces.'
      );
      return;
    }

    try {
      await importFromMnemonic(normalizedInput);
      setStep('complete');
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to import Skeleton Key'
      );
    }
  }, [importInput, validateMnemonicPhrase, importFromMnemonic]);

  // Go back to choice step
  const handleBack = useCallback(() => {
    setStep('choice');
    setMnemonic('');
    setQrCode('');
    setImportInput('');
    setConfirmInputs(['', '', '']);
    setLocalError(null);
    setCopied(false);
    clearError();
  }, [clearError]);

  const displayError = localError || error;

  return (
    <Center
      h="100vh"
      p="xl"
      style={{ backgroundColor: 'var(--mantine-color-body)' }}
    >
      <Box maw={500} w="100%">
        {/* Header */}
        <Stack align="center" gap="xs" mb="xl">
          <ThemeIcon size={64} radius="sm" variant="light" color="ember">
            <Icon name="key" size={32} />
          </ThemeIcon>
          <Title order={1} ta="center">
            Skeleton Key
          </Title>
          <Text c="dimmed" ta="center">
            Your encryption key for secure, zero-knowledge sync
          </Text>
        </Stack>

        {/* Choice Step */}
        {step === 'choice' && (
          <Stack gap="lg">
            <Text ta="center">
              Your Skeleton Key is a 24-word phrase that encrypts all your data.
              The sync server never sees your notes - only you can read them.
            </Text>

            <Alert color="ochre" variant="light">
              <Text size="sm">
                <strong>Important:</strong> If you lose your Skeleton Key, you
                lose access to synced data. There is no recovery option.
              </Text>
            </Alert>

            <Stack gap="md">
              <UnstyledButton
                onClick={handleCreate}
                disabled={isLoading}
                p="md"
                style={{
                  backgroundColor: 'var(--mantine-color-ember-light)',
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '2px solid var(--mantine-color-ember-6)',
                }}
              >
                <Group wrap="nowrap">
                  <ThemeIcon size={40} radius="md" color="ember">
                    <Icon name="plus" size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600}>Create New Skeleton Key</Text>
                    <Text size="sm" c="dimmed">
                      Generate a new encryption key
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                onClick={() => setStep('import')}
                disabled={isLoading}
                p="md"
                style={{
                  backgroundColor: 'var(--mantine-color-default-hover)',
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '2px solid transparent',
                }}
              >
                <Group wrap="nowrap">
                  <ThemeIcon size={40} radius="md" variant="light" color="gray">
                    <Icon name="download" size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600}>Import Existing Key</Text>
                    <Text size="sm" c="dimmed">
                      Enter your 24-word phrase
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>
            </Stack>
          </Stack>
        )}

        {/* Generate Step - Display the mnemonic */}
        {step === 'generate' && (
          <Stack gap="lg">
            <Text ta="center">
              Write down these 24 words in order and store them somewhere safe.
              You will need them to sync on other devices.
            </Text>

            <SimpleGrid cols={4} spacing="xs">
              {words.map((word, index) => (
                <Box
                  key={index}
                  p="xs"
                  style={{
                    backgroundColor: 'var(--mantine-color-default-hover)',
                    borderRadius: 'var(--mantine-radius-sm)',
                  }}
                >
                  <Text size="xs" c="dimmed">
                    {index + 1}
                  </Text>
                  <Text size="sm" fw={500}>
                    {word}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>

            <Button
              variant="light"
              leftSection={<Icon name={copied ? 'check' : 'copy'} size={16} />}
              onClick={handleCopyMnemonic}
              fullWidth
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>

            {qrCode && (
              <Stack align="center" gap="xs">
                <Text size="sm" c="dimmed">
                  Or scan this QR code on another device:
                </Text>
                <Image
                  src={qrCode}
                  alt="Skeleton Key QR Code"
                  w={160}
                  h={160}
                  radius="md"
                />
              </Stack>
            )}

            <Group justify="space-between">
              <Button variant="subtle" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleProceedToConfirm}>
                I've saved my Skeleton Key
              </Button>
            </Group>
          </Stack>
        )}

        {/* Confirm Step - Verify backup */}
        {step === 'confirm' && (
          <Stack gap="lg">
            <Text ta="center">
              Enter the following words from your Skeleton Key to confirm you've
              saved it:
            </Text>

            <Stack gap="md">
              {verificationIndices.map((wordIndex, inputIndex) => (
                <TextInput
                  key={wordIndex}
                  label={`Word #${wordIndex + 1}`}
                  value={confirmInputs[inputIndex]}
                  onChange={(e) =>
                    handleConfirmInputChange(inputIndex, e.target.value)
                  }
                  placeholder={`Enter word #${wordIndex + 1}`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              ))}
            </Stack>

            {displayError && (
              <Alert color="brick" variant="light">
                {displayError}
              </Alert>
            )}

            <Group justify="space-between">
              <Button variant="subtle" onClick={() => setStep('generate')}>
                Back
              </Button>
              <Button
                onClick={handleVerifyAndComplete}
                disabled={
                  isLoading || confirmInputs.some((input) => !input.trim())
                }
                loading={isLoading}
              >
                Verify & Continue
              </Button>
            </Group>
          </Stack>
        )}

        {/* Import Step */}
        {step === 'import' && (
          <Stack gap="lg">
            <Text ta="center">
              Enter your 24-word Skeleton Key to sync with your existing data.
            </Text>

            <Textarea
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Enter your 24 words separated by spaces..."
              rows={4}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />

            {displayError && (
              <Alert color="brick" variant="light">
                {displayError}
              </Alert>
            )}

            <Group justify="space-between">
              <Button variant="subtle" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading || !importInput.trim()}
                loading={isLoading}
              >
                Import Skeleton Key
              </Button>
            </Group>
          </Stack>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <Stack align="center" gap="lg">
            <ThemeIcon size={80} radius="sm" color="sage" variant="light">
              <Icon name="check-circle" size={40} />
            </ThemeIcon>
            <Title order={2} ta="center">
              Skeleton Key Ready
            </Title>
            <Text c="dimmed" ta="center">
              Your encryption is set up. All synced data will be encrypted with
              your Skeleton Key.
            </Text>
            <Alert variant="light" color="gray" mt="md">
              <Text size="sm">
                <strong>Tip:</strong> Consider exporting your vault regularly as
                a backup. Go to Settings → Data → Export to create a Markdown
                archive of all your notes.
              </Text>
            </Alert>
          </Stack>
        )}
      </Box>
    </Center>
  );
}
