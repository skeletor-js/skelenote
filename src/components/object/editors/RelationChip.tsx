/**
 * RelationChip - Displays a single object relation as a clickable chip
 */

import { useObjects, useTypeRegistry, useNavigation } from '@/contexts';
import './RelationPicker.css';

interface RelationChipProps {
  objectId: string;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function RelationChip({ objectId, onRemove, showRemove = true }: RelationChipProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { navigateToObject, openInSplit } = useNavigation();

  if (!store) return null;

  const object = store.get(objectId);
  // Don't render if object was deleted
  if (!object) {
    return null;
  }

  const typeDef = typeRegistry.get(object.typeId);
  const icon = typeDef?.icon ?? '📄';
  const name = (object.properties.title ?? object.properties.name ?? 'Untitled') as string;

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      openInSplit(objectId);
    } else {
      navigateToObject(objectId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        openInSplit(objectId);
      } else {
        navigateToObject(objectId);
      }
    }
  };

  return (
    <span
      className="relation-chip"
      data-type-id={object.typeId}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <span className="relation-chip__icon">{icon}</span>
      <span className="relation-chip__name">{name}</span>
      {showRemove && onRemove && (
        <button
          type="button"
          className="relation-chip__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove relation"
        >
          x
        </button>
      )}
    </span>
  );
}
