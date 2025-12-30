/**
 * InboxView - main container for inbox view
 * Displays all objects with inboxed: true
 */

import { useMemo, useCallback, useEffect } from 'react';
import { useInbox, useSelection } from '@/hooks';
import { useNavigation, useObjects } from '@/contexts';
import { EmptyState } from '@/components/ui';
import { BulkActions } from '@/components/actions';
import { InboxRow } from './InboxRow';
import './InboxView.css';

export function InboxView() {
  const { items, isLoading, count, processItem, deleteItem } = useInbox();
  const { navigateToObject } = useNavigation();
  const { refreshData } = useObjects();

  // Get item IDs for selection hook
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  // Initialize selection
  const selection = useSelection({ allItems: itemIds });

  // Handle selection change (toggle or range)
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

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        // Only handle if focus is in the inbox view area
        const activeElement = document.activeElement;
        if (activeElement?.closest('.inbox-view')) {
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

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection]);

  if (isLoading) {
    return (
      <div className="inbox-view inbox-view--loading">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="inbox-view">
      {/* Header */}
      <header className="inbox-view__header">
        <h1 className="inbox-view__title">
          Inbox
          {count > 0 && <span className="inbox-view__count"> ({count})</span>}
        </h1>
      </header>

      {/* Content */}
      <div className="inbox-view__content">
        {items.length === 0 ? (
          <EmptyState message="All clear! Nothing to process." size="large" />
        ) : (
          <div className="inbox-view__list">
            {items.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                onClick={() => navigateToObject(item.id)}
                onProcess={processItem}
                onDelete={deleteItem}
                isSelected={selection.isSelected(item.id)}
                onSelectionChange={handleSelectionChange}
                isSelectingMode={selection.hasSelection}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedIds={selection.selectedArray}
        onClearSelection={selection.clear}
        onActionComplete={refreshData}
        viewType="inbox"
      />
    </div>
  );
}
