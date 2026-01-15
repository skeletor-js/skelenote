import { type ReactNode } from 'react';
import { Drawer, Box, Text, ActionIcon, Group } from '@mantine/core';
import { X } from 'lucide-react';

interface BottomSheetProps {
  opened: boolean;
  onClose: () => void;
  title?: string;
  /** Size as percentage or 'auto' for content-based height */
  size?: 'sm' | 'md' | 'lg' | 'full' | 'auto';
  /** Show drag handle indicator */
  withHandle?: boolean;
  /** Show close button in header */
  withCloseButton?: boolean;
  children: ReactNode;
}

const sizeMap: Record<string, string> = {
  sm: '25%',
  md: '50%',
  lg: '75%',
  full: '100%',
  auto: 'auto',
};

/**
 * Mobile-optimized bottom sheet component.
 * Wraps Mantine Drawer with mobile-friendly defaults.
 */
export function BottomSheet({
  opened,
  onClose,
  title,
  size = 'auto',
  withHandle = true,
  withCloseButton = true,
  children,
}: BottomSheetProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size={sizeMap[size] ?? size}
      withCloseButton={false}
      styles={{
        content: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        },
        body: {
          padding: 0,
        },
      }}
      transitionProps={{
        duration: 250,
        timingFunction: 'ease-out',
      }}
      overlayProps={{
        backgroundOpacity: 0.35,
        blur: 2,
      }}
    >
      {/* Drag handle */}
      {withHandle && (
        <Box
          py="sm"
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box
            style={{
              width: 36,
              height: 4,
              backgroundColor: 'var(--mantine-color-gray-4)',
              borderRadius: 2,
            }}
          />
        </Box>
      )}

      {/* Header with title and close button */}
      {title && (
        <Group
          justify="space-between"
          px="md"
          py="sm"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Text size="md" fw={600}>
            {title}
          </Text>
          {withCloseButton && (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onClose}
              size={44}
              aria-label="Close"
            >
              <X size={20} />
            </ActionIcon>
          )}
        </Group>
      )}

      {/* Content */}
      <Box px="md" py="md">
        {children}
      </Box>
    </Drawer>
  );
}
