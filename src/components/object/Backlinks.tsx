/**
 * Backlinks - Shows objects that reference the current object
 * Smart default: expanded if ≤3 backlinks, collapsed if >3
 */

import { useState, useMemo, useEffect } from 'react';
import { Collapse, Stack, Group, Text, Box } from '@mantine/core';
import { useObjects, useTypeRegistry } from '@/contexts';
import { createRelationHelper } from '@/lib/loro';
import { Icon } from '@/components/ui';
import { BacklinkItem } from './BacklinkItem';
import styles from './BacklinksSection.module.css';

interface BacklinksProps {
  objectId: string;
}

/** Threshold for smart default expansion */
const SMART_EXPAND_THRESHOLD = 3;

export function Backlinks({ objectId }: BacklinksProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const [isExpanded, setIsExpanded] = useState<boolean | null>(null);

  // Find all backlinks to this object
  const backlinks = useMemo(() => {
    if (!store) return [];

    const relationHelper = createRelationHelper(store, typeRegistry);
    return relationHelper.findBacklinks(objectId);
  }, [store, typeRegistry, objectId]);

  // Group backlinks by source object to avoid duplicates in display
  // Also filter out deleted source objects
  const groupedBacklinks = useMemo(() => {
    if (!store) return [];

    const grouped = new Map<string, { sourceId: string; propertyNames: string[] }>();

    for (const backlink of backlinks) {
      // Skip if source object was deleted
      const sourceObj = store.get(backlink.sourceId);
      if (!sourceObj) continue;

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
  }, [store, backlinks]);

  const backlinkCount = groupedBacklinks.length;

  // Smart default expansion: expanded if 1-3 backlinks, collapsed if more
  useEffect(() => {
    if (isExpanded === null) {
      setIsExpanded(backlinkCount > 0 && backlinkCount <= SMART_EXPAND_THRESHOLD);
    }
  }, [backlinkCount, isExpanded]);

  // Use false as fallback until smart default is calculated
  const expanded = isExpanded ?? false;

  return (
    <Box component="section">
      <Group
        gap="xs"
        py="xs"
        className={styles.sectionHeader}
        onClick={() => setIsExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!expanded);
          }
        }}
      >
        <Icon
          name="chevron-right"
          size={14}
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
        <Text size="sm" c="dimmed" fw={500}>
          Backlinks{backlinkCount > 0 && ` (${backlinkCount})`}
        </Text>
      </Group>

      <Collapse in={expanded}>
        <Stack gap={2} className={styles.backlinksList}>
          {groupedBacklinks.length === 0 ? (
            <Text className={styles.emptyState}>No objects link to this one</Text>
          ) : (
            groupedBacklinks.map(({ sourceId, propertyNames }) => (
              <BacklinkItem
                key={sourceId}
                sourceId={sourceId}
                propertyName={propertyNames.join(', ')}
              />
            ))
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
