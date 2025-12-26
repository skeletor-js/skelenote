/**
 * CommandPalette - Cmd+K command palette for navigation and actions
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { useLinkToDaily } from '@/hooks';
import { getStaticActions, filterActions, type PaletteAction, QUICK_CAPTURE_ACTION_ID } from '@/lib/palette/actions';
import { searchObjects, sortByRelevance } from '@/lib/palette/search';
import { PaletteItem } from './PaletteItem';
import './CommandPalette.css';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickCapture?: () => void;
}

export function CommandPalette({ isOpen, onClose, onQuickCapture }: CommandPaletteProps) {
  const { navigateToView, navigateToObject } = useNavigation();
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { linkToDaily } = useLinkToDaily();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get all available static actions
  const staticActions = useMemo(() => getStaticActions(), []);

  // Get all objects sorted by relevance
  const allObjects = useMemo(() => {
    if (!store) return [];
    return sortByRelevance(store.getAll());
  }, [store]);

  // Filter and combine results
  const filteredActions = useMemo(() => {
    // Filter static actions
    const filteredStatic = filterActions(staticActions, query);

    // Search objects (only when there's a query)
    const objectResults = searchObjects(allObjects, query, typeRegistry, 8);

    // Combine: static actions first, then object results
    return [...filteredStatic, ...objectResults];
  }, [staticActions, allObjects, typeRegistry, query]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions.length]);

  // Execute action
  const executeAction = useCallback(
    (action: PaletteAction) => {
      // Quick Capture action - special handling
      if (action.id === QUICK_CAPTURE_ACTION_ID) {
        onClose();
        onQuickCapture?.();
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
    [navigateToView, navigateToObject, store, linkToDaily, refreshData, onClose, onQuickCapture]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    },
    [filteredActions, selectedIndex, executeAction, onClose]
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
        aria-label="Command Palette"
      >
        {/* Search input */}
        <div className="command-palette__search">
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
        </div>

        {/* Results */}
        <div className="command-palette__results" role="listbox">
          {filteredActions.length === 0 ? (
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
            <kbd>esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
