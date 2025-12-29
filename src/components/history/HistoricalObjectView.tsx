/**
 * HistoricalObjectView - Read-only view of an object at a historical point in time
 *
 * Used in the split pane for side-by-side version comparison.
 */

import { useMemo } from 'react';
import { useObjects, useTypeRegistry, useNavigation } from '@/contexts';
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
 * Format a date property value
 */
function formatDateValue(value: unknown): string {
  if (typeof value === 'number') {
    return new Date(value).toLocaleDateString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
    return value;
  }
  return String(value);
}

export function HistoricalObjectView() {
  const { docStore } = useObjects();
  const { splitPane, closeSplit, navigateToView } = useNavigation();
  const typeRegistry = useTypeRegistry();

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

  // Handle back to Time Machine
  const handleBackToTimeMachine = () => {
    closeSplit();
    navigateToView('time-machine');
  };

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

  // Get content text if available
  const contentText = historicalObject.properties.content as string | undefined;

  // Get properties to display (exclude content)
  const displayProperties = Object.entries(historicalObject.properties).filter(
    ([key]) => !['content'].includes(key)
  );

  return (
    <div className="historical-object-view">
      <header className="historical-object-view__header">
        <div className="historical-object-view__badge">
          Historical Version
        </div>
        <div className="historical-object-view__timestamp">
          {formattedTimestamp}
        </div>
        <div className="historical-object-view__actions">
          <button
            className="historical-object-view__back-btn"
            onClick={handleBackToTimeMachine}
            title="Back to Time Machine"
          >
            Back to Time Machine
          </button>
          <button
            className="historical-object-view__close-btn"
            onClick={closeSplit}
            title="Close comparison"
          >
            &times;
          </button>
        </div>
      </header>

      <div className="historical-object-view__content">
        <div className="historical-object-view__title-row">
          <span className="historical-object-view__icon">{icon}</span>
          <h2 className="historical-object-view__title">{title}</h2>
        </div>

        <div className="historical-object-view__meta">
          <span className="historical-object-view__type-badge">{typeName}</span>
        </div>

        {/* Properties Section */}
        {displayProperties.length > 0 && (
          <div className="historical-object-view__section">
            <h3 className="historical-object-view__section-title">Properties</h3>
            <div className="historical-object-view__properties">
              {displayProperties.map(([key, value]) => {
                let displayValue: string;
                if (value === null || value === undefined) {
                  displayValue = '—';
                } else if (key.toLowerCase().includes('date') || key === 'dueDate' || key === 'scheduledDate') {
                  displayValue = formatDateValue(value);
                } else if (typeof value === 'boolean') {
                  displayValue = value ? 'Yes' : 'No';
                } else if (typeof value === 'object') {
                  displayValue = JSON.stringify(value);
                } else {
                  displayValue = String(value);
                }

                return (
                  <div key={key} className="historical-object-view__prop-row">
                    <span className="historical-object-view__prop-label">{key}</span>
                    <span className={`historical-object-view__prop-value ${value === null || value === undefined ? 'historical-object-view__prop-value--empty' : ''}`}>
                      {displayValue}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Section */}
        {contentText !== undefined && (
          <div className="historical-object-view__section">
            <h3 className="historical-object-view__section-title">Content</h3>
            <div className={`historical-object-view__text-content ${!contentText ? 'historical-object-view__text-content--empty' : ''}`}>
              {contentText || 'No content'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
