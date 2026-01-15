/**
 * Mobile search result row component
 */

import { useMemo, useCallback } from 'react';
import { Text, Group, Stack, UnstyledButton } from '@mantine/core';
import { ChevronRight } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { useTypeRegistry } from '@/contexts';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import type { SkelenoteObject } from '@/lib/types';

interface SearchResult {
  item: SkelenoteObject;
  score: number;
  matches?: string[];
}

interface MobileSearchResultRowProps {
  result: SearchResult;
  query: string;
  onPress: () => void;
}

/**
 * Safely highlights search query matches in text using React elements.
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return isMatch ? (
          <Text key={index} span fw={600} c="ember">
            {part}
          </Text>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

export function MobileSearchResultRow({
  result,
  query,
  onPress,
}: MobileSearchResultRowProps) {
  const typeRegistry = useTypeRegistry();

  const typeDef = useMemo(() => {
    return typeRegistry.get(result.item.typeId);
  }, [typeRegistry, result.item.typeId]);

  const getTypeIcon = useCallback((): IconName => {
    if (!typeDef?.icon) return 'file';
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  }, [typeDef]);

  const title = (result.item.properties.title ??
    result.item.properties.name ??
    'Untitled') as string;

  const matchedContent = result.matches?.[0];

  return (
    <UnstyledButton
      onClick={onPress}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        width: '100%',
      }}
    >
      {/* Type icon */}
      <Icon
        name={getTypeIcon()}
        size={20}
        style={{
          color: 'var(--mantine-color-gray-5)',
          marginTop: 2,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={500} truncate>
          <HighlightedText text={title} query={query} />
        </Text>
        {matchedContent && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            <HighlightedText text={matchedContent} query={query} />
          </Text>
        )}
        <Group gap="xs">
          {/* Type name */}
          <Text size="xs" c="dimmed">
            {typeDef?.name}
          </Text>
        </Group>
      </Stack>

      <ChevronRight
        size={16}
        style={{ color: 'var(--mantine-color-gray-4)' }}
      />
    </UnstyledButton>
  );
}
