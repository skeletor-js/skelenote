/**
 * ObjectPreview - Shows a single object's details at a historical point
 */

import { useMemo } from 'react';
import { useTypeRegistry, useObjects } from '@/contexts';
import type { ObjectPreviewProps } from './types';
import './ObjectPreview.css';

/**
 * Get a display title for an object
 */
function getObjectTitle(obj: { properties: Record<string, unknown> }): string {
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

export function ObjectPreview({
  object,
  timestamp,
  onRestore,
  onCompareWithCurrent,
  onClose,
}: ObjectPreviewProps) {
  const typeRegistry = useTypeRegistry();
  const { docStore } = useObjects();

  const typeDef = typeRegistry.get(object.typeId);
  const icon = typeDef?.icon ?? '📄';
  const typeName = typeDef?.name ?? object.typeId;
  const title = getObjectTitle(object);

  // Get content - it's stored as a property in the historical object
  const content = useMemo(() => {
    if (!object.hasContent) return null;
    // Content is stored in properties.content for historical objects
    const contentValue = object.properties.content;
    if (typeof contentValue === 'string') {
      return contentValue;
    }
    return null;
  }, [object.hasContent, object.properties.content]);

  // Get property definitions for display
  const propertyDisplays = useMemo(() => {
    if (!typeDef) {
      // If no type def, show all properties
      return Object.entries(object.properties).map(([key, value]) => ({
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value: formatPropertyValue(value),
      }));
    }

    // Use schema to get proper labels
    return typeDef.schema.map((propDef) => ({
      id: propDef.id,
      label: propDef.name,
      value: formatPropertyValue(object.properties[propDef.id]),
    }));
  }, [typeDef, object.properties]);

  const formattedTimestamp = useMemo(() => {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [timestamp]);

  // Check if this object still exists in the current state
  const existsInCurrent = useMemo(() => {
    return docStore.getDocument('main') !== undefined;
  }, [docStore]);

  return (
    <div className="object-preview">
      <header className="object-preview__header">
        <button
          className="object-preview__back"
          onClick={onClose}
          title="Back to object list"
        >
          ←
        </button>

        <div className="object-preview__info">
          <div className="object-preview__icon">{icon}</div>
          <h2 className="object-preview__title">{title}</h2>
          <div className="object-preview__meta">
            <span className="object-preview__type-badge">{typeName}</span>
            <span className="object-preview__timestamp-badge">
              Historical: {formattedTimestamp}
            </span>
          </div>
        </div>

        <div className="object-preview__actions">
          {existsInCurrent && (
            <button
              className="object-preview__action-btn"
              onClick={onCompareWithCurrent}
              title="Open side-by-side comparison with current version"
            >
              Compare
            </button>
          )}
          <button
            className="object-preview__action-btn object-preview__action-btn--primary"
            onClick={onRestore}
            title="Restore this object to this historical state"
          >
            Restore This
          </button>
        </div>
      </header>

      <div className="object-preview__content">
        {/* Properties section */}
        <div className="object-preview__section">
          <h3 className="object-preview__section-title">Properties</h3>
          <div className="object-preview__properties">
            {propertyDisplays.map(({ id, label, value }) => (
              <div key={id} className="object-preview__prop-row">
                <span className="object-preview__prop-label">{label}</span>
                <span
                  className={`object-preview__prop-value ${!value ? 'object-preview__prop-value--empty' : ''}`}
                >
                  {value || '(empty)'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content section (if applicable) */}
        {object.hasContent && (
          <div className="object-preview__section">
            <h3 className="object-preview__section-title">Content</h3>
            <div
              className={`object-preview__text-content ${!content ? 'object-preview__text-content--empty' : ''}`}
            >
              {content || '(No content at this point in time)'}
            </div>
          </div>
        )}

        {/* Metadata section */}
        <div className="object-preview__section">
          <h3 className="object-preview__section-title">Metadata</h3>
          <div className="object-preview__properties">
            <div className="object-preview__prop-row">
              <span className="object-preview__prop-label">Created</span>
              <span className="object-preview__prop-value">
                {new Date(object.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="object-preview__prop-row">
              <span className="object-preview__prop-label">Last Modified</span>
              <span className="object-preview__prop-value">
                {new Date(object.updatedAt).toLocaleString()}
              </span>
            </div>
            <div className="object-preview__prop-row">
              <span className="object-preview__prop-label">In Inbox</span>
              <span className="object-preview__prop-value">
                {object.inboxed ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="object-preview__prop-row">
              <span className="object-preview__prop-label">Object ID</span>
              <span className="object-preview__prop-value">{object.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
