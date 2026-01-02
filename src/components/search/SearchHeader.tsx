/**
 * SearchHeader - Clean search input with minimal controls
 */

import { useRef, useEffect } from 'react';
import { Group, TextInput, Loader, ActionIcon, Box } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';

interface SearchHeaderProps {
  /** Current search query */
  query: string;
  /** Update search query */
  onQueryChange: (query: string) => void;
  /** Clear search */
  onClear: () => void;
  /** Whether search is in progress */
  isSearching: boolean;
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
    <Box>
      <Group gap="sm" wrap="nowrap">
        {/* Search input */}
        <TextInput
          ref={inputRef}
          leftSection={<Icon name="search" size={16} />}
          rightSection={
            isSearching ? (
              <Loader size={14} />
            ) : query ? (
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onClear}
                aria-label="Clear search"
              >
                <Icon name="x" size={14} />
              </ActionIcon>
            ) : null
          }
          placeholder="Search all notes, tasks, and more..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search"
          style={{ flex: 1 }}
        />

        {/* Filter toggle */}
        <ActionIcon
          variant={showFilters ? 'filled' : 'subtle'}
          size="lg"
          onClick={onToggleFilters}
          aria-expanded={showFilters}
          aria-label="Toggle filters"
        >
          <Icon name="sliders-horizontal" size={18} />
        </ActionIcon>
      </Group>
    </Box>
  );
}
