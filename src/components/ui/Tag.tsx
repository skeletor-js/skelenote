import { Badge, Box, MantineColor, useMantineTheme } from '@mantine/core';

export type TagColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'cyan';

/**
 * Map our tag colors to Mantine colors
 * Note: 'purple' maps to 'violet' in Mantine
 */
const COLOR_MAP: Record<TagColor, MantineColor> = {
  gray: 'gray',
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  purple: 'violet',
  pink: 'pink',
  cyan: 'cyan',
};

interface TagProps {
  name: string;
  color?: TagColor;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

/**
 * Colored dot indicator for the tag
 */
function TagDot({ color, size }: { color: MantineColor; size: 'sm' | 'md' }) {
  const theme = useMantineTheme();
  const dotSize = size === 'sm' ? 6 : 8;

  // Get the appropriate color shade based on color scheme
  const colorValue = theme.colors[color]?.[5] ?? theme.colors.gray[5];

  return (
    <Box
      component="span"
      style={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        backgroundColor: colorValue,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Tag component for displaying colored labels
 */
export function Tag({ name, color = 'gray', size = 'md', onClick }: TagProps) {
  const isClickable = !!onClick;
  const mantineColor = COLOR_MAP[color] ?? 'gray';
  const badgeSize = size === 'sm' ? 'xs' : 'sm';

  return (
    <Badge
      size={badgeSize}
      variant="transparent"
      leftSection={<TagDot color={mantineColor} size={size} />}
      styles={{
        root: {
          cursor: isClickable ? 'pointer' : 'default',
          textTransform: 'none',
          fontWeight: 500,
          paddingLeft: 6,
          paddingRight: 8,
          '&:hover': isClickable ? {
            backgroundColor: 'var(--mantine-color-gray-1)',
          } : undefined,
        },
        label: {
          color: 'var(--mantine-color-gray-7)',
        },
      }}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined
      }
    >
      #{name}
    </Badge>
  );
}
