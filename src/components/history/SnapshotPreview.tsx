/**
 * SnapshotPreview - Shows list of objects at a historical point in time
 */

import { useMemo, useCallback } from 'react';
import { useTypeRegistry } from '@/contexts';
import type { SkelenoteObject } from '@/lib/types';
import type { SnapshotPreviewProps } from './types';
import './SnapshotPreview.css';

/**
 * Get a display title for an object
 */
function getObjectTitle(obj: SkelenoteObject): string {
  // Try common title properties
  const titleProps = ['title', 'name', 'url'];
  for (const prop of titleProps) {
    const value = obj.properties[prop];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return 'Untitled';
}

export function SnapshotPreview({
  timestamp,
  objects,
  onObjectSelect,
  onRestore,
  onCompareWithCurrent,
}: SnapshotPreviewProps) {
  const typeRegistry = useTypeRegistry();

  // Sort objects by updatedAt descending (most recently modified first)
  const sortedObjects = useMemo(() => {
    return [...objects].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [objects]);

  // Group objects by type for stats
  const objectsByType = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const obj of objects) {
      const count = grouped.get(obj.typeId) ?? 0;
      grouped.set(obj.typeId, count + 1);
    }
    return grouped;
  }, [objects]);

  const handleItemClick = useCallback(
    (objectId: string) => {
      onObjectSelect(objectId);
    },
    [onObjectSelect]
  );

  const handleCompare = useCallback(
    (e: React.MouseEvent, objectId: string) => {
      e.stopPropagation();
      onCompareWithCurrent(objectId);
    },
    [onCompareWithCurrent]
  );

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

  return (
    <div className="snapshot-preview">
      <header className="snapshot-preview__header">
        <div>
          <h2 className="snapshot-preview__title">Snapshot</h2>
          <p className="snapshot-preview__timestamp">{formattedTimestamp}</p>
        </div>
        <button
          className="snapshot-preview__restore-btn"
          onClick={onRestore}
          title="Restore all objects to this point in time"
        >
          Restore State
        </button>
      </header>

      <div className="snapshot-preview__list">
        {sortedObjects.length === 0 ? (
          <div className="snapshot-preview__empty">
            No objects found at this point in time
          </div>
        ) : (
          sortedObjects.map((obj) => {
            const typeDef = typeRegistry.get(obj.typeId);
            const icon = typeDef?.icon ?? '📄';
            const typeName = typeDef?.name ?? obj.typeId;
            const title = getObjectTitle(obj);

            return (
              <button
                key={obj.id}
                className="snapshot-preview__item"
                onClick={() => handleItemClick(obj.id)}
              >
                <span className="snapshot-preview__item-icon">{icon}</span>
                <div className="snapshot-preview__item-content">
                  <div className="snapshot-preview__item-title">{title}</div>
                  <div className="snapshot-preview__item-type">{typeName}</div>
                </div>
                <div className="snapshot-preview__item-actions">
                  <button
                    className="snapshot-preview__action-btn"
                    onClick={(e) => handleCompare(e, obj.id)}
                    title="Compare with current version"
                  >
                    Compare
                  </button>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="snapshot-preview__stats">
        <span>{objects.length} objects</span>
        <span>
          {Array.from(objectsByType.entries())
            .map(([typeId, count]) => {
              const typeDef = typeRegistry.get(typeId);
              return `${count} ${typeDef?.name ?? typeId}${count !== 1 ? 's' : ''}`;
            })
            .join(', ')}
        </span>
      </div>
    </div>
  );
}
