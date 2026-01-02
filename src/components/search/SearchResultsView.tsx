/**
 * SearchResultsView - Main container for the Search Results page
 * Combines search header, filters, and results list with bulk selection support
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Stack, Text, Loader, Center, Button, Box, Collapse } from '@mantine/core';
import { useNavigation, useSemanticSearchSafe, useObjects } from '@/contexts';
import { useSearchResults, useSelection } from '@/hooks';
import { EmptyState, ViewHeader } from '@/components/ui';
import { BulkActions } from '@/components/actions';
import { SearchHeader } from './SearchHeader';
import { SearchFilters } from './SearchFilters';
import { SearchResultCard } from './SearchResultCard';

export function SearchResultsView() {
  const { searchQuery, navigateToObject, openInSplit } = useNavigation();
  const semanticContext = useSemanticSearchSafe();
  const { store, refreshData } = useObjects();

  // Search state with initial query from navigation
  const {
    query,
    setQuery,
    results,
    isSearching,
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

  // Get item IDs for selection hook
  const itemIds = useMemo(() => results.map((r) => r.item.id), [results]);

  // Initialize bulk selection
  const selection = useSelection({ allItems: itemIds });

  // Reset keyboard selection when results change
  useEffect(() => {
    setSelectedIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  // Check semantic availability
  const isSemanticAvailable =
    semanticContext?.isEnabled && semanticContext?.status === 'ready';

  // Handle bulk selection change (toggle or range)
  const handleSelectionChange = useCallback(
    (id: string, shiftKey: boolean) => {
      if (shiftKey) {
        selection.selectRange(id);
      } else {
        selection.toggle(id);
      }
    },
    [selection]
  );

  // Keyboard shortcuts for bulk selection
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const activeElement = document.activeElement;
        if (activeElement?.closest('[data-search-view]')) {
          e.preventDefault();
          selection.selectAll();
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape' && selection.hasSelection) {
        e.preventDefault();
        selection.clear();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selection]);

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

  // Handle archive
  const handleArchive = useCallback(
    (objectId: string) => {
      store?.archive(objectId);
      refreshData();
    },
    [store, refreshData]
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
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }} onKeyDown={handleKeyDown} data-search-view>
      <ViewHeader title="Search" count={results.length > 0 ? results.length : undefined} />
      <Box p="md" style={{ flex: 1, overflow: 'auto' }}>
        <Stack gap="md">
          {/* Search controls */}
          <Box>
            <SearchHeader
              query={query}
              onQueryChange={setQuery}
              onClear={clear}
              isSearching={isSearching}
              showFilters={showFilters}
              onToggleFilters={toggleFilters}
            />

            {/* Filters panel */}
            <Collapse in={showFilters}>
              <SearchFilters
                filters={filters}
                onFiltersChange={setFilters}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                isSemanticAvailable={isSemanticAvailable ?? false}
              />
            </Collapse>
          </Box>

          {/* Results */}
          <Box style={{ flex: 1 }}>
            {!query.trim() ? (
              // No query state
              <EmptyState
                icon="search"
                message="Start typing to search all your notes and tasks"
                size="large"
              />
            ) : isSearching ? (
              // Loading state
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <Loader size="md" />
                  <Text size="sm" c="dimmed">Searching...</Text>
                </Stack>
              </Center>
            ) : results.length === 0 ? (
              // No results state
              <Stack align="center" gap="md" py="xl">
                <EmptyState
                  icon="search"
                  message={`No results found for "${query}"`}
                  size="large"
                />
                <Text size="sm" c="dimmed">
                  {hasActiveFilters ? (
                    <>
                      No results match your filters.{' '}
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    </>
                  ) : isSemanticAvailable ? (
                    'Try different keywords or adjust your search terms'
                  ) : (
                    'Try different keywords or enable semantic search for concept-based matching'
                  )}
                </Text>
              </Stack>
            ) : (
              // Results list
              <Stack gap={2} role="listbox">
                {results.map((result, index) => (
                  <SearchResultCard
                    key={result.item.id}
                    result={result}
                    isSelected={selection.isSelected(result.item.id)}
                    isKeyboardSelected={index === selectedIndex}
                    onClick={() => handleResultClick(result.item.id)}
                    onOpenInSplit={() => handleOpenInSplit(result.item.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onArchive={handleArchive}
                    onSelectionChange={handleSelectionChange}
                    isSelectingMode={selection.hasSelection}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedIds={selection.selectedArray}
        onClearSelection={selection.clear}
        onActionComplete={refreshData}
        viewType="all"
      />
    </Stack>
  );
}
