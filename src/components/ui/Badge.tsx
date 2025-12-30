import { Badge as MantineBadge } from '@mantine/core';

interface BadgeProps {
  count: number;
  max?: number;
}

/**
 * Numeric badge for showing counts (e.g., inbox count)
 */
export function Badge({ count, max = 99 }: BadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <MantineBadge
      size="xs"
      variant="light"
      color="gray"
      radius="xl"
      aria-label={`${count} items`}
    >
      {displayCount}
    </MantineBadge>
  );
}
