/**
 * MatchTypeBadge - Minimal similarity score indicator
 * Uses a 3-dot indicator for low/medium/high match quality
 */

import { Group, Box, Tooltip } from '@mantine/core';
import type { MatchType } from '@/lib/search';

interface MatchTypeBadgeProps {
  /** Type of match */
  matchType: MatchType;
  /** Semantic similarity score (0-1), shown for semantic/hybrid matches */
  semanticScore?: number;
}

/** Get match level from score: low (<60%), medium (60-80%), high (>80%) */
function getMatchLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

/** Dot indicator component */
function Dot({ active }: { active: boolean }) {
  return (
    <Box
      style={{
        width: 4,
        height: 4,
        borderRadius: '50%',
        backgroundColor: active
          ? 'var(--mantine-color-clay-5)'
          : 'var(--mantine-color-gray-3)',
        transition: 'background-color 150ms ease',
      }}
    />
  );
}

/**
 * 3-dot indicator showing match quality for semantic/hybrid matches
 * Returns null for text-only matches (no indicator needed)
 */
export function MatchTypeBadge({
  matchType,
  semanticScore,
}: MatchTypeBadgeProps) {
  // Only show indicator for semantic/hybrid matches with a score
  if (matchType === 'text' || !semanticScore) {
    return null;
  }

  const percent = Math.round(semanticScore * 100);
  const level = getMatchLevel(semanticScore);

  // Determine how many dots are active
  const activeDots = level === 'high' ? 3 : level === 'medium' ? 2 : 1;

  return (
    <Tooltip label={`${percent}% match`} withArrow>
      <Group gap={2} wrap="nowrap">
        <Dot active={activeDots >= 1} />
        <Dot active={activeDots >= 2} />
        <Dot active={activeDots >= 3} />
      </Group>
    </Tooltip>
  );
}
