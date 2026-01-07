/**
 * Hook for the Search Results page
 * Extends useSearch with filtering and higher result limits
 */

import { useState, useMemo, useCallback } from 'react';
import { useSearch, type UseSearchOptions } from './useSearch';
import type { SearchResult, MatchType } from '@/lib/search';

/**
 * Filter state for search results
 */
export interface SearchFilters {
  /** Match types to include (empty = all) */
  matchTypes: MatchType[];
  /** Object types to include (empty = all) */
  objectTypes: string[];
}

/**
 * Default filters - show everything
 */
const DEFAULT_FILTERS: SearchFilters = {
  matchTypes: [],
  objectTypes: [],
};

export interface UseSearchResultsOptions extends Omit<
  UseSearchOptions,
  'limit'
> {
  /** Maximum number of results (default: 50) */
  limit?: number;
  /** Initial query */
  initialQuery?: string;
}

export interface UseSearchResultsResult {
  /** Current search query */
  query: string;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Filtered search results */
  results: SearchResult[];
  /** All results before filtering */
  unfilteredResults: SearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Number of indexed items */
  indexSize: number;
  /** Whether hybrid search is active */
  isHybridSearch: boolean;
  /** Clear the search query and results */
  clear: () => void;
  /** Current filters */
  filters: SearchFilters;
  /** Update filters */
  setFilters: (filters: SearchFilters) => void;
  /** Reset filters to default */
  clearFilters: () => void;
  /** Check if any filters are active */
  hasActiveFilters: boolean;
}

/**
 * Hook for the Search Results page
 * Provides filtering on top of base search functionality
 *
 * @example
 * ```tsx
 * const {
 *   query,
 *   setQuery,
 *   results,
 *   filters,
 *   setFilters,
 *   hasActiveFilters,
 *   clearFilters,
 * } = useSearchResults();
 *
 * // Filter to only show semantic matches
 * setFilters({ ...filters, matchTypes: ['semantic'] });
 *
 * // Filter to only show notes
 * setFilters({ ...filters, objectTypes: ['note'] });
 * ```
 */
export function useSearchResults(
  options: UseSearchResultsOptions = {}
): UseSearchResultsResult {
  const { limit = 50, initialQuery, ...searchOptions } = options;

  // Base search hook with higher limit
  const baseSearch = useSearch({ ...searchOptions, limit });

  // Filter state
  const [filters, setFiltersState] = useState<SearchFilters>(DEFAULT_FILTERS);

  // Initialize query if provided
  useMemo(() => {
    if (initialQuery && initialQuery !== baseSearch.query) {
      baseSearch.setQuery(initialQuery);
    }
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.matchTypes.length > 0 || filters.objectTypes.length > 0;
  }, [filters]);

  // Apply filters to results
  const filteredResults = useMemo(() => {
    let results = baseSearch.results;

    // Filter by match type
    // Note: 'hybrid' matches pass through both 'text' and 'semantic' filters
    // since hybrid means it matched BOTH text AND semantic
    if (filters.matchTypes.length > 0) {
      results = results.filter((r) => {
        const matchType = r.matchType ?? 'text';
        // Direct match
        if (filters.matchTypes.includes(matchType)) return true;
        // Hybrid passes through text and semantic filters
        if (matchType === 'hybrid') {
          return (
            filters.matchTypes.includes('text') ||
            filters.matchTypes.includes('semantic')
          );
        }
        return false;
      });
    }

    // Filter by object type
    if (filters.objectTypes.length > 0) {
      results = results.filter((r) => {
        return filters.objectTypes.includes(r.item.typeId);
      });
    }

    return results;
  }, [baseSearch.results, filters]);

  // Update filters
  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  return {
    query: baseSearch.query,
    setQuery: baseSearch.setQuery,
    results: filteredResults,
    unfilteredResults: baseSearch.results,
    isSearching: baseSearch.isSearching,
    indexSize: baseSearch.indexSize,
    isHybridSearch: baseSearch.isHybridSearch,
    clear: baseSearch.clear,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
  };
}
