/**
 * Backlinks - Shows objects that reference the current object
 */

import { useState, useMemo } from 'react';
import { useObjects, useTypeRegistry } from '@/contexts';
import { createRelationHelper } from '@/lib/loro';
import { BacklinkItem } from './BacklinkItem';
import './Backlinks.css';

interface BacklinksProps {
  objectId: string;
}

export function Backlinks({ objectId }: BacklinksProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const [isExpanded, setIsExpanded] = useState(false);

  // Find all backlinks to this object
  const backlinks = useMemo(() => {
    if (!store) return [];

    const relationHelper = createRelationHelper(store, typeRegistry);
    return relationHelper.findBacklinks(objectId);
  }, [store, typeRegistry, objectId]);

  // Group backlinks by source object to avoid duplicates in display
  const groupedBacklinks = useMemo(() => {
    const grouped = new Map<string, { sourceId: string; propertyNames: string[] }>();

    for (const backlink of backlinks) {
      const existing = grouped.get(backlink.sourceId);
      if (existing) {
        if (!existing.propertyNames.includes(backlink.propertyName)) {
          existing.propertyNames.push(backlink.propertyName);
        }
      } else {
        grouped.set(backlink.sourceId, {
          sourceId: backlink.sourceId,
          propertyNames: [backlink.propertyName],
        });
      }
    }

    return Array.from(grouped.values());
  }, [backlinks]);

  const backlinkCount = groupedBacklinks.length;

  return (
    <section className="backlinks">
      <button
        type="button"
        className="backlinks__header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="backlinks__collapse-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
        <h2 className="backlinks__title">
          Backlinks{backlinkCount > 0 && ` (${backlinkCount})`}
        </h2>
      </button>

      {isExpanded && (
        <div className="backlinks__list">
          {groupedBacklinks.length === 0 ? (
            <p className="backlinks__empty">No objects link to this one</p>
          ) : (
            groupedBacklinks.map(({ sourceId, propertyNames }) => (
              <BacklinkItem
                key={sourceId}
                sourceId={sourceId}
                propertyName={propertyNames.join(', ')}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
