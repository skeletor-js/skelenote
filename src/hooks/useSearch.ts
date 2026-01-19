/**
 * Hook for full-text search across all objects
 * Provides debounced search with automatic index updates
 * Supports hybrid search when semantic search is enabled
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useObjects, useTypeRegistry, useSemanticSearchSafe } from '@/contexts';
import {
  SearchEngine,
  buildSearchIndex,
  fuseSearchResults,
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
  /** Enable hybrid search when semantic is available (default: true) */
  enableHybrid?: boolean;
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
  /** Whether hybrid search is active */
  isHybridSearch: boolean;
  /** Clear the search query and results */
  clear: () => void;
}

/**
 * Hook for searching across all objects
 * Automatically uses hybrid search when semantic search is enabled.
 *
 * @example
 * ```tsx
 * const { query, setQuery, results, isSearching, isHybridSearch } = useSearch();
 *
 * return (
 *   <div>
 *     <input
 *       value={query}
 *       onChange={(e) => setQuery(e.target.value)}
 *       placeholder="Search..."
 *     />
 *     {isHybridSearch && <span>Semantic search active</span>}
 *     {isSearching ? (
 *       <p>Searching...</p>
 *     ) : (
 *       <ul>
 *         {results.map((result) => (
 *           <li key={result.item.id}>
 *             {result.item.title}
 *             {result.matchType === 'semantic' && ' ~'}
 *           </li>
 *         ))}
 *       </ul>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const { limit = 10, debounceMs = DEBOUNCE_MS, enableHybrid = true } = options;

  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const semanticContext = useSemanticSearchSafe();

  // Search state
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search engine instance (memoized)
  const searchEngineRef = useRef<SearchEngine | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if hybrid search is available and enabled
  const isHybridSearch = useMemo(() => {
    return (
      enableHybrid &&
      semanticContext?.isEnabled &&
      semanticContext?.status === 'ready'
    );
  }, [enableHybrid, semanticContext?.isEnabled, semanticContext?.status]);

  // Build/rebuild search index when store changes
  const searchIndex = useMemo((): SearchableItem[] => {
    if (!store) return [];
    return buildSearchIndex(store, typeRegistry);
  }, [store, typeRegistry]);

  // Create a map for quick lookup
  const searchableItemsMap = useMemo(() => {
    const map = new Map<string, SearchableItem>();
    for (const item of searchIndex) {
      map.set(item.id, item);
    }
    return map;
  }, [searchIndex]);

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
      debounceTimerRef.current = setTimeout(async () => {
        const engine = searchEngineRef.current;
        if (!engine) {
          setIsSearching(false);
          return;
        }

        // Get text search results
        const textResults = engine.search(searchQuery, { limit: limit * 2 }); // Get more for fusion

        // If hybrid search is enabled, also get semantic results
        if (isHybridSearch && semanticContext) {
          try {
            const semanticEngine = semanticContext.getEngine();
            if (semanticEngine && semanticEngine.status === 'ready') {
              // Use user-configured threshold from settings
              const semanticResults = await semanticEngine.search(searchQuery, {
                limit: limit * 2,
                threshold: semanticContext.threshold,
              });

              // Fuse results using RRF
              const fusedResults = fuseSearchResults(
                textResults,
                semanticResults,
                searchableItemsMap
              );

              // Limit final results
              setResults(fusedResults.slice(0, limit));
            } else {
              // Semantic not ready, use text only with matchType
              setResults(
                textResults
                  .slice(0, limit)
                  .map((r) => ({ ...r, matchType: 'text' as const }))
              );
            }
          } catch (error) {
            console.warn(
              'Semantic search failed, falling back to text:',
              error
            );
            setResults(
              textResults
                .slice(0, limit)
                .map((r) => ({ ...r, matchType: 'text' as const }))
            );
          }
        } else {
          // Text search only
          setResults(
            textResults
              .slice(0, limit)
              .map((r) => ({ ...r, matchType: 'text' as const }))
          );
        }

        setIsSearching(false);

        setIsSearching(false);
      }, debounceMs);
    },
    [limit, debounceMs, isHybridSearch, semanticContext, searchableItemsMap]
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
    isHybridSearch: isHybridSearch ?? false,
    clear,
  };
}
