import { Badge, Box, MantineColor, useMantineTheme, useMantineColorScheme } from '@mantine/core';

/**
 * Tag colors using our warm palette from the style guide
 * - ember: Terracotta/primary accent
 * - clay: Muted purple/mauve
 * - sage: Green/success
 * - ochre: Golden yellow/warning
 * - brick: Dark red/danger
 * - slate: Blue-gray/info
 */
export type TagColor =
  | 'gray'
  | 'ember'
  | 'clay'
  | 'sage'
  | 'ochre'
  | 'brick'
  | 'slate';

/**
 * Map tag colors to Mantine theme colors
 * These are our custom colors defined in the Mantine theme
 */
const COLOR_MAP: Record<TagColor, MantineColor> = {
  gray: 'gray',
  ember: 'ember',
  clay: 'clay',
  sage: 'sage',
  ochre: 'ochre',
  brick: 'brick',
  slate: 'slate',
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
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

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
            backgroundColor: 'var(--hover-warm)',
          } : undefined,
        },
        label: {
          // Light mode: dark gray text
          // Dark mode: light gray text for visibility
          color: isDark
            ? 'var(--mantine-color-gray-3)'
            : 'var(--mantine-color-gray-7)',
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
