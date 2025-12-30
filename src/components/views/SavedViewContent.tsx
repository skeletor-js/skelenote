/**
 * SavedViewContent - Displays filtered objects based on a saved view configuration
 */

import { useMemo, useCallback } from 'react';
import './SavedViewContent.css';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { useSavedViews } from '@/hooks';
import { executeQuery, type FilterCondition } from '@/lib/loro';
import { formatRelativeDate } from '@/lib/utils/date';
import { EmptyState } from '@/components/ui';
import {
  BUILT_IN_FIELDS,
  OPERATOR_LABELS,
  formatDateValue,
  formatBooleanValue,
} from '@/lib/views';

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
  const getTypeDef = useCallback((typeId: string) => {
    return typeRegistry.get(typeId);
  }, [typeRegistry]);

  // Format a filter for display
  const formatFilter = useCallback((filter: FilterCondition, typeFilter?: string) => {
    // Get field name - first check built-in fields
    const builtInField = BUILT_IN_FIELDS.find((f) => f.id === filter.field);
    let fieldName = builtInField?.name || filter.field;
    let fieldType = builtInField?.type;

    // Try to get field info from type schema
    if (typeFilter) {
      const typeDef = getTypeDef(typeFilter);
      if (typeDef) {
        const fieldDef = typeDef.schema.find((f) => f.id === filter.field);
        if (fieldDef) {
          fieldName = fieldDef.name;
          fieldType = fieldDef.type;
        }
      }
    }

    // Get operator label
    const operatorLabel = OPERATOR_LABELS[filter.operator] || filter.operator;

    // Format value based on field type or field name
    let formattedValue = '';

    // Skip value for isNull/isNotNull operators
    if (filter.operator !== 'isNull' && filter.operator !== 'isNotNull') {
      const isDateField = fieldType === 'date' ||
        filter.field === 'createdAt' ||
        filter.field === 'updatedAt' ||
        filter.field === 'dueDate' ||
        filter.field === 'startTime' ||
        filter.field === 'endTime';

      const isBooleanField = fieldType === 'checkbox' ||
        fieldType === 'boolean' ||
        filter.field === 'inboxed' ||
        filter.field === 'isDailyNote';

      if (isDateField) {
        formattedValue = formatDateValue(filter.value);
      } else if (isBooleanField) {
        formattedValue = formatBooleanValue(filter.value);
      } else {
        formattedValue = String(filter.value ?? '');
      }
    }

    return { fieldName, operatorLabel, formattedValue };
  }, [getTypeDef]);

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
          {view.filters.map((filter, index) => {
            const { fieldName, operatorLabel, formattedValue } = formatFilter(filter, view.typeFilter ?? undefined);
            return (
              <span key={index} className="saved-view-content__filter-tag">
                {fieldName} {operatorLabel}{formattedValue ? ` ${formattedValue}` : ''}
              </span>
            );
          })}
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
