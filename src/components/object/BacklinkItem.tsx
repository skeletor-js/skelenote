/**
 * BacklinkItem - Displays a single backlink to an object
 * Inline format: "ObjectName (via property)"
 */

import { UnstyledButton, Text } from '@mantine/core';
import { useObjects, useNavigation, useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import styles from './BacklinksSection.module.css';

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
    <UnstyledButton
      onClick={handleClick}
      className={styles.backlinkRow}
    >
      <Icon name={getIconFromEmoji(icon)} size={16} className={styles.backlinkIcon} />
      <span className={styles.backlinkContent}>
        <Text component="span" className={styles.backlinkName} truncate>
          {name}
        </Text>
        <Text component="span" className={styles.backlinkVia}>
          (via {propertyName})
        </Text>
      </span>
    </UnstyledButton>
  );
}
