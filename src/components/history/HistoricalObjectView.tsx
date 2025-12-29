/**
 * HistoricalObjectView - Read-only view of an object at a historical point in time
 *
 * Used in the split pane for side-by-side version comparison.
 */

import { useMemo, useCallback, useState } from 'react';
import { useObjects, useTypeRegistry, useNavigation, useToast } from '@/contexts';
import { extractPlainTextFromContent } from '@/lib/search';
import { RestoreDialog } from './RestoreDialog';
import type { SkelenoteObject } from '@/lib/types';
import './HistoricalObjectView.css';

/**
 * Get a display title for an object
 */
function getObjectTitle(obj: SkelenoteObject): string {
  const titleProps = ['title', 'name', 'url'];
  for (const prop of titleProps) {
    const value = obj.properties[prop];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return 'Untitled';
}

/**
 * Format a property value for display
 */
function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    // Check if it looks like a timestamp (ms since epoch)
    if (value > 1000000000000 && value < 2000000000000) {
      return new Date(value).toLocaleString();
    }
    return value.toLocaleString();
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export function HistoricalObjectView() {
  const { docStore, refreshData } = useObjects();
  const { splitPane, closeSplit } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();

  // Restore dialog state
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // Get the historical object from the frontier
  const historicalObject = useMemo((): SkelenoteObject | null => {
    if (!splitPane.historicalFrontier || !splitPane.objectId) return null;

    const objects = docStore.getObjectsAtVersion(splitPane.historicalFrontier);
    return (objects.find((obj) => obj.id === splitPane.objectId) as SkelenoteObject) ?? null;
  }, [docStore, splitPane.historicalFrontier, splitPane.objectId]);

  // Format the timestamp
  const formattedTimestamp = useMemo(() => {
    if (!splitPane.historicalTimestamp) return '';
    return new Date(splitPane.historicalTimestamp).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [splitPane.historicalTimestamp]);

  // Handle restore
  const handleRestoreClick = useCallback(() => {
    setRestoreDialogOpen(true);
  }, []);

  const handleRestoreConfirm = useCallback(() => {
    if (!splitPane.historicalFrontier || !splitPane.objectId) return;

    const success = docStore.restoreFromVersion(splitPane.historicalFrontier, {
      type: 'single',
      objectId: splitPane.objectId,
    });

    setRestoreDialogOpen(false);

    if (success) {
      refreshData();
      addToast({
        type: 'success',
        message: 'Object restored successfully!',
      });
      closeSplit();
    } else {
      addToast({
        type: 'error',
        message: 'Failed to restore. Check the console for details.',
      });
    }
  }, [splitPane.historicalFrontier, splitPane.objectId, docStore, refreshData, addToast, closeSplit]);

  const handleRestoreCancel = useCallback(() => {
    setRestoreDialogOpen(false);
  }, []);

  if (!historicalObject) {
    return (
      <div className="historical-object-view historical-object-view--empty">
        <p>Unable to load historical version</p>
        <button onClick={closeSplit}>Close</button>
      </div>
    );
  }

  const typeDef = typeRegistry.get(historicalObject.typeId);
  const icon = typeDef?.icon ?? '📄';
  const typeName = typeDef?.name ?? historicalObject.typeId;
  const title = getObjectTitle(historicalObject);

  // Get content text if available and parse it from BlockNote JSON
  const rawContent = historicalObject.properties.content as string | undefined;
  const contentText = rawContent ? extractPlainTextFromContent(rawContent) : null;

  // Get property definitions from type schema for proper labels
  const propertyDisplays = useMemo(() => {
    if (!typeDef) {
      // If no type def, show all properties except content
      return Object.entries(historicalObject.properties)
        .filter(([key]) => key !== 'content')
        .map(([key, value]) => ({
          id: key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          value: formatPropertyValue(value),
        }));
    }

    // Use schema to get proper labels
    return typeDef.schema.map((propDef) => ({
      id: propDef.id,
      label: propDef.name,
      value: formatPropertyValue(historicalObject.properties[propDef.id]),
    }));
  }, [typeDef, historicalObject.properties]);

  return (
    <div className="historical-object-view">
      <header className="historical-object-view__header">
        <div className="historical-object-view__badge">
          Historical Version
        </div>
        <div className="historical-object-view__timestamp">
          {formattedTimestamp}
        </div>
        <button
          className="historical-object-view__close-btn"
          onClick={closeSplit}
          title="Close comparison"
        >
          &times;
        </button>
      </header>

      <div className="historical-object-view__content">
        <div className="historical-object-view__title-row">
          <span className="historical-object-view__icon">{icon}</span>
          <h2 className="historical-object-view__title">{title}</h2>
        </div>

        <div className="historical-object-view__meta">
          <span className="historical-object-view__type-badge">{typeName}</span>
          <button
            className="historical-object-view__restore-btn"
            onClick={handleRestoreClick}
            title="Restore this object to this historical state"
          >
            Restore This
          </button>
        </div>

        {/* Properties Section */}
        {propertyDisplays.length > 0 && (
          <div className="historical-object-view__section">
            <h3 className="historical-object-view__section-title">Properties</h3>
            <div className="historical-object-view__properties">
              {propertyDisplays.map(({ id, label, value }) => (
                <div key={id} className="historical-object-view__prop-row">
                  <span className="historical-object-view__prop-label">{label}</span>
                  <span className={`historical-object-view__prop-value ${!value ? 'historical-object-view__prop-value--empty' : ''}`}>
                    {value || '(empty)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Section */}
        {historicalObject.hasContent && (
          <div className="historical-object-view__section">
            <h3 className="historical-object-view__section-title">Content</h3>
            <div className={`historical-object-view__text-content ${!contentText ? 'historical-object-view__text-content--empty' : ''}`}>
              {contentText || '(No content at this point in time)'}
            </div>
          </div>
        )}
      </div>

      {/* Restore Dialog */}
      <RestoreDialog
        isOpen={restoreDialogOpen}
        scope="single"
        timestamp={splitPane.historicalTimestamp ?? 0}
        objectTitle={title}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
      />
    </div>
  );
}
