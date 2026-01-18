import { useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Box,
  Center,
  Loader,
  Code,
  Divider,
  Group,
  Button,
} from '@mantine/core';
import { Icon } from '@/components/ui';
import type { QrCodeResponse } from '@/lib/sync/local';

interface ShowPairingCodeModalProps {
  opened: boolean;
  onClose: () => void;
  onGenerateQr: () => Promise<QrCodeResponse>;
}

export function ShowPairingCodeModal({
  opened,
  onClose,
  onGenerateQr,
}: ShowPairingCodeModalProps) {
  const [qrData, setQrData] = useState<QrCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (opened && !qrData) {
      generateQr();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const generateQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await onGenerateQr();
      setQrData(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatFingerprint = (fp: string): string => {
    // Format as A1B2-C3D4 (4 chars, dash, 4 chars)
    if (fp.length === 8) {
      return `${fp.slice(0, 4).toUpperCase()}-${fp.slice(4).toUpperCase()}`;
    }
    return fp.toUpperCase();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Pair Another Device"
      size="md"
      centered
    >
      <Stack gap="lg">
        {loading && (
          <Center py="xl">
            <Loader size="md" />
          </Center>
        )}

        {error && (
          <Box
            p="md"
            style={(theme) => ({
              borderRadius: theme.radius.sm,
              backgroundColor: 'var(--mantine-color-brick-0)',
              border: '1px solid var(--mantine-color-brick-3)',
            })}
          >
            <Text size="sm" c="brick">
              {error}
            </Text>
          </Box>
        )}

        {qrData && !loading && (
          <>
            {/* QR Code */}
            <Center>
              <Stack gap="xs" align="center">
                <Box
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'white',
                    borderRadius: 'var(--mantine-radius-sm)',
                    border: '1px solid var(--mantine-color-gray-2)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <img
                    src={`data:image/png;base64,${qrData.pngBase64}`}
                    alt="Pairing QR Code"
                    style={{
                      display: 'block',
                      width: '240px',
                      height: '240px',
                      imageRendering: 'pixelated',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFullscreen(true)}
                  />
                </Box>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<Icon name="maximize-2" size={12} />}
                  onClick={() => setFullscreen(true)}
                >
                  Show fullscreen
                </Button>
              </Stack>
            </Center>

            {/* Fingerprint */}
            <Center py="xs">
              <Stack gap={4} align="center">
                <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                  Your code
                </Text>
                <Code
                  fz="lg"
                  fw={600}
                  px="md"
                  py="xs"
                  style={{
                    letterSpacing: '0.05em',
                    fontFamily: 'var(--mantine-font-family-monospace)',
                  }}
                >
                  {formatFingerprint(qrData.fingerprint)}
                </Code>
              </Stack>
            </Center>

            {/* Instructions */}
            <Stack gap="xs">
              <Text size="sm" fw={600} c="carbon">
                On your other device:
              </Text>
              <Text
                size="sm"
                c="dimmed"
                component="ol"
                pl="md"
                style={{ margin: 0 }}
              >
                <li>Open Skelenote</li>
                <li>Go to Settings → Sync → Hearth</li>
                <li>Tap "Pair New Device"</li>
                <li>Scan this code</li>
              </Text>
            </Stack>

            <Box
              p="sm"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                backgroundColor: 'var(--mantine-color-ochre-0)',
                borderLeft: '3px solid var(--mantine-color-ochre-5)',
                border: '1px solid var(--mantine-color-ochre-3)',
              })}
            >
              <Group gap="xs" align="flex-start">
                <Icon
                  name="info"
                  size={14}
                  style={{
                    marginTop: 2,
                    color: 'var(--mantine-color-ochre-6)',
                    flexShrink: 0,
                  }}
                />
                <Text size="xs" c="ochre.9">
                  Both devices must be on the same network and using the same
                  Skeleton Key.
                </Text>
              </Group>
            </Box>

            {/* Manual connection details */}
            {qrData.manualDetails && (
              <>
                <Divider label="Or enter manually" labelPosition="center" />

                <Stack gap="xs">
                  <Group justify="space-between" gap="xs">
                    <Text size="xs" c="dimmed" fw={500}>
                      IP Addresses:
                    </Text>
                    <Stack gap={4} align="flex-end">
                      {qrData.manualDetails.ips.map((ip) => (
                        <Code key={ip} fz="xs">
                          {ip}
                        </Code>
                      ))}
                    </Stack>
                  </Group>

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={500}>
                      Port:
                    </Text>
                    <Code fz="xs">{qrData.manualDetails.port}</Code>
                  </Group>

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={500}>
                      Code:
                    </Text>
                    <Code fz="xs">{formatFingerprint(qrData.fingerprint)}</Code>
                  </Group>
                </Stack>
              </>
            )}
          </>
        )}

        {/* Fullscreen QR overlay */}
        {fullscreen && qrData && (
          <Box
            onClick={() => setFullscreen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'white',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <img
              src={`data:image/png;base64,${qrData.pngBase64}`}
              alt="Pairing QR Code (Fullscreen)"
              style={{
                width: '60vmin',
                height: '60vmin',
                maxWidth: '500px',
                maxHeight: '500px',
                imageRendering: 'pixelated',
              }}
            />
          </Box>
        )}
      </Stack>
    </Modal>
  );
}
