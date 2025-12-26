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
  const { navigateToObject } = useNavigation();

  if (!store) return null;

  const object = store.get(objectId);
  if (!object) {
    return (
      <span className="relation-chip relation-chip--missing">
        Missing object
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

  const typeDef = typeRegistry.get(object.typeId);
  const icon = typeDef?.icon ?? '📄';
  const name = (object.properties.title ?? object.properties.name ?? 'Untitled') as string;

  return (
    <span
      className="relation-chip"
      data-type-id={object.typeId}
      onClick={() => navigateToObject(objectId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToObject(objectId);
        }
      }}
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
