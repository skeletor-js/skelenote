/**
 * Mobile-optimized Search Modal
 * Features: full-screen overlay, recent searches, live results, type filters
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Stack,
  Text,
  TextInput,
  ActionIcon,
  Center,
  Loader,
  Badge,
  UnstyledButton,
  Group,
  Button,
  ScrollArea,
  Chip,
} from '@mantine/core';
import { Search, X, History, ChevronRight, Filter } from 'lucide-react';
import { usePlatform, useSearch } from '@/hooks';
import {
  useNavigation,
  useTypeRegistry,
  useSemanticSearchSafe,
} from '@/contexts';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import { Icon } from '@/components/ui/Icon';
import { MobileViewHeader, MatchTypeBadge } from '../primitives';
import { BuiltInTypeIds } from '@/lib/types';
import { TAB_BAR_HEIGHT } from '@/components/layout/BottomTabBar';
import type { MatchType } from '@/lib/search';

// Match type filter options (only shown when semantic search is enabled)
const MATCH_TYPE_FILTERS: { id: MatchType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'text', label: 'Text' },
  { id: 'semantic', label: 'AI' },
  { id: 'hybrid', label: 'Both' },
];

// Local storage key for recent searches
const RECENT_SEARCHES_KEY = 'skelenote:recentSearches';
const MAX_RECENT_SEARCHES = 10;

// Common type filters for quick access
const TYPE_FILTERS = [
  { id: 'all', label: 'All', typeId: null },
  { id: 'tasks', label: 'Tasks', typeId: BuiltInTypeIds.TASK },
  { id: 'notes', label: 'Notes', typeId: BuiltInTypeIds.NOTE },
  { id: 'projects', label: 'Projects', typeId: BuiltInTypeIds.PROJECT },
  { id: 'links', label: 'Links', typeId: BuiltInTypeIds.LINK },
  { id: 'meetings', label: 'Meetings', typeId: BuiltInTypeIds.MEETING },
] as const;

// Date range filter options
type DateRangeId = 'any' | 'today' | 'week' | 'month' | 'quarter';

const DATE_FILTERS: { id: DateRangeId; label: string }[] = [
  { id: 'any', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'Last 3 months' },
];

// Helper to get date range timestamps
function getDateRange(
  rangeId: DateRangeId
): { start: number; end: number } | null {
  if (rangeId === 'any') return null;

  const now = new Date();
  const end = now.getTime();
  let start: number;

  switch (rangeId) {
    case 'today': {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      start = startOfDay.getTime();
      break;
    }
    case 'week': {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      start = startOfWeek.getTime();
      break;
    }
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      start = startOfMonth.getTime();
      break;
    }
    case 'quarter': {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);
      start = threeMonthsAgo.getTime();
      break;
    }
    default:
      return null;
  }

  return { start, end };
}

interface MobileSearchModalProps {
  opened: boolean;
  onClose: () => void;
}

export function MobileSearchModal({ opened, onClose }: MobileSearchModalProps) {
  const { safeAreaBottom } = usePlatform();
  const { navigateToObject } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const semanticSearch = useSemanticSearchSafe();
  const inputRef = useRef<HTMLInputElement>(null);

  const [localQuery, setLocalQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
  const [activeDateFilter, setActiveDateFilter] = useState<DateRangeId>('any');
  const [activeMatchTypeFilter, setActiveMatchTypeFilter] = useState<
    MatchType | 'all'
  >('all');
  const [showFilters, setShowFilters] = useState(false);

  // Check if semantic search is enabled and ready
  const isSemanticEnabled =
    semanticSearch?.isEnabled && semanticSearch?.status === 'ready';

  // Use search hook - it manages its own internal query state
  const { results, isSearching, setQuery } = useSearch({ debounceMs: 200 });

  // Sync local query to search hook
  useEffect(() => {
    setQuery(localQuery);
  }, [localQuery, setQuery]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (opened) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setLocalQuery('');
      setActiveTypeFilter(null);
      setActiveDateFilter('any');
      setActiveMatchTypeFilter('all');
      setShowFilters(false);
    }
  }, [opened]);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Remove single recent search
  const removeRecentSearch = useCallback((searchQuery: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== searchQuery);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  // Handle result click
  const handleResultClick = useCallback(
    (objectId: string) => {
      if (localQuery.trim()) {
        saveRecentSearch(localQuery);
      }
      navigateToObject(objectId);
      onClose();
    },
    [localQuery, saveRecentSearch, navigateToObject, onClose]
  );

  // Get icon for type
  const getTypeIcon = useCallback(
    (typeId: string): IconName => {
      const typeDef = typeRegistry.get(typeId);
      if (!typeDef?.icon) return 'file';
      if (typeDef.icon.length <= 2) {
        return getIconFromEmoji(typeDef.icon);
      }
      return typeDef.icon as IconName;
    },
    [typeRegistry]
  );

  // Filter results by type, date, and match type
  const filteredResults = useMemo(() => {
    let filtered = results;

    // Apply type filter
    if (activeTypeFilter) {
      filtered = filtered.filter(
        (result) => result.item.typeId === activeTypeFilter
      );
    }

    // Apply date filter
    const dateRange = getDateRange(activeDateFilter);
    if (dateRange) {
      filtered = filtered.filter((result) => {
        const updatedAt = result.item.updatedAt;
        return updatedAt >= dateRange.start && updatedAt <= dateRange.end;
      });
    }

    // Apply match type filter (only when semantic is enabled)
    if (isSemanticEnabled && activeMatchTypeFilter !== 'all') {
      filtered = filtered.filter((result) => {
        const matchType = result.matchType ?? 'text';
        // Direct match
        if (matchType === activeMatchTypeFilter) return true;
        // Hybrid passes through text and semantic filters
        if (matchType === 'hybrid') {
          return (
            activeMatchTypeFilter === 'text' ||
            activeMatchTypeFilter === 'semantic'
          );
        }
        return false;
      });
    }

    return filtered;
  }, [
    results,
    activeTypeFilter,
    activeDateFilter,
    activeMatchTypeFilter,
    isSemanticEnabled,
  ]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, typeof filteredResults> = {};
    for (const result of filteredResults) {
      const typeId = result.item.typeId;
      if (!groups[typeId]) {
        groups[typeId] = [];
      }
      groups[typeId].push(result);
    }
    return groups;
  }, [filteredResults]);

  if (!opened) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: TAB_BAR_HEIGHT + safeAreaBottom,
        zIndex: 200,
        backgroundColor: 'var(--surface-paper)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Search header */}
      <MobileViewHeader
        title="Search"
        showBack={false}
        rightSection={
          <Button variant="subtle" size="xs" onClick={onClose}>
            Cancel
          </Button>
        }
      />

      {/* Search input */}
      <Group gap="xs" px="sm" py="xs">
        <TextInput
          ref={inputRef}
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search notes, tasks, projects..."
          variant="filled"
          size="md"
          leftSection={<Search size={18} />}
          rightSection={
            localQuery && (
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setLocalQuery('')}
              >
                <X size={14} />
              </ActionIcon>
            )
          }
          style={{ flex: 1 }}
          styles={{
            input: {
              height: 44,
              borderRadius: 22,
            },
          }}
        />
        <ActionIcon
          variant={showFilters ? 'filled' : 'subtle'}
          color={
            showFilters ||
            activeTypeFilter ||
            activeDateFilter !== 'any' ||
            activeMatchTypeFilter !== 'all'
              ? 'ember'
              : 'gray'
          }
          size={44}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
        </ActionIcon>
      </Group>

      {/* Filter panels */}
      {showFilters && (
        <Box
          px="sm"
          py="xs"
          style={{
            borderBottom: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-overlay)',
          }}
        >
          <Stack gap="xs">
            {/* Type filter chips */}
            <Box>
              <Text size="xs" c="dimmed" fw={500} mb={4}>
                Type
              </Text>
              <ScrollArea type="never" offsetScrollbars={false}>
                <Group gap="xs" wrap="nowrap">
                  {TYPE_FILTERS.map((filter) => (
                    <Chip
                      key={filter.id}
                      checked={
                        filter.typeId === null
                          ? activeTypeFilter === null
                          : activeTypeFilter === filter.typeId
                      }
                      onChange={() =>
                        setActiveTypeFilter(
                          filter.typeId === activeTypeFilter
                            ? null
                            : filter.typeId
                        )
                      }
                      variant="outline"
                      size="sm"
                      radius="xl"
                      styles={{
                        label: {
                          paddingLeft: 12,
                          paddingRight: 12,
                        },
                      }}
                    >
                      {filter.label}
                    </Chip>
                  ))}
                </Group>
              </ScrollArea>
            </Box>

            {/* Date filter chips */}
            <Box>
              <Text size="xs" c="dimmed" fw={500} mb={4}>
                Updated
              </Text>
              <ScrollArea type="never" offsetScrollbars={false}>
                <Group gap="xs" wrap="nowrap">
                  {DATE_FILTERS.map((filter) => (
                    <Chip
                      key={filter.id}
                      checked={activeDateFilter === filter.id}
                      onChange={() => setActiveDateFilter(filter.id)}
                      variant="outline"
                      size="sm"
                      radius="xl"
                      styles={{
                        label: {
                          paddingLeft: 12,
                          paddingRight: 12,
                        },
                      }}
                    >
                      {filter.label}
                    </Chip>
                  ))}
                </Group>
              </ScrollArea>
            </Box>

            {/* Match type filter chips - only show when semantic search is enabled */}
            {isSemanticEnabled && (
              <Box>
                <Text size="xs" c="dimmed" fw={500} mb={4}>
                  Match Type
                </Text>
                <ScrollArea type="never" offsetScrollbars={false}>
                  <Group gap="xs" wrap="nowrap">
                    {MATCH_TYPE_FILTERS.map((filter) => (
                      <Chip
                        key={filter.id}
                        checked={activeMatchTypeFilter === filter.id}
                        onChange={() => setActiveMatchTypeFilter(filter.id)}
                        variant="outline"
                        size="sm"
                        radius="xl"
                        styles={{
                          label: {
                            paddingLeft: 12,
                            paddingRight: 12,
                          },
                        }}
                      >
                        {filter.label}
                      </Chip>
                    ))}
                  </Group>
                </ScrollArea>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Active filter indicator */}
      {(activeTypeFilter ||
        activeDateFilter !== 'any' ||
        activeMatchTypeFilter !== 'all') &&
        !showFilters && (
          <Box
            px="md"
            py="xs"
            style={{
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-overlay)',
            }}
          >
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Filtering by:
              </Text>
              {activeTypeFilter && (
                <Badge
                  size="sm"
                  variant="light"
                  color="ember"
                  rightSection={
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      onClick={() => setActiveTypeFilter(null)}
                    >
                      <X size={10} />
                    </ActionIcon>
                  }
                >
                  {
                    TYPE_FILTERS.find((f) => f.typeId === activeTypeFilter)
                      ?.label
                  }
                </Badge>
              )}
              {activeDateFilter !== 'any' && (
                <Badge
                  size="sm"
                  variant="light"
                  color="ember"
                  rightSection={
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      onClick={() => setActiveDateFilter('any')}
                    >
                      <X size={10} />
                    </ActionIcon>
                  }
                >
                  {DATE_FILTERS.find((f) => f.id === activeDateFilter)?.label}
                </Badge>
              )}
              {activeMatchTypeFilter !== 'all' && (
                <Badge
                  size="sm"
                  variant="light"
                  color="ember"
                  rightSection={
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      onClick={() => setActiveMatchTypeFilter('all')}
                    >
                      <X size={10} />
                    </ActionIcon>
                  }
                >
                  {
                    MATCH_TYPE_FILTERS.find(
                      (f) => f.id === activeMatchTypeFilter
                    )?.label
                  }
                </Badge>
              )}
            </Group>
          </Box>
        )}

      {/* Results area */}
      <Box style={{ flex: 1, overflow: 'auto' }}>
        {localQuery.trim() === '' ? (
          // Recent searches
          <Stack gap={0}>
            {recentSearches.length > 0 && (
              <>
                <Text
                  size="xs"
                  fw={500}
                  c="dimmed"
                  px="md"
                  py="sm"
                  tt="uppercase"
                >
                  Recent Searches
                </Text>
                {recentSearches.map((search) => (
                  <UnstyledButton
                    key={search}
                    onClick={() => setLocalQuery(search)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <History
                      size={16}
                      style={{ color: 'var(--mantine-color-gray-5)' }}
                    />
                    <Text size="sm" style={{ flex: 1 }}>
                      {search}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(search);
                      }}
                    >
                      <X size={14} />
                    </ActionIcon>
                  </UnstyledButton>
                ))}
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={clearRecentSearches}
                  mx="md"
                  mt="sm"
                >
                  Clear recent searches
                </Button>
              </>
            )}
            {recentSearches.length === 0 && (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <Search
                    size={32}
                    style={{ color: 'var(--mantine-color-gray-4)' }}
                  />
                  <Text c="dimmed">Search for anything</Text>
                </Stack>
              </Center>
            )}
          </Stack>
        ) : isSearching ? (
          // Loading state
          <Center py="xl">
            <Loader size="sm" color="ember" />
          </Center>
        ) : filteredResults.length === 0 ? (
          // No results
          <Stack align="center" py="xl" gap="sm">
            <Search
              size={32}
              style={{ color: 'var(--mantine-color-gray-4)' }}
            />
            <Text c="dimmed" ta="center" px="md">
              {results.length > 0 &&
              (activeTypeFilter ||
                activeDateFilter !== 'any' ||
                activeMatchTypeFilter !== 'all')
                ? 'No matches with current filters'
                : `No results for "${localQuery}"`}
            </Text>
            {results.length > 0 &&
              (activeTypeFilter ||
                activeDateFilter !== 'any' ||
                activeMatchTypeFilter !== 'all') && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setActiveTypeFilter(null);
                    setActiveDateFilter('any');
                    setActiveMatchTypeFilter('all');
                  }}
                >
                  Clear filters to see {results.length} result
                  {results.length !== 1 ? 's' : ''}
                </Button>
              )}
          </Stack>
        ) : (
          // Results grouped by type
          <Stack gap={0}>
            {Object.entries(groupedResults).map(([typeId, typeResults]) => {
              const typeDef = typeRegistry.get(typeId);
              return (
                <Box key={typeId}>
                  <Group gap="xs" px="md" py="sm">
                    <Text size="xs" fw={500} c="dimmed" tt="uppercase">
                      {typeDef?.name ?? 'Items'}
                    </Text>
                    <Badge size="xs" variant="light" color="gray">
                      {typeResults.length}
                    </Badge>
                  </Group>
                  {typeResults.map((result) => {
                    // SearchableItem has title directly, not nested under properties
                    const title = result.item.title || 'Untitled';
                    const matchText =
                      result.matches.length > 0
                        ? result.matches[0].value
                        : null;

                    return (
                      <UnstyledButton
                        key={result.item.id}
                        onClick={() => handleResultClick(result.item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <Icon
                          name={getTypeIcon(result.item.typeId)}
                          size={20}
                          style={{
                            color: 'var(--mantine-color-gray-5)',
                            marginTop: 2,
                            flexShrink: 0,
                          }}
                        />
                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Text
                              size="sm"
                              fw={500}
                              truncate
                              style={{ flex: 1 }}
                            >
                              {title}
                            </Text>
                            {isSemanticEnabled && result.matchType && (
                              <MatchTypeBadge
                                matchType={result.matchType}
                                semanticScore={result.semanticScore}
                              />
                            )}
                          </Group>
                          {matchText && (
                            <Text size="xs" c="dimmed" lineClamp={2}>
                              ...{matchText}...
                            </Text>
                          )}
                        </Stack>
                        <ChevronRight
                          size={16}
                          style={{ color: 'var(--mantine-color-gray-4)' }}
                        />
                      </UnstyledButton>
                    );
                  })}
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
