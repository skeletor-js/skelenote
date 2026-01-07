/**
 * SearchResultItem - Displays a single search result with highlighted snippet
 */

import { useMemo } from 'react';
import { UnstyledButton, Group, Text, Badge, Box } from '@mantine/core';
import { useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import {
  getBestSnippet,
  type SearchResult,
  type TextSegment,
} from '@/lib/search';

interface SearchResultItemProps {
  /** The search result to display */
  result: SearchResult;
  /** Whether this item is currently selected */
  isSelected: boolean;
  /** Called when the item is clicked */
  onClick: () => void;
  /** Called when mouse enters the item */
  onMouseEnter: () => void;
}

/**
 * Render text segments with highlighting
 */
function HighlightedText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <Text
            key={index}
            component="mark"
            span
            bg="yellow.2"
            c="dark"
            style={{ borderRadius: 2 }}
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={index} span>
            {segment.text}
          </Text>
        )
      )}
    </>
  );
}

export function SearchResultItem({
  result,
  isSelected,
  onClick,
  onMouseEnter,
}: SearchResultItemProps) {
  const typeRegistry = useTypeRegistry();

  // Get type definition for icon
  const typeDef = typeRegistry.get(result.item.typeId);
  const icon = typeDef?.icon ?? '📄';
  const typeName = typeDef?.name ?? result.item.typeId;

  // Get snippet from matches (only for text/hybrid matches)
  const snippet = useMemo(() => {
    if (result.matches.length === 0) return null;
    return getBestSnippet(result.matches, 100);
  }, [result.matches]);

  // Check if this is a semantic match
  const isSemanticMatch =
    result.matchType === 'semantic' || result.matchType === 'hybrid';
  const semanticPercent = result.semanticScore
    ? Math.round(result.semanticScore * 100)
    : null;

  return (
    <UnstyledButton
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      p="sm"
      role="option"
      aria-selected={isSelected}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--mantine-spacing-sm)',
        borderRadius: 'var(--mantine-radius-sm)',
        width: '100%',
        backgroundColor: isSelected
          ? 'var(--mantine-color-slate-light)'
          : undefined,
      }}
    >
      <Icon name={getIconFromEmoji(icon)} size={20} />

      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} truncate>
            {result.item.title || 'Untitled'}
          </Text>
          {isSemanticMatch && (
            <Badge
              size="xs"
              variant="light"
              color="clay"
              title={
                semanticPercent
                  ? `${semanticPercent}% similar`
                  : 'Semantic match'
              }
            >
              ~{semanticPercent ? `${semanticPercent}%` : ''}
            </Badge>
          )}
        </Group>

        {snippet ? (
          <Text size="xs" c="dimmed" lineClamp={2}>
            <HighlightedText segments={snippet.segments} />
          </Text>
        ) : isSemanticMatch ? (
          <Text size="xs" c="dimmed" fs="italic">
            Conceptually similar
          </Text>
        ) : null}
      </Box>

      <Text size="xs" c="dimmed">
        {typeName}
      </Text>
    </UnstyledButton>
  );
}
