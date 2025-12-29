/**
 * SearchResultCard - Enhanced search result display for the Search Results page
 * Includes match type badge, metadata, and action buttons
 */

import { useMemo } from 'react';
import { useTypeRegistry } from '@/contexts';
import { getBestSnippet, type SearchResult, type TextSegment } from '@/lib/search';
import { MatchTypeBadge } from './MatchTypeBadge';
import './SearchResultCard.css';

interface SearchResultCardProps {
  /** The search result to display */
  result: SearchResult;
  /** Whether this item is currently selected */
  isSelected: boolean;
  /** Called when the item is clicked */
  onClick: () => void;
  /** Called when "Open in Split" action is triggered */
  onOpenInSplit: () => void;
  /** Called when mouse enters the item */
  onMouseEnter?: () => void;
  /** Formatted date string (e.g., "Updated 2h ago") */
  dateLabel?: string;
}

/**
 * Render text segments with highlighting
 */
function HighlightedText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={index} className="search-card__highlight">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

export function SearchResultCard({
  result,
  isSelected,
  onClick,
  onOpenInSplit,
  onMouseEnter,
  dateLabel,
}: SearchResultCardProps) {
  const typeRegistry = useTypeRegistry();

  // Get type definition for icon and name
  const typeDef = typeRegistry.get(result.item.typeId);
  const icon = typeDef?.icon ?? '📄';
  const typeName = typeDef?.name ?? result.item.typeId;

  // Get snippet from matches (only for text/hybrid matches)
  const snippet = useMemo(() => {
    if (result.matches.length === 0) return null;
    return getBestSnippet(result.matches, 120);
  }, [result.matches]);

  // Determine match type (default to 'text' if not specified)
  const matchType = result.matchType ?? 'text';
  const isSemanticMatch = matchType === 'semantic' || matchType === 'hybrid';

  // Handle action button clicks without triggering card click
  const handleOpenInSplit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenInSplit();
  };

  return (
    <div
      className={`search-card ${isSelected ? 'search-card--selected' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
    >
      {/* Icon */}
      <div className="search-card__icon">{icon}</div>

      {/* Main content */}
      <div className="search-card__content">
        {/* Title row with badge */}
        <div className="search-card__header">
          <span className="search-card__title">
            {result.item.title || 'Untitled'}
          </span>
          <MatchTypeBadge
            matchType={matchType}
            semanticScore={result.semanticScore}
          />
        </div>

        {/* Snippet or semantic indicator */}
        {snippet ? (
          <div className="search-card__snippet">
            <HighlightedText segments={snippet.segments} />
          </div>
        ) : isSemanticMatch ? (
          <div className="search-card__snippet search-card__snippet--semantic">
            Conceptually similar
          </div>
        ) : null}

        {/* Metadata row */}
        <div className="search-card__meta">
          <span className="search-card__type">{typeName}</span>
          {dateLabel && (
            <>
              <span className="search-card__separator">·</span>
              <span className="search-card__date">{dateLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="search-card__actions">
        <button
          className="search-card__action search-card__action--primary"
          onClick={onClick}
          title="Open (Enter)"
          aria-label="Open"
        >
          Open
        </button>
        <button
          className="search-card__action"
          onClick={handleOpenInSplit}
          title="Open in split pane (⌘+Enter)"
          aria-label="Open in split pane"
        >
          Split
        </button>
      </div>
    </div>
  );
}
