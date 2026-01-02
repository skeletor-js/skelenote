/**
 * MentionSuggestion - Suggestion menu for @-mentions in BlockNote editor
 * Queries objects from ObjectStore and allows selection
 */

import { useMemo } from 'react';
import { useObjects, useTypeRegistry } from '@/contexts';
import type { SkelenoteObject } from '@/lib/types';
import type { IconName } from '@/lib/icons';
import { Icon } from '@/components/ui/Icon';
import './MentionSuggestion.css';

export interface MentionItem {
  title: string;
  objectId: string;
  objectName: string;
  objectTypeId: string;
  icon: IconName;
}

/**
 * Hook to get mention suggestions based on query
 */
export function useMentionSuggestions(query: string): MentionItem[] {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();

  return useMemo(() => {
    if (!store) return [];

    const allObjects = store.getAll();
    const lowerQuery = query.toLowerCase();

    // Filter and map objects to mention items
    const items: MentionItem[] = allObjects
      .filter((obj: SkelenoteObject) => {
        // Get display name from title or name property
        const name = (obj.properties.title ?? obj.properties.name ?? '') as string;
        return name.toLowerCase().includes(lowerQuery);
      })
      .slice(0, 10) // Limit results
      .map((obj: SkelenoteObject) => {
        const name = (obj.properties.title ?? obj.properties.name ?? 'Untitled') as string;
        const typeDef = typeRegistry.get(obj.typeId);
        const icon = (typeDef?.icon ?? 'file') as IconName;

        return {
          title: name,
          objectId: obj.id,
          objectName: name,
          objectTypeId: obj.typeId,
          icon,
        };
      });

    return items;
  }, [store, typeRegistry, query]);
}

/**
 * Get mention items for the suggestion menu
 * @param excludeObjectId - Object ID to exclude (prevents self-mentions)
 */
export function getMentionMenuItems(
  store: ReturnType<typeof useObjects>['store'],
  typeRegistry: ReturnType<typeof useTypeRegistry>,
  query: string,
  excludeObjectId?: string
): MentionItem[] {
  if (!store) return [];

  const allObjects = store.getAll();
  const lowerQuery = query.toLowerCase();

  return allObjects
    .filter((obj: SkelenoteObject) => {
      // Exclude the current object to prevent self-mentions
      if (excludeObjectId && obj.id === excludeObjectId) return false;
      const name = (obj.properties.title ?? obj.properties.name ?? '') as string;
      return name.toLowerCase().includes(lowerQuery);
    })
    .slice(0, 10)
    .map((obj: SkelenoteObject) => {
      const name = (obj.properties.title ?? obj.properties.name ?? 'Untitled') as string;
      const typeDef = typeRegistry.get(obj.typeId);
      const icon = (typeDef?.icon ?? 'file') as IconName;

      return {
        title: name,
        objectId: obj.id,
        objectName: name,
        objectTypeId: obj.typeId,
        icon,
      };
    });
}

/**
 * Props for the MentionSuggestionMenu component
 * Matches SuggestionMenuProps from BlockNote
 */
interface MentionSuggestionMenuProps {
  items: MentionItem[];
  loadingState: 'loading-initial' | 'loading' | 'loaded';
  selectedIndex: number | undefined;
  onItemClick?: (item: MentionItem) => void;
}

/**
 * MentionSuggestionMenu - Custom suggestion menu for @-mentions
 */
export function MentionSuggestionMenu({
  items,
  loadingState,
  selectedIndex,
  onItemClick,
}: MentionSuggestionMenuProps) {
  if (loadingState === 'loading-initial') {
    return (
      <div className="mention-suggestion-menu">
        <div className="mention-suggestion-empty">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mention-suggestion-menu">
        <div className="mention-suggestion-empty">No objects found</div>
      </div>
    );
  }

  return (
    <div className="mention-suggestion-menu">
      {items.map((item, index) => (
        <div
          key={item.objectId}
          className={`mention-suggestion-item ${index === selectedIndex ? 'mention-suggestion-item--selected' : ''}`}
          onClick={() => onItemClick?.(item)}
        >
          <Icon name={item.icon} size={14} className="mention-suggestion-item__icon" />
          <span className="mention-suggestion-item__title">{item.title}</span>
        </div>
      ))}
    </div>
  );
}
