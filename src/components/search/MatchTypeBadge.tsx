/**
 * MatchTypeBadge - Visual indicator for search match type
 * Shows how a result was found: text match, semantic match, or hybrid
 */

import type { MatchType } from '@/lib/search';
import './MatchTypeBadge.css';

interface MatchTypeBadgeProps {
  /** Type of match */
  matchType: MatchType;
  /** Semantic similarity score (0-1), shown for semantic/hybrid matches */
  semanticScore?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Badge showing how a search result was matched
 *
 * - Text: Yellow badge with "Text" label
 * - Semantic: Purple badge with similarity percentage
 * - Hybrid: Gradient badge with percentage and "Hybrid" label
 */
export function MatchTypeBadge({
  matchType,
  semanticScore,
  className = '',
}: MatchTypeBadgeProps) {
  const percent = semanticScore ? Math.round(semanticScore * 100) : null;

  const baseClass = 'match-badge';
  const modifierClass = `match-badge--${matchType}`;
  const classes = [baseClass, modifierClass, className].filter(Boolean).join(' ');

  // Text match: simple label
  if (matchType === 'text') {
    return (
      <span className={classes} title="Found via keyword matching">
        Text
      </span>
    );
  }

  // Semantic match: show percentage
  if (matchType === 'semantic') {
    return (
      <span
        className={classes}
        title={percent ? `${percent}% conceptually similar` : 'Conceptually similar'}
      >
        {percent ? `~${percent}%` : '~'}
      </span>
    );
  }

  // Hybrid match: show percentage and label
  return (
    <span
      className={classes}
      title={
        percent
          ? `Found via keyword + ${percent}% conceptual similarity`
          : 'Found via keyword + conceptual similarity'
      }
    >
      {percent ? `~${percent}%` : '~'} Hybrid
    </span>
  );
}
