import {
  Drawer,
  Box,
  Text,
  UnstyledButton,
  Stack,
  Button,
} from '@mantine/core';
import { type LucideIcon } from 'lucide-react';

export interface ActionSheetItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Use 'danger' for destructive actions */
  variant?: 'default' | 'danger';
  onAction: () => void;
  disabled?: boolean;
}

interface ActionSheetProps {
  opened: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: ActionSheetItem[];
}

/**
 * iOS-style action sheet for context menus on mobile.
 * Replaces right-click menus from desktop.
 */
export function ActionSheet({
  opened,
  onClose,
  title,
  description,
  actions,
}: ActionSheetProps) {
  // Separate danger actions to show at bottom
  const normalActions = actions.filter((a) => a.variant !== 'danger');
  const dangerActions = actions.filter((a) => a.variant === 'danger');

  const handleActionClick = (action: ActionSheetItem) => {
    if (!action.disabled) {
      action.onAction();
      onClose();
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="auto"
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

      {/* Title and description */}
      {(title || description) && (
        <Box px="md" pb="sm" ta="center">
          {title && (
            <Text size="sm" fw={600}>
              {title}
            </Text>
          )}
          {description && (
            <Text size="xs" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </Box>
      )}

      {/* Actions list */}
      <Stack gap={0}>
        {normalActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <UnstyledButton
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                minHeight: 56,
                borderTop:
                  index > 0 ? '1px solid var(--border-subtle)' : 'none',
                opacity: action.disabled ? 0.5 : 1,
                cursor: action.disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {Icon && (
                <Icon
                  size={20}
                  style={{ color: 'var(--mantine-color-gray-6)' }}
                />
              )}
              <Text size="md">{action.label}</Text>
            </UnstyledButton>
          );
        })}

        {/* Divider before danger actions */}
        {dangerActions.length > 0 && normalActions.length > 0 && (
          <Box
            style={{
              height: 8,
              backgroundColor: 'var(--surface-canvas)',
            }}
          />
        )}

        {/* Danger actions */}
        {dangerActions.map((action) => {
          const Icon = action.icon;
          return (
            <UnstyledButton
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                minHeight: 56,
                opacity: action.disabled ? 0.5 : 1,
                cursor: action.disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {Icon && (
                <Icon
                  size={20}
                  style={{ color: 'var(--mantine-color-brick-5, #9B3D3D)' }}
                />
              )}
              <Text size="md" c="brick">
                {action.label}
              </Text>
            </UnstyledButton>
          );
        })}
      </Stack>

      {/* Cancel button */}
      <Box px="md" py="md">
        <Button
          variant="subtle"
          color="gray"
          fullWidth
          size="lg"
          onClick={onClose}
          styles={{
            root: {
              height: 52,
            },
          }}
        >
          Cancel
        </Button>
      </Box>
    </Drawer>
  );
}
