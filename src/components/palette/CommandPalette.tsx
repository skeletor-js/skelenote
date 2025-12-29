/**
 * CommandPalette - Cmd+K command palette for navigation and actions
 * Includes integrated search mode for full-text search across objects
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
} from '@/lib/palette/actions';
import { searchObjects, sortByRelevance } from '@/lib/palette/search';
import { PaletteItem } from './PaletteItem';
import { SearchResultItem } from '@/components/search';
import './CommandPalette.css';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickCapture?: () => void;
  onOpenShortcuts?: () => void;
}

export function CommandPalette({ isOpen, onClose, onQuickCapture, onOpenShortcuts }: CommandPaletteProps) {
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
          icon: typeDef?.icon ?? '📄',
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
    [navigateToView, navigateToObject, store, linkToDaily, refreshData, onClose, onQuickCapture, onOpenShortcuts, enterSearchMode, currentView, selectedObjectId, openInSplit]
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

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const content = (
    <div className="command-palette__backdrop" onClick={handleBackdropClick}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label={isSearchMode ? 'Search' : 'Command Palette'}
      >
        {/* Search input */}
        <div className="command-palette__search">
          {isSearchMode ? (
            <>
              <span className="command-palette__search-icon command-palette__search-icon--active">🔎</span>
              <input
                ref={inputRef}
                type="text"
                className="command-palette__input"
                placeholder="Search objects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {isSearching && (
                <span className="command-palette__loading">...</span>
              )}
            </>
          ) : (
            <>
              <span className="command-palette__search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                className="command-palette__input"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </>
          )}
        </div>

        {/* Results */}
        <div className="command-palette__results" role="listbox">
          {isSearchMode ? (
            // Search mode results
            searchQuery.trim() === '' ? (
              <div className="command-palette__empty">Type to search...</div>
            ) : searchResults.length === 0 && !isSearching ? (
              <div className="command-palette__empty">No results found</div>
            ) : (
              searchResults.map((result, index) => (
                <SearchResultItem
                  key={result.item.id}
                  result={result}
                  isSelected={index === selectedIndex}
                  onClick={() => selectSearchResult(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                />
              ))
            )
          ) : (
            // Normal mode results
            filteredActions.length === 0 ? (
              <div className="command-palette__empty">No results found</div>
            ) : (
              filteredActions.map((action, index) => (
                <PaletteItem
                  key={action.id}
                  action={action}
                  isSelected={index === selectedIndex}
                  onClick={() => executeAction(action)}
                  onMouseEnter={() => setSelectedIndex(index)}
                />
              ))
            )
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="command-palette__footer">
          <span className="command-palette__hint">
            <kbd>↑</kbd><kbd>↓</kbd> Navigate
          </span>
          <span className="command-palette__hint">
            <kbd>↵</kbd> Select
          </span>
          <span className="command-palette__hint">
            <kbd>esc</kbd> {isSearchMode ? 'Back' : 'Close'}
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
