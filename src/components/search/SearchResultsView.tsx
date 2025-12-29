/**
 * SearchResultsView - Main container for the Search Results page
 * Combines search header, filters, and results list
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigation, useSemanticSearchSafe } from '@/contexts';
import { useSearchResults } from '@/hooks';
import { EmptyState } from '@/components/ui';
import { SearchHeader } from './SearchHeader';
import { SearchFilters } from './SearchFilters';
import { SearchResultCard } from './SearchResultCard';
import './SearchResultsView.css';

export function SearchResultsView() {
  const { searchQuery, navigateToObject, openInSplit } = useNavigation();
  const semanticContext = useSemanticSearchSafe();

  // Search state with initial query from navigation
  const {
    query,
    setQuery,
    results,
    isSearching,
    indexSize,
    isHybridSearch,
    clear,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
  } = useSearchResults({ initialQuery: searchQuery ?? undefined });

  // Filter visibility
  const [showFilters, setShowFilters] = useState(false);

  // Selected result index for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  // Check semantic availability
  const isSemanticAvailable =
    semanticContext?.isEnabled && semanticContext?.status === 'ready';

  // Handle result click
  const handleResultClick = useCallback(
    (objectId: string) => {
      navigateToObject(objectId);
    },
    [navigateToObject]
  );

  // Handle open in split
  const handleOpenInSplit = useCallback(
    (objectId: string) => {
      openInSplit(objectId);
    },
    [openInSplit]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            e.preventDefault();
            const result = results[selectedIndex];
            if (e.metaKey || e.ctrlKey) {
              handleOpenInSplit(result.item.id);
            } else {
              handleResultClick(result.item.id);
            }
          }
          break;
      }
    },
    [results, selectedIndex, handleResultClick, handleOpenInSplit]
  );

  // Toggle filters
  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  return (
    <div className="search-results-view" onKeyDown={handleKeyDown}>
      {/* Header */}
      <header className="search-results-view__header">
        <h1 className="search-results-view__title">Search</h1>
      </header>

      {/* Search controls */}
      <div className="search-results-view__controls">
        <SearchHeader
          query={query}
          onQueryChange={setQuery}
          onClear={clear}
          isSearching={isSearching}
          resultCount={results.length}
          isSemanticEnabled={isHybridSearch}
          isSemanticAvailable={isSemanticAvailable ?? false}
          showFilters={showFilters}
          onToggleFilters={toggleFilters}
        />

        {/* Filters panel */}
        {showFilters && (
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            isSemanticAvailable={isSemanticAvailable ?? false}
          />
        )}
      </div>

      {/* Results */}
      <div className="search-results-view__content">
        {!query.trim() ? (
          // No query state
          <EmptyState
            icon="🔎"
            message="Start typing to search all your notes and tasks"
            size="large"
          />
        ) : isSearching ? (
          // Loading state
          <div className="search-results-view__loading">
            <span className="search-results-view__loading-text">Searching...</span>
            {isHybridSearch && (
              <span className="search-results-view__loading-ai">
                AI analyzing concepts...
              </span>
            )}
          </div>
        ) : results.length === 0 ? (
          // No results state
          <div className="search-results-view__empty">
            <EmptyState
              icon="🔍"
              message={`No results found for "${query}"`}
              size="large"
            />
            <p className="search-results-view__hint">
              {hasActiveFilters ? (
                <>
                  No results match your filters.{' '}
                  <button
                    className="search-results-view__link-button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </>
              ) : isSemanticAvailable ? (
                'Try different keywords or adjust your search terms'
              ) : (
                'Try different keywords or enable semantic search for concept-based matching'
              )}
            </p>
          </div>
        ) : (
          // Results list
          <div className="search-results-view__list" role="listbox">
            {results.map((result, index) => (
              <SearchResultCard
                key={result.item.id}
                result={result}
                isSelected={index === selectedIndex}
                onClick={() => handleResultClick(result.item.id)}
                onOpenInSplit={() => handleOpenInSplit(result.item.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        )}

        {/* Index info (footer) */}
        {indexSize > 0 && (
          <div className="search-results-view__footer">
            <span className="search-results-view__index-info">
              Searching {indexSize} items
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
