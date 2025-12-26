import { useState } from 'react';
import './ObjectDetailView.css';
import {
  useObjects,
  useNavigation,
  useTypeRegistry,
} from '@/contexts';

interface ObjectDetailViewProps {
  objectId: string;
}

export function ObjectDetailView({ objectId }: ObjectDetailViewProps) {
  const { store, isLoading } = useObjects();
  const { navigateBack, canGoBack } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const [backlinksExpanded, setBacklinksExpanded] = useState(false);

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

  // Get the title property (varies by type: 'title' for most, 'name' for Project/Tag)
  const titleProp = object.properties.title ?? object.properties.name ?? 'Untitled';
  const title = typeof titleProp === 'string' ? titleProp : 'Untitled';

  return (
    <div className="object-detail">
      {/* Back navigation */}
      {canGoBack && (
        <button onClick={navigateBack} className="object-detail__back-btn">
          ← Back
        </button>
      )}

      {/* Header Section - will be replaced with ObjectHeader component */}
      <header className="object-detail__header">
        <span className="object-detail__icon">{typeDef.icon}</span>
        <h1 className="object-detail__title">{title}</h1>
      </header>

      {/* Properties Section - will be replaced with PropertyList component */}
      <section className="object-detail__properties">
        <h2 className="object-detail__section-title">Properties</h2>
        <div className="object-detail__property-list">
          {typeDef.schema
            .filter((prop) => prop.id !== 'title' && prop.id !== 'name')
            .map((propDef) => {
              const value = object.properties[propDef.id];
              return (
                <div key={propDef.id} className="object-detail__property">
                  <span className="object-detail__property-label">
                    {propDef.name}
                  </span>
                  <span className="object-detail__property-value">
                    {value === null || value === undefined
                      ? '—'
                      : Array.isArray(value)
                        ? `[${value.length} items]`
                        : String(value)}
                  </span>
                </div>
              );
            })}
        </div>
      </section>

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
