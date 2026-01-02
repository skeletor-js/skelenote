/**
 * CommandPalette - Cmd+K command palette for navigation and actions
 * Includes integrated search mode for full-text search across objects
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Modal, TextInput, Stack, Group, Text, Kbd, ScrollArea, Loader, Box } from '@mantine/core';
import { Search } from 'lucide-react';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { useLinkToDaily, useSearch } from '@/hooks';
import {
  getStaticActions,
  filterActions,
  type PaletteAction,
  QUICK_CAPTURE_ACTION_ID,
  SEARCH_ACTION_ID,
  OPEN_IN_SPLIT_ACTION_ID,
  KEYBOARD_SHORTCUTS_ACTION_ID,
  CREATE_FROM_TEMPLATE_ACTION_ID,
  NEW_TEMPLATE_ACTION_ID,
} from '@/lib/palette/actions';
import { searchObjects, sortByRelevance } from '@/lib/palette/search';
import { PaletteItem } from './PaletteItem';
import { SearchResultItem } from '@/components/search';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickCapture?: () => void;
  onOpenShortcuts?: () => void;
  onCreateFromTemplate?: () => void;
  onNewTemplate?: () => void;
}

export function CommandPalette({ isOpen, onClose, onQuickCapture, onOpenShortcuts, onCreateFromTemplate, onNewTemplate }: CommandPaletteProps) {
  const { navigateToView, navigateToObject, openInSplit, selectedObjectId, currentView } = useNavigation();
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { linkToDaily } = useLinkToDaily();

  // Normal palette state
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search mode state (explicit search mode for dedicated search)
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Unified search - used for both normal mode object search and explicit search mode
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isSearching,
    clear: clearSearch,
  } = useSearch({ limit: 10 });

  // Get all available static actions
  const staticActions = useMemo(() => getStaticActions(), []);

  // Get all objects sorted by relevance
  const allObjects = useMemo(() => {
    if (!store) return [];
    return sortByRelevance(store.getAll());
  }, [store]);

  // Sync normal mode query with search hook
  useEffect(() => {
    if (!isSearchMode && query.trim()) {
      setSearchQuery(query);
    }
  }, [query, isSearchMode, setSearchQuery]);

  // Filter and combine results (normal mode)
  const filteredActions = useMemo(() => {
    // Filter static actions
    const filteredStatic = filterActions(staticActions, query);

    // If there's a query and we have search results (including semantic), use them
    // Otherwise fall back to basic object search
    const hasQuery = query.trim().length > 0;
    let objectResults: PaletteAction[];

    if (hasQuery && searchResults.length > 0) {
      // Convert search results to palette actions
      objectResults = searchResults.slice(0, 8).map((result) => {
        const typeDef = typeRegistry.get(result.item.typeId);
        return {
          id: `object-${result.item.id}`,
          label: result.item.title || 'Untitled',
          icon: typeDef?.icon ?? 'file',
          category: 'object' as const,
          objectId: result.item.id,
          // Include semantic info for display
          matchType: result.matchType,
          semanticScore: result.semanticScore,
        };
      });
    } else {
      // Fall back to basic search for immediate results
      objectResults = searchObjects(allObjects, query, typeRegistry, 8);
    }

    // Combine: static actions first, then object results
    return [...filteredStatic, ...objectResults];
  }, [staticActions, allObjects, typeRegistry, query, searchResults]);

  // Items to display (depends on mode)
  const displayItemCount = isSearchMode ? searchResults.length : filteredActions.length;

  // Reset state when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
      setIsSearchMode(false);
      clearSearch();
    }
  }, [isOpen, clearSearch]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayItemCount]);

  // Enter search mode
  const enterSearchMode = useCallback(() => {
    setIsSearchMode(true);
    setSearchQuery('');
    setSelectedIndex(0);
    // Focus will be handled by the input
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [setSearchQuery]);

  // Exit search mode
  const exitSearchMode = useCallback(() => {
    setIsSearchMode(false);
    setQuery('');
    setSelectedIndex(0);
    clearSearch();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [clearSearch]);

  // Execute action (normal mode)
  const executeAction = useCallback(
    (action: PaletteAction) => {
      // Search action - enter search mode
      if (action.id === SEARCH_ACTION_ID) {
        enterSearchMode();
        return;
      }

      // Quick Capture action - special handling
      if (action.id === QUICK_CAPTURE_ACTION_ID) {
        onClose();
        onQuickCapture?.();
        return;
      }

      // Open in Split View - opens current object in secondary pane
      if (action.id === OPEN_IN_SPLIT_ACTION_ID) {
        if (currentView === 'object' && selectedObjectId) {
          openInSplit(selectedObjectId);
        }
        onClose();
        return;
      }

      // Keyboard Shortcuts action - open shortcuts modal
      if (action.id === KEYBOARD_SHORTCUTS_ACTION_ID) {
        onClose();
        onOpenShortcuts?.();
        return;
      }

      // Create from Template action - open template picker
      if (action.id === CREATE_FROM_TEMPLATE_ACTION_ID) {
        onClose();
        onCreateFromTemplate?.();
        return;
      }

      // New Template action - open template editor
      if (action.id === NEW_TEMPLATE_ACTION_ID) {
        onClose();
        onNewTemplate?.();
        return;
      }

      if (action.view) {
        // Navigation action
        navigateToView(action.view);
      } else if (action.objectId) {
        // Object navigation
        navigateToObject(action.objectId);
      } else if (action.typeId && store) {
        // Create action - create new object and navigate to it
        let properties: Record<string, string | number | boolean | string[] | null> = {};
        if (action.typeId === 'task') {
          properties = { title: 'New Task', status: 'todo' };
        } else if (action.typeId === 'note') {
          properties = { title: 'New Note' };
        } else if (action.typeId === 'link') {
          properties = { url: '', title: 'New Link' };
        }
        const newObject = store.create({
          typeId: action.typeId,
          properties,
        });
        // Link to today's daily note
        linkToDaily(newObject);
        refreshData();
        navigateToObject(newObject.id);
      } else if (action.action) {
        action.action();
      }
      onClose();
    },
    [navigateToView, navigateToObject, store, linkToDaily, refreshData, onClose, onQuickCapture, onOpenShortcuts, onCreateFromTemplate, onNewTemplate, enterSearchMode, currentView, selectedObjectId, openInSplit]
  );

  // Navigate to search result
  const selectSearchResult = useCallback(
    (index: number) => {
      const result = searchResults[index];
      if (result) {
        navigateToObject(result.item.id);
        onClose();
      }
    },
    [searchResults, navigateToObject, onClose]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSearchMode) {
        // Search mode keyboard handling
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            selectSearchResult(selectedIndex);
            break;
          case 'Escape':
            e.preventDefault();
            exitSearchMode();
            break;
        }
      } else {
        // Normal mode keyboard handling
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, filteredActions.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (filteredActions[selectedIndex]) {
              executeAction(filteredActions[selectedIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            onClose();
            break;
        }
      }
    },
    [isSearchMode, filteredActions, searchResults, selectedIndex, executeAction, selectSearchResult, exitSearchMode, onClose]
  );

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      size="lg"
      centered
      withCloseButton={false}
      padding={0}
      radius="md"
      styles={{
        body: { padding: 0 },
        content: { overflow: 'hidden' },
      }}
    >
      <Stack gap={0}>
        {/* Search input */}
        <Box p="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <TextInput
            ref={inputRef}
            leftSection={
              isSearchMode ? (
                <Search size={16} style={{ color: 'var(--mantine-color-blue-5)' }} />
              ) : (
                <Search size={16} />
              )
            }
            rightSection={isSearching ? <Loader size="xs" /> : undefined}
            placeholder={isSearchMode ? 'Search objects...' : 'Type a command or search...'}
            value={isSearchMode ? searchQuery : query}
            onChange={(e) => isSearchMode ? setSearchQuery(e.target.value) : setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="unstyled"
            size="md"
            styles={{
              input: {
                fontSize: 'var(--mantine-font-size-md)',
              },
            }}
          />
        </Box>

        {/* Results */}
        <ScrollArea.Autosize mah={400} p="xs" role="listbox">
          {isSearchMode ? (
            // Search mode results
            searchQuery.trim() === '' ? (
              <Text c="dimmed" ta="center" py="xl">
                Type to search...
              </Text>
            ) : searchResults.length === 0 && !isSearching ? (
              <Text c="dimmed" ta="center" py="xl">
                No results found
              </Text>
            ) : (
              <Stack gap={0}>
                {searchResults.map((result, index) => (
                  <SearchResultItem
                    key={result.item.id}
                    result={result}
                    isSelected={index === selectedIndex}
                    onClick={() => selectSearchResult(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  />
                ))}
              </Stack>
            )
          ) : (
            // Normal mode results
            filteredActions.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No results found
              </Text>
            ) : (
              <Stack gap={0}>
                {filteredActions.map((action, index) => (
                  <PaletteItem
                    key={action.id}
                    action={action}
                    isSelected={index === selectedIndex}
                    onClick={() => executeAction(action)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  />
                ))}
              </Stack>
            )
          )}
        </ScrollArea.Autosize>

        {/* Footer with keyboard hints */}
        <Box
          p="xs"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Group gap="lg" justify="center">
            <Group gap={4}>
              <Kbd size="xs">↑</Kbd>
              <Kbd size="xs">↓</Kbd>
              <Text size="xs" c="dimmed">Navigate</Text>
            </Group>
            <Group gap={4}>
              <Kbd size="xs">↵</Kbd>
              <Text size="xs" c="dimmed">Select</Text>
            </Group>
            <Group gap={4}>
              <Kbd size="xs">esc</Kbd>
              <Text size="xs" c="dimmed">{isSearchMode ? 'Back' : 'Close'}</Text>
            </Group>
          </Group>
        </Box>
      </Stack>
    </Modal>
  );
}
