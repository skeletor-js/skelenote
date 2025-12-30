/**
 * PaletteItem - Individual result item in Command Palette
 */

import { UnstyledButton, Group, Text, Badge } from '@mantine/core';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { PaletteAction } from '@/lib/palette/actions';

interface PaletteItemProps {
  action: PaletteAction;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

export function PaletteItem({
  action,
  isSelected,
  onClick,
  onMouseEnter,
}: PaletteItemProps) {
  // Check if this is a semantic match
  const isSemanticMatch = action.matchType === 'semantic' || action.matchType === 'hybrid';
  const semanticPercent = action.semanticScore
    ? Math.round(action.semanticScore * 100)
    : null;

  // Render icon - either as Lucide icon name or emoji fallback
  const renderIcon = () => {
    if (/^[a-z-]+$/.test(action.icon)) {
      return <Icon name={action.icon as IconName} size={16} />;
    }
    return <span style={{ fontSize: 14 }}>{action.icon}</span>;
  };

  return (
    <UnstyledButton
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
      py="xs"
      px="sm"
      w="100%"
      style={{
        backgroundColor: isSelected ? 'var(--mantine-color-gray-light)' : undefined,
        borderRadius: 'var(--mantine-radius-sm)',
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <Text c="dimmed" style={{ flexShrink: 0 }}>
          {renderIcon()}
        </Text>
        <Text size="sm" style={{ flex: 1, minWidth: 0 }} truncate>
          {action.label}
        </Text>
        {isSemanticMatch && (
          <Badge
            size="xs"
            variant="light"
            color="violet"
            title={semanticPercent ? `${semanticPercent}% similar` : 'Semantic match'}
          >
            ~{semanticPercent ? `${semanticPercent}%` : ''}
          </Badge>
        )}
        <Text size="xs" c="dimmed" tt="capitalize">
          {action.category}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
