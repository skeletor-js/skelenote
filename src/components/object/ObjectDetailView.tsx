import { useCallback, useMemo } from 'react';
import './ObjectDetailView.css';
import { ObjectHeader } from './ObjectHeader';
import { PropertyList } from './PropertyList';
import { Backlinks } from './Backlinks';
import { Editor } from '@/components/editor';
import { DailyNoteHeader } from '@/components/daily';
import { ConfirmDialog } from '@/components/ui';
import { removeMentionsFromContent } from '@/lib/editor';
import type { PropertyValue } from '@/lib/types';
import {
  useObjects,
  useNavigation,
  useTypeRegistry,
  useToast,
} from '@/contexts';
import { useConfirmDialog } from '@/hooks';

interface ObjectDetailViewProps {
  objectId: string;
  /** Which pane this view is rendered in */
  paneType?: 'primary' | 'secondary';
}

export function ObjectDetailView({ objectId, paneType = 'primary' }: ObjectDetailViewProps) {
  const { store, isLoading, refreshData, scheduleSave } = useObjects();
  const { navigateBack, canGoBack, closeSplit, splitPane, navigateToView } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  // Check if we're in version comparison mode
  const isVersionComparison = splitPane.mode === 'version-comparison';

  // Handler to go back to Time Machine from comparison view
  const handleBackToTimeMachine = useCallback(() => {
    closeSplit();
    navigateToView('time-machine');
  }, [closeSplit, navigateToView]);

  const handleDelete = useCallback(async () => {
    if (!store) return;

    const object = store.get(objectId);
    if (!object) return;

    const typeDef = typeRegistry.get(object.typeId);
    const titleProp = object.properties.title ?? object.properties.name ?? 'Untitled';
    const title = String(titleProp);

    const confirmed = await confirm({
      title: `Delete ${typeDef?.name ?? 'Object'}?`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      // Clean up mentions of this object in other objects' content
      const allObjects = store.getAll();
      for (const obj of allObjects) {
        if (obj.id === objectId) continue; // Skip the object being deleted

        try {
          const content = store.getContent(obj.id);
          if (content) {
            const cleanedContent = removeMentionsFromContent(content, objectId);
            if (cleanedContent) {
              store.setContent(obj.id, cleanedContent);
            }
          }
        } catch {
          // Content might not exist for this object, skip
        }
      }

      store.delete(objectId);
      refreshData();
      addToast({
        type: 'success',
        message: `"${title}" has been deleted.`,
      });
      // Navigate based on pane type
      if (paneType === 'secondary') {
        closeSplit();
      } else if (canGoBack) {
        navigateBack();
      }
    }
  }, [store, objectId, typeRegistry, confirm, refreshData, addToast, canGoBack, navigateBack, paneType, closeSplit]);

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
      // But do schedule a save to persist content changes
      scheduleSave();
    },
    [store, objectId, scheduleSave]
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

  const secondaryClass = paneType === 'secondary' ? ' object-detail--secondary' : '';

  if (isLoading || !store) {
    return (
      <div className={`object-detail object-detail--loading${secondaryClass}`}>
        <p>Loading...</p>
      </div>
    );
  }

  const object = store.get(objectId);

  if (!object) {
    return (
      <div className={`object-detail object-detail--error${secondaryClass}`}>
        <p>Object not found: {objectId}</p>
        {paneType === 'secondary' ? (
          <button onClick={closeSplit} className="object-detail__back-btn">
            Close
          </button>
        ) : (
          canGoBack && (
            <button onClick={navigateBack} className="object-detail__back-btn">
              ← Go Back
            </button>
          )
        )}
      </div>
    );
  }

  const typeDef = typeRegistry.get(object.typeId);

  if (!typeDef) {
    return (
      <div className={`object-detail object-detail--error${secondaryClass}`}>
        <p>Unknown object type: {object.typeId}</p>
        {paneType === 'secondary' ? (
          <button onClick={closeSplit} className="object-detail__back-btn">
            Close
          </button>
        ) : (
          canGoBack && (
            <button onClick={navigateBack} className="object-detail__back-btn">
              ← Go Back
            </button>
          )
        )}
      </div>
    );
  }

  const isDailyNote = object.properties.isDailyNote === true;

  const detailClasses = [
    'object-detail',
    paneType === 'secondary' ? 'object-detail--secondary' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={detailClasses}>
      {/* Navigation: Back to Time Machine (in comparison mode), Daily note header, or regular back button */}
      {paneType === 'primary' && (
        isVersionComparison ? (
          <button onClick={handleBackToTimeMachine} className="object-detail__back-btn">
            ← Back to Time Machine
          </button>
        ) : isDailyNote && typeof object.properties.date === 'number' ? (
          <DailyNoteHeader dateTimestamp={object.properties.date} />
        ) : (
          canGoBack && (
            <button onClick={navigateBack} className="object-detail__back-btn">
              ← Back
            </button>
          )
        )
      )}

      {/* Header with inline title editing and delete */}
      <ObjectHeader
        object={object}
        typeDef={typeDef}
        onTitleChange={handleTitleChange}
        onDelete={handleDelete}
        canDelete={!isDailyNote}
        paneType={paneType}
        onCloseSplit={paneType === 'secondary' ? closeSplit : undefined}
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

      {/* Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
