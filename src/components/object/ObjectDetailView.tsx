import { useState, useCallback } from 'react';
import './ObjectDetailView.css';
import { ObjectHeader } from './ObjectHeader';
import { PropertyList } from './PropertyList';
import type { PropertyValue } from '@/lib/types';
import {
  useObjects,
  useNavigation,
  useTypeRegistry,
} from '@/contexts';

interface ObjectDetailViewProps {
  objectId: string;
}

export function ObjectDetailView({ objectId }: ObjectDetailViewProps) {
  const { store, isLoading, refreshData } = useObjects();
  const { navigateBack, canGoBack } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const [backlinksExpanded, setBacklinksExpanded] = useState(false);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!store) return;
      const object = store.get(objectId);
      if (!object) return;

      // Determine which property holds the title
      const titlePropertyId = object.properties.title !== undefined ? 'title' : 'name';
      store.setProperty(objectId, titlePropertyId, newTitle);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  const handlePropertyChange = useCallback(
    (propertyId: string, value: PropertyValue) => {
      if (!store) return;
      store.setProperty(objectId, propertyId, value);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  if (isLoading || !store) {
    return (
      <div className="object-detail object-detail--loading">
        <p>Loading...</p>
      </div>
    );
  }

  const object = store.get(objectId);

  if (!object) {
    return (
      <div className="object-detail object-detail--error">
        <p>Object not found: {objectId}</p>
        {canGoBack && (
          <button onClick={navigateBack} className="object-detail__back-btn">
            ← Go Back
          </button>
        )}
      </div>
    );
  }

  const typeDef = typeRegistry.get(object.typeId);

  if (!typeDef) {
    return (
      <div className="object-detail object-detail--error">
        <p>Unknown object type: {object.typeId}</p>
        {canGoBack && (
          <button onClick={navigateBack} className="object-detail__back-btn">
            ← Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="object-detail">
      {/* Back navigation */}
      {canGoBack && (
        <button onClick={navigateBack} className="object-detail__back-btn">
          ← Back
        </button>
      )}

      {/* Header with inline title editing */}
      <ObjectHeader
        object={object}
        typeDef={typeDef}
        onTitleChange={handleTitleChange}
      />

      {/* Properties Section */}
      <PropertyList
        object={object}
        typeDef={typeDef}
        onPropertyChange={handlePropertyChange}
      />

      {/* Content Section - will be replaced with Editor component */}
      {typeDef.hasContent && (
        <section className="object-detail__content">
          <h2 className="object-detail__section-title">Content</h2>
          <div className="object-detail__editor-placeholder">
            <p>Editor will be added in Commit 8</p>
          </div>
        </section>
      )}

      {/* Related Tasks Section - will be replaced with RelatedTasks component */}
      <section className="object-detail__tasks">
        <div className="object-detail__section-header">
          <h2 className="object-detail__section-title">Tasks</h2>
          <button className="object-detail__add-btn">+ Add</button>
        </div>
        <div className="object-detail__tasks-list">
          <p className="object-detail__placeholder-text">
            Related tasks will appear here
          </p>
        </div>
      </section>

      {/* Backlinks Section - will be replaced with Backlinks component */}
      <section className="object-detail__backlinks">
        <button
          className="object-detail__section-header object-detail__section-header--clickable"
          onClick={() => setBacklinksExpanded(!backlinksExpanded)}
          aria-expanded={backlinksExpanded}
        >
          <h2 className="object-detail__section-title">Backlinks</h2>
          <span className="object-detail__collapse-icon">
            {backlinksExpanded ? '▼' : '▶'}
          </span>
        </button>
        {backlinksExpanded && (
          <div className="object-detail__backlinks-list">
            <p className="object-detail__placeholder-text">
              Objects linking to this one will appear here
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
