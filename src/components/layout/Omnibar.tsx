/**
 * Omnibar - Unified command palette and search bar in the top nav
 */

import { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { TextInput, Popover, Loader, Kbd, Box } from '@mantine/core';
import { Search } from 'lucide-react';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { useSearch, useLinkToDaily, useDuplicate } from '@/hooks';
import {
  getStaticActions,
  filterActions,
  type PaletteAction,
  QUICK_CAPTURE_ACTION_ID,
  SEARCH_ACTION_ID,
  OPEN_IN_SPLIT_ACTION_ID,
  DUPLICATE_OBJECT_ACTION_ID,
  KEYBOARD_SHORTCUTS_ACTION_ID,
  CREATE_FROM_TEMPLATE_ACTION_ID,
  NEW_TEMPLATE_ACTION_ID,
} from '@/lib/palette/actions';
import { searchObjects, sortByRelevance } from '@/lib/palette/search';
import { OmnibarDropdown } from './OmnibarDropdown';
import classes from './Omnibar.module.css';

export interface OmnibarRef {
  focus: () => void;
  blur: () => void;
}

interface OmnibarProps {
  onQuickCapture?: () => void;
  onOpenShortcuts?: () => void;
  onCreateFromTemplate?: () => void;
  onNewTemplate?: () => void;
}

/**
 * Omnibar - Combined search and command palette at top of screen.
 * Exposes focus/blur methods via ref for keyboard shortcut integration.
 */
export const Omnibar = forwardRef<OmnibarRef, OmnibarProps>(function Omnibar(
  { onQuickCapture, onOpenShortcuts, onCreateFromTemplate, onNewTemplate },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { navigateToView, navigateToObject, navigateToSearch, openInSplit, selectedObjectId, currentView } =
    useNavigation();
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { linkToDaily } = useLinkToDaily();
  const { duplicate, canDuplicate } = useDuplicate();

  // Search hook for object searching
  const {
    setQuery: setSearchQuery,
    results: searchResults,
    isSearching,
  } = useSearch({ limit: 8 });

  // Expose focus/blur methods to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    blur: () => {
      inputRef.current?.blur();
    },
  }));

  // Get all available static actions
  const staticActions = useMemo(() => getStaticActions(), []);

  // Get all objects sorted by relevance
  const allObjects = useMemo(() => {
    if (!store) return [];
    return sortByRelevance(store.getAll());
  }, [store]);

  // Sync query with search hook
  useEffect(() => {
    if (query.trim()) {
      setSearchQuery(query);
    }
  }, [query, setSearchQuery]);

  // Filter and combine results
  const combinedResults = useMemo(() => {
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
          matchType: result.matchType,
          semanticScore: result.semanticScore,
        };
      });
    } else if (hasQuery) {
      // Fall back to basic search for immediate results
      objectResults = searchObjects(allObjects, query, typeRegistry, 8);
    } else {
      objectResults = [];
    }

    // Combine: static actions first (limited), then object results
    const limitedStatic = hasQuery ? filteredStatic.slice(0, 5) : filteredStatic.slice(0, 8);
    return [...limitedStatic, ...objectResults];
  }, [staticActions, allObjects, typeRegistry, query, searchResults]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [combinedResults.length]);

  // Execute selected action
  const executeAction = useCallback(
    (action: PaletteAction) => {
      // Search action - navigate to full search view
      if (action.id === SEARCH_ACTION_ID) {
        navigateToSearch(query);
        setQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
        return;
      }

      // Quick Capture action
      if (action.id === QUICK_CAPTURE_ACTION_ID) {
        setQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
        onQuickCapture?.();
        return;
      }

      // Open in Split View
      if (action.id === OPEN_IN_SPLIT_ACTION_ID) {
        if (currentView === 'object' && selectedObjectId) {
          openInSplit(selectedObjectId);
        }
        setQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
        return;
      }

      // Duplicate Object
      if (action.id === DUPLICATE_OBJECT_ACTION_ID) {
        if (currentView === 'object' && selectedObjectId && canDuplicate(selectedObjectId)) {
          duplicate(selectedObjectId);
        }
        setQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
        return;
      }

      // Keyboard Shortcuts
      if (action.id === KEYBOARD_SHORTCUTS_ACTION_ID) {
        setQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
        onOpenShortcuts?.();
        return;
      }

      // Create from Template
      if (action.id === CREATE_FROM_TEMPLATE_ACTION_ID) {
        setQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
        onCreateFromTemplate?.();
        return;
      }

      // New Template
      if (action.id === NEW_TEMPLATE_ACTION_ID) {
        setQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
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
        // Create action
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
        linkToDaily(newObject);
        refreshData();
        navigateToObject(newObject.id);
      } else if (action.action) {
        action.action();
      }

      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [
      navigateToView,
      navigateToObject,
      navigateToSearch,
      store,
      linkToDaily,
      refreshData,
      onQuickCapture,
      onOpenShortcuts,
      onCreateFromTemplate,
      onNewTemplate,
      currentView,
      selectedObjectId,
      openInSplit,
      duplicate,
      canDuplicate,
      query,
    ]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, combinedResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (combinedResults[selectedIndex]) {
            executeAction(combinedResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setQuery('');
          inputRef.current?.blur();
          break;
      }
    },
    [combinedResults, selectedIndex, executeAction]
  );

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle blur with delay to allow click events
  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
    }, 150);
  };

  // Should show dropdown
  const showDropdown = isFocused && combinedResults.length > 0;

  return (
    <Box className={classes.omnibarWrapper}>
      <Popover
        opened={showDropdown}
        position="bottom"
        width="target"
        withinPortal
        shadow="md"
        radius="sm"
        offset={4}
      >
        <Popover.Target>
          <TextInput
            ref={inputRef}
            className={classes.omnibarInput}
            leftSection={<Search size={14} />}
            rightSection={
              isSearching ? (
                <Loader size={12} />
              ) : (
                <Kbd size="xs" style={{ fontSize: 10 }}>
                  ⌘K
                </Kbd>
              )
            }
            placeholder="Search or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            size="sm"
            variant="filled"
          />
        </Popover.Target>

        <Popover.Dropdown p={0}>
          <OmnibarDropdown
            results={combinedResults}
            selectedIndex={selectedIndex}
            isSearching={isSearching}
            onSelect={(index) => executeAction(combinedResults[index])}
            onMouseEnter={setSelectedIndex}
          />
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
});
