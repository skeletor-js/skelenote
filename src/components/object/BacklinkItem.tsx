/**
 * BacklinkItem - Displays a single backlink to an object
 */

import { useObjects, useNavigation, useTypeRegistry } from '@/contexts';

interface BacklinkItemProps {
  sourceId: string;
  propertyName: string;
}

export function BacklinkItem({ sourceId, propertyName }: BacklinkItemProps) {
  const { store } = useObjects();
  const { navigateToObject, openInSplit } = useNavigation();
  const typeRegistry = useTypeRegistry();

  const sourceObject = store?.get(sourceId);
  if (!sourceObject) return null;

  const typeDef = typeRegistry.get(sourceObject.typeId);
  const icon = typeDef?.icon ?? '📄';
  const name = (sourceObject.properties.title ??
    sourceObject.properties.name ??
    'Untitled') as string;

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      openInSplit(sourceId);
    } else {
      navigateToObject(sourceId);
    }
  };

  return (
    <button
      type="button"
      className="backlink-item"
      onClick={handleClick}
    >
      <span className="backlink-item__icon">{icon}</span>
      <span className="backlink-item__name">{name}</span>
      <span className="backlink-item__via">via {propertyName}</span>
    </button>
  );
}
