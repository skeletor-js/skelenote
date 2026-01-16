/**
 * Icon Selector Component
 *
 * Displays available app icons as a selection grid for the Appearance settings.
 */

import { Group, Box, Text, UnstyledButton, Loader, Image } from '@mantine/core';
import { Check } from 'lucide-react';
import { useAppIcon, type IconId } from '@/hooks';

interface IconPreviewProps {
  iconId: IconId;
  name: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function IconPreview({
  iconId,
  name,
  selected,
  onClick,
  disabled,
}: IconPreviewProps) {
  // Preview images are stored in public/icons/
  const previewSrc = `/icons/preview-${iconId}.png`;

  return (
    <UnstyledButton
      onClick={onClick}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Box
        style={{
          position: 'relative',
          width: 80,
          height: 80,
          borderRadius: 16,
          border: selected
            ? '2px solid var(--mantine-color-ember-6)'
            : '2px solid var(--mantine-color-default-border)',
          overflow: 'hidden',
          transition: 'border-color 150ms ease',
        }}
      >
        <Image
          src={previewSrc}
          alt={`${name} icon`}
          w={76}
          h={76}
          fit="cover"
          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='76' height='76'%3E%3Crect fill='%23ddd' width='76' height='76'/%3E%3C/svg%3E"
        />
        {selected && (
          <Box
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'var(--mantine-color-ember-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={12} color="white" strokeWidth={3} />
          </Box>
        )}
      </Box>
      <Text size="xs" ta="center" mt={4} c={selected ? 'ember' : 'dimmed'}>
        {name}
      </Text>
    </UnstyledButton>
  );
}

export function IconSelector() {
  const { currentIcon, changeIcon, isChanging, isSupported, error } =
    useAppIcon();

  if (!isSupported) {
    return (
      <Text size="sm" c="dimmed">
        App icon switching is not supported on this platform.
      </Text>
    );
  }

  const variants: { id: IconId; name: string }[] = [
    { id: 'dark', name: 'Dark' },
    { id: 'light', name: 'Light' },
  ];

  return (
    <Box>
      <Group gap="md">
        {variants.map((variant) => (
          <IconPreview
            key={variant.id}
            iconId={variant.id}
            name={variant.name}
            selected={currentIcon === variant.id}
            onClick={() => changeIcon(variant.id)}
            disabled={isChanging}
          />
        ))}
        {isChanging && <Loader size="sm" />}
      </Group>
      {error && (
        <Text size="xs" c="red" mt="xs">
          {error}
        </Text>
      )}
    </Box>
  );
}
