/**
 * Omnibar - Unified command palette and search bar in the top nav
 */

import { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { TextInput, Popover, Loader, Box } from '@mantine/core';
import { Search } from 'lucide-react';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { useSearch, useLinkToDaily, useDuplicate, useTheme } from '@/hooks';
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
  TOGGLE_THEME_ACTION_ID,
} from '@/lib/palette/actions';
import { searchObjects, sortByRelevance } from '@/lib/palette/search';
import { OmnibarDropdown } from './OmnibarDropdown';
import classes from './Omnibar.module.css';

export interface OmnibarRef {
  focus: () => void;
  blur: () => void;
  /** Focus the omnibar with "/" prefix to enter command/create mode */
  focusCommandMode: () => void;
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
  const { toggleTheme } = useTheme();

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
    focusCommandMode: () => {
      setQuery('/');
      inputRef.current?.focus();
      // Move cursor to end after "/" prefix
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = 1;
          inputRef.current.selectionEnd = 1;
        }
      }, 0);
    },
  }));

  // Get all available static actions
  const staticActions = useMemo(() => getStaticActions(), []);

  // Get all objects sorted by relevance
  const allObjects = useMemo(() => {
    if (!store) return [];
    return sortByRelevance(store.getAll());
  }, [store]);

  // Determine if we're in command mode (query starts with /)
  const isCommandMode = query.startsWith('/');
  const searchQueryText = isCommandMode ? query.slice(1) : query;

  // Sync query with search hook (only in search mode)
  useEffect(() => {
    if (!isCommandMode && searchQueryText.trim()) {
      setSearchQuery(searchQueryText);
    }
  }, [searchQueryText, setSearchQuery, isCommandMode]);

  // Filter and combine results based on mode
  const combinedResults = useMemo(() => {
    const hasQuery = searchQueryText.trim().length > 0;

    // Command mode: show only commands filtered by query
    if (isCommandMode) {
      const filteredCommands = filterActions(staticActions, searchQueryText);
      return filteredCommands.slice(0, 10);
    }

    // Search mode: show only object results
    if (hasQuery) {
      let objectResults: PaletteAction[];

      if (searchResults.length > 0) {
        // Convert search results to palette actions
        objectResults = searchResults.slice(0, 10).map((result) => {
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
      } else {
        // Fall back to basic search for immediate results
        objectResults = searchObjects(allObjects, searchQueryText, typeRegistry, 10);
      }

      return objectResults;
    }

    // No query: show nothing (user needs to type to see results)
    return [];
  }, [staticActions, allObjects, typeRegistry, searchQueryText, searchResults, isCommandMode]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [combinedResults.length]);

  // Execute selected action
  const executeAction = useCallback(
    (action: PaletteAction) => {
      // Search action - navigate to full search view
      if (action.id === SEARCH_ACTION_ID) {
        navigateToSearch(searchQueryText);
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

      // Toggle Theme
      if (action.id === TOGGLE_THEME_ACTION_ID) {
        toggleTheme();
        setQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
        return;
      }

      if (action.view) {
        // Navigation action
        navigateToView(action.view);
      } else if (action.objectId) {
        // Object navigation
        navigateToObject(action.objectId);
      } else if (action.typeId && store) {
        // Create action - set default properties based on type
        let properties: Record<string, string | number | boolean | string[] | null> = {};
        switch (action.typeId) {
          case 'task':
            properties = { title: 'New Task', status: 'todo' };
            break;
          case 'note':
            properties = { title: 'New Note' };
            break;
          case 'link':
            properties = { url: '', title: 'New Link' };
            break;
          case 'meeting':
            properties = { title: 'New Meeting', startTime: Date.now() };
            break;
          case 'project':
            properties = { name: 'New Project', status: 'active' };
            break;
          case 'area':
            properties = { name: 'New Area' };
            break;
          case 'tag':
            properties = { name: 'New Tag' };
            break;
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
      searchQueryText,
      toggleTheme,
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
          if (isCommandMode && combinedResults[selectedIndex]) {
            // In command mode, execute the selected command
            executeAction(combinedResults[selectedIndex]);
          } else if (!isCommandMode && searchQueryText.trim()) {
            // In search mode, always navigate to full search results
            navigateToSearch(searchQueryText);
            setQuery('');
            setIsFocused(false);
            inputRef.current?.blur();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setQuery('');
          inputRef.current?.blur();
          break;
      }
    },
    [combinedResults, selectedIndex, executeAction, isCommandMode, searchQueryText, navigateToSearch]
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
            rightSection={isSearching ? <Loader size={12} /> : null}
            placeholder="Search or type / for commands..."
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
