/**
 * InboxView - main container for inbox view
 * Displays all objects with inboxed: true
 */

import { useInbox } from '@/hooks/useInbox';
import { useNavigation } from '@/contexts';
import { InboxRow } from './InboxRow';
import './InboxView.css';

export function InboxView() {
  const { items, isLoading, count, processItem, deleteItem } = useInbox();
  const { navigateToObject } = useNavigation();

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
          <div className="inbox-view__empty">
            <p className="inbox-view__empty-message">All clear! Nothing to process.</p>
          </div>
        ) : (
          <div className="inbox-view__list">
            {items.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                onClick={() => navigateToObject(item.id)}
                onProcess={processItem}
                onDelete={deleteItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
