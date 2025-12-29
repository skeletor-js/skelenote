/**
 * SearchResultItem - Displays a single search result with highlighted snippet
 */

import { useMemo } from 'react';
import { useTypeRegistry } from '@/contexts';
import { getBestSnippet, type SearchResult, type TextSegment } from '@/lib/search';
import './SearchResultItem.css';

interface SearchResultItemProps {
  /** The search result to display */
  result: SearchResult;
  /** Whether this item is currently selected */
  isSelected: boolean;
  /** Called when the item is clicked */
  onClick: () => void;
  /** Called when mouse enters the item */
  onMouseEnter: () => void;
}

/**
 * Render text segments with highlighting
 */
function HighlightedText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={index} className="search-result__highlight">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

export function SearchResultItem({
  result,
  isSelected,
  onClick,
  onMouseEnter,
}: SearchResultItemProps) {
  const typeRegistry = useTypeRegistry();

  // Get type definition for icon
  const typeDef = typeRegistry.get(result.item.typeId);
  const icon = typeDef?.icon ?? '📄';
  const typeName = typeDef?.name ?? result.item.typeId;

  // Get snippet from matches (only for text/hybrid matches)
  const snippet = useMemo(() => {
    if (result.matches.length === 0) return null;
    return getBestSnippet(result.matches, 100);
  }, [result.matches]);

  // Check if this is a semantic match
  const isSemanticMatch = result.matchType === 'semantic' || result.matchType === 'hybrid';
  const semanticPercent = result.semanticScore
    ? Math.round(result.semanticScore * 100)
    : null;

  return (
    <div
      className={`search-result ${isSelected ? 'search-result--selected' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
    >
      <div className="search-result__icon">{icon}</div>
      <div className="search-result__content">
        <div className="search-result__title-row">
          <span className="search-result__title">{result.item.title || 'Untitled'}</span>
          {isSemanticMatch && (
            <span
              className="search-result__semantic-badge"
              title={semanticPercent ? `${semanticPercent}% similar` : 'Semantic match'}
            >
              ~{semanticPercent ? `${semanticPercent}%` : ''}
            </span>
          )}
        </div>
        {snippet ? (
          <div className="search-result__snippet">
            <HighlightedText segments={snippet.segments} />
          </div>
        ) : isSemanticMatch ? (
          <div className="search-result__snippet search-result__snippet--semantic">
            Conceptually similar
          </div>
        ) : null}
      </div>
      <div className="search-result__type">{typeName}</div>
    </div>
  );
}
