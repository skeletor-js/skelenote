/**
 * Hook for full-text search across all objects
 * Provides debounced search with automatic index updates
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useObjects, useTypeRegistry } from '@/contexts';
import {
  SearchEngine,
  buildSearchIndex,
  type SearchResult,
  type SearchableItem,
} from '@/lib/search';

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_MS = 200;

export interface UseSearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Debounce delay in milliseconds (default: 200) */
  debounceMs?: number;
}

export interface UseSearchResult {
  /** Current search query */
  query: string;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Search results */
  results: SearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Number of indexed items */
  indexSize: number;
  /** Clear the search query and results */
  clear: () => void;
}

/**
 * Hook for searching across all objects
 *
 * @example
 * ```tsx
 * const { query, setQuery, results, isSearching } = useSearch();
 *
 * return (
 *   <div>
 *     <input
 *       value={query}
 *       onChange={(e) => setQuery(e.target.value)}
 *       placeholder="Search..."
 *     />
 *     {isSearching ? (
 *       <p>Searching...</p>
 *     ) : (
 *       <ul>
 *         {results.map((result) => (
 *           <li key={result.item.id}>{result.item.title}</li>
 *         ))}
 *       </ul>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const { limit = 10, debounceMs = DEBOUNCE_MS } = options;

  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();

  // Search state
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search engine instance (memoized)
  const searchEngineRef = useRef<SearchEngine | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Build/rebuild search index when store changes
  const searchIndex = useMemo((): SearchableItem[] => {
    if (!store) return [];
    return buildSearchIndex(store, typeRegistry);
  }, [store, typeRegistry]);

  // Update search engine when index changes
  useEffect(() => {
    if (!searchEngineRef.current) {
      searchEngineRef.current = new SearchEngine(searchIndex);
    } else {
      searchEngineRef.current.setItems(searchIndex);
    }
  }, [searchIndex]);

  // Execute search with debouncing
  const executeSearch = useCallback(
    (searchQuery: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Empty query clears results immediately
      if (!searchQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      // Debounce the actual search
      debounceTimerRef.current = setTimeout(() => {
        const engine = searchEngineRef.current;
        if (engine) {
          const searchResults = engine.search(searchQuery, { limit });
          setResults(searchResults);
        }
        setIsSearching(false);
      }, debounceMs);
    },
    [limit, debounceMs]
  );

  // Set query and trigger search
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);
      executeSearch(newQuery);
    },
    [executeSearch]
  );

  // Clear search
  const clear = useCallback(() => {
    setQueryState('');
    setResults([]);
    setIsSearching(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    indexSize: searchIndex.length,
    clear,
  };
}
