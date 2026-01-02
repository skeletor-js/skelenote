/**
 * RelationChip - Displays a single object relation as a clickable chip
 */

import { Badge, CloseButton } from '@mantine/core';
import { useObjects, useTypeRegistry, useNavigation } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';

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
    <Badge
      variant="light"
      color="gray"
      size="lg"
      radius="sm"
      data-type-id={object.typeId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      leftSection={<Icon name={getIconFromEmoji(icon)} size={14} />}
      rightSection={
        showRemove && onRemove ? (
          <CloseButton
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove relation"
          />
        ) : undefined
      }
    >
      {name}
    </Badge>
  );
}
