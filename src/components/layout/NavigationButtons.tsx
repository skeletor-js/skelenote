import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationButtonsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

/**
 * Back and forward navigation buttons for the top nav bar.
 * Styled per style guide: sm size ActionIcons with 14px icons.
 */
export function NavigationButtons({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: NavigationButtonsProps) {
  return (
    <Group gap="xs">
      <Tooltip label="Go back (Cmd+[)" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Go back"
          style={{
            opacity: canGoBack ? 1 : 0.3,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
          }}
        >
          <ChevronLeft size={14} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Go forward (Cmd+])" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label="Go forward"
          style={{
            opacity: canGoForward ? 1 : 0.3,
            cursor: canGoForward ? 'pointer' : 'not-allowed',
          }}
        >
          <ChevronRight size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
