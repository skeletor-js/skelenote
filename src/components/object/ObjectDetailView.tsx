import { useCallback, useMemo } from 'react';
import './ObjectDetailView.css';
import { ObjectHeader } from './ObjectHeader';
import { PropertyList } from './PropertyList';
import { Backlinks } from './Backlinks';
import { Editor } from '@/components/editor';
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

  const handleContentChange = useCallback(
    (content: string) => {
      if (!store) return;
      store.setContent(objectId, content);
      // Don't call refreshData here - editor handles its own state
    },
    [store, objectId]
  );

  // Get current content for the editor
  const currentContent = useMemo(() => {
    if (!store) return null;
    try {
      return store.getContent(objectId);
    } catch {
      return null;
    }
  }, [store, objectId]);

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

      {/* Content Section with BlockNote Editor */}
      {typeDef.hasContent && (
        <section className="object-detail__content">
          <h2 className="object-detail__section-title">Content</h2>
          <Editor
            objectId={objectId}
            initialContent={currentContent}
            onContentChange={handleContentChange}
          />
        </section>
      )}

      {/* Backlinks Section */}
      <Backlinks objectId={objectId} />
    </div>
  );
}
