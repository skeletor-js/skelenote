import { type ReactNode } from 'react';
import { Box, Group, Text, ActionIcon, Badge, Button } from '@mantine/core';
import { ChevronLeft, Search } from 'lucide-react';
import { MobileSyncIndicator } from './MobileSyncIndicator';
import { useNavigation } from '@/contexts';
import { IOS_CHEVRON } from '@/lib/constants/ios-styles';

interface MobileViewHeaderProps {
  /** View title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /**
   * Show back button.
   * - If true with onBack provided: uses custom callback
   * - If true without onBack: uses navigation context (canGoBack/navigateBack)
   * - If 'auto': shows back button only when canGoBack is true
   */
  showBack?: boolean | 'auto';
  /** Back button callback (optional - defaults to navigateBack from context) */
  onBack?: () => void;
  /** Badge count next to title */
  count?: number;
  /** Right side actions */
  rightSection?: ReactNode;
  /** Header variant */
  variant?: 'default' | 'large' | 'compact';
  /** Show sync status indicator */
  showSync?: boolean;
  /** Show search button (navigates to search view) */
  showSearch?: boolean;
  /** Callback to enter selection mode */
  onSelectMode?: () => void;
  /** Whether to show the Select button (visible entry point for selection mode) */
  showSelectButton?: boolean;
}

// iOS standard heights: compact/default 44pt, large title 96pt
const heightMap = {
  default: 44,
  large: 96,
  compact: 44,
};

/**
 * Consistent header component for mobile views.
 * Includes back navigation, title, badge, and right actions.
 */
export function MobileViewHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  count,
  rightSection,
  variant = 'default',
  showSync = false,
  showSearch = false,
  onSelectMode,
  showSelectButton = false,
}: MobileViewHeaderProps) {
  const { canGoBack, navigateBack, navigateToSearch } = useNavigation();
  const height = heightMap[variant];
  const titleSize =
    variant === 'large' ? 'lg' : variant === 'compact' ? 'sm' : 'md';

  // Determine if back button should be shown
  const shouldShowBack =
    showBack === 'auto' ? canGoBack : showBack && (onBack || canGoBack);

  // Determine back button handler
  const handleBack = onBack ?? navigateBack;

  return (
    <Box
      px="md"
      style={{
        // Use plugin's CSS variable for safe area (injected by tauri-plugin-edge-to-edge)
        minHeight: height,
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'var(--surface-paper)',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
      }}
    >
      {/* Back button - uses navigation context if no onBack provided */}
      {shouldShowBack && (
        <ActionIcon
          variant="subtle"
          color="ember"
          size={44}
          onClick={handleBack}
          aria-label="Go back"
        >
          <ChevronLeft
            size={24}
            color={IOS_CHEVRON.back.color}
            strokeWidth={IOS_CHEVRON.back.strokeWidth}
          />
        </ActionIcon>
      )}

      {/* Title and subtitle */}
      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Box style={{ minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text
              size={titleSize}
              fw={600}
              truncate
              style={{ lineHeight: 1.2 }}
            >
              {title}
            </Text>
            {count !== undefined && count > 0 && (
              <Badge variant="light" color="gray" size="sm">
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Group>
          {subtitle && (
            <Text size="xs" c="dimmed" truncate>
              {subtitle}
            </Text>
          )}
        </Box>
      </Group>

      {/* Right section */}
      <Group gap="xs" wrap="nowrap">
        {showSync && <MobileSyncIndicator />}
        {showSearch && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size={44}
            onClick={() => navigateToSearch()}
            aria-label="Search"
          >
            <Search size={20} />
          </ActionIcon>
        )}
        {/* Select button for selection mode discoverability */}
        {showSelectButton && onSelectMode && (
          <Button
            variant="subtle"
            color="ember"
            size="compact-sm"
            onClick={onSelectMode}
          >
            Select
          </Button>
        )}
        {rightSection}
      </Group>
    </Box>
  );
}
