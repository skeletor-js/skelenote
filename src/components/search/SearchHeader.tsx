/**
 * SearchHeader - Search input and controls for the Search Results page
 */

import { useRef, useEffect } from 'react';
import './SearchHeader.css';

interface SearchHeaderProps {
  /** Current search query */
  query: string;
  /** Update search query */
  onQueryChange: (query: string) => void;
  /** Clear search */
  onClear: () => void;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Total number of results */
  resultCount: number;
  /** Whether semantic search is enabled */
  isSemanticEnabled: boolean;
  /** Whether semantic search is available (model loaded) */
  isSemanticAvailable: boolean;
  /** Toggle to show/hide filters */
  showFilters: boolean;
  /** Set show/hide filters */
  onToggleFilters: () => void;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
}

export function SearchHeader({
  query,
  onQueryChange,
  onClear,
  isSearching,
  resultCount,
  isSemanticEnabled,
  isSemanticAvailable,
  showFilters,
  onToggleFilters,
  autoFocus = true,
}: SearchHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (query) {
        onClear();
      } else {
        inputRef.current?.blur();
      }
    }
  };

  return (
    <div className="search-header">
      {/* Search input */}
      <div className="search-header__input-wrapper">
        <span className="search-header__icon">🔎</span>
        <input
          ref={inputRef}
          type="search"
          className="search-header__input"
          placeholder="Search all notes, tasks, and more..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search"
        />
        {query && (
          <button
            className="search-header__clear"
            onClick={onClear}
            aria-label="Clear search"
            type="button"
          >
            ×
          </button>
        )}
        {isSearching && <span className="search-header__spinner" aria-hidden="true" />}
      </div>

      {/* Controls */}
      <div className="search-header__controls">
        {/* Semantic indicator */}
        {isSemanticAvailable && (
          <div
            className={`search-header__semantic ${isSemanticEnabled ? 'search-header__semantic--active' : ''}`}
            title={isSemanticEnabled ? 'Semantic search is enabled' : 'Semantic search available'}
          >
            <span className="search-header__semantic-icon">✨</span>
            <span className="search-header__semantic-label">AI</span>
          </div>
        )}

        {/* Filter toggle */}
        <button
          className={`search-header__filter-toggle ${showFilters ? 'search-header__filter-toggle--active' : ''}`}
          onClick={onToggleFilters}
          aria-expanded={showFilters}
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          type="button"
        >
          Filters
          <span className="search-header__filter-icon">{showFilters ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Results count */}
      {query && !isSearching && (
        <div className="search-header__count" aria-live="polite">
          {resultCount === 0 ? (
            'No results'
          ) : resultCount === 1 ? (
            '1 result'
          ) : (
            `${resultCount} results`
          )}
        </div>
      )}
    </div>
  );
}
