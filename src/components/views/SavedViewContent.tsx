/**
 * SavedViewContent - Displays filtered objects based on a saved view configuration
 */

import { useMemo } from 'react';
import './SavedViewContent.css';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { useSavedViews } from '@/hooks';
import { executeQuery } from '@/lib/loro';
import { formatRelativeDate } from '@/lib/utils/date';
import { EmptyState } from '@/components/ui';

export function SavedViewContent() {
  const { activeSavedViewId, navigateToObject } = useNavigation();
  const { store } = useObjects();
  const { getView } = useSavedViews();
  const typeRegistry = useTypeRegistry();

  // Get the saved view
  const view = useMemo(() => {
    if (!activeSavedViewId) return null;
    return getView(activeSavedViewId);
  }, [activeSavedViewId, getView]);

  // Get filtered objects
  const filteredObjects = useMemo(() => {
    if (!view || !store) return [];

    // Get all objects, optionally filtered by type
    let objects = store.getAll();

    // Apply type filter if specified
    if (view.typeFilter) {
      objects = objects.filter((obj) => obj.typeId === view.typeFilter);
    }

    // Apply query filters and sort
    return executeQuery(objects, {
      filters: view.filters,
      sort: view.sort,
    });
  }, [view, store]);

  // Get type definition for display
  const getTypeDef = (typeId: string) => {
    return typeRegistry.get(typeId);
  };

  if (!view) {
    return (
      <div className="saved-view-content">
        <EmptyState message="View not found" size="large" />
      </div>
    );
  }

  return (
    <div className="saved-view-content">
      <header className="saved-view-content__header">
        <div className="saved-view-content__icon">{view.icon || '📋'}</div>
        <h1 className="saved-view-content__title">{view.name}</h1>
        <span className="saved-view-content__count">
          {filteredObjects.length} {filteredObjects.length === 1 ? 'item' : 'items'}
        </span>
      </header>

      {view.filters.length > 0 && (
        <div className="saved-view-content__filters">
          {view.filters.map((filter, index) => (
            <span key={index} className="saved-view-content__filter-tag">
              {filter.field} {filter.operator} {String(filter.value ?? '')}
            </span>
          ))}
        </div>
      )}

      <div className="saved-view-content__list">
        {filteredObjects.length === 0 ? (
          <EmptyState message="No items match this view's filters" size="large" />
        ) : (
          filteredObjects.map((obj) => {
            const typeDef = getTypeDef(obj.typeId);
            const title = (obj.properties.title ?? obj.properties.name ?? 'Untitled') as string;
            const icon = typeDef?.icon ?? '📄';
            const typeName = typeDef?.name ?? obj.typeId;

            return (
              <button
                key={obj.id}
                className="saved-view-content__item"
                onClick={() => navigateToObject(obj.id)}
              >
                <span className="saved-view-content__item-icon">{icon}</span>
                <span className="saved-view-content__item-title">{title}</span>
                <span className="saved-view-content__item-type">{typeName}</span>
                <span className="saved-view-content__item-date">
                  {formatRelativeDate(obj.updatedAt)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
