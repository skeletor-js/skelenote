import { UnstyledButton } from '@mantine/core';
import { Plus, type LucideIcon } from 'lucide-react';
import { usePlatform } from '@/hooks';
import { TAB_BAR_HEIGHT } from '@/components/layout/BottomTabBar';

interface FABProps {
  /** Icon to display (defaults to Plus) */
  icon?: LucideIcon;
  /** Accessible label for the button */
  label?: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the FAB is visible */
  visible?: boolean;
}

/**
 * Floating Action Button for primary actions on mobile.
 * Positioned above the bottom tab bar with safe area consideration.
 */
export function FAB({
  icon: Icon = Plus,
  label = 'Create new',
  onClick,
  visible = true,
}: FABProps) {
  const { safeAreaBottom } = usePlatform();

  if (!visible) return null;

  return (
    <UnstyledButton
      onClick={onClick}
      aria-label={label}
      style={{
        position: 'fixed',
        right: 16,
        bottom: TAB_BAR_HEIGHT + safeAreaBottom + 16,
        width: 56,
        height: 56,
        borderRadius: 28, // Circular (half of 56px)
        backgroundColor: 'var(--mantine-color-ember-5, #B85C50)',
        boxShadow: '0 4px 12px rgba(184, 92, 80, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 100ms ease-in-out, box-shadow 100ms ease-in-out',
        zIndex: 99,
      }}
      styles={{
        root: {
          '&:active': {
            transform: 'scale(0.95)',
            boxShadow: '0 2px 8px rgba(184, 92, 80, 0.25)',
          },
        },
      }}
    >
      <Icon size={24} color="white" />
    </UnstyledButton>
  );
}
