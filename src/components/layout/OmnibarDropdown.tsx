/**
 * OmnibarDropdown - Dropdown panel showing search results and actions
 */

import { UnstyledButton, Group, Text, Badge, Stack, Box, ScrollArea } from '@mantine/core';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { PaletteAction } from '@/lib/palette/actions';
import classes from './Omnibar.module.css';

interface OmnibarDropdownProps {
  results: PaletteAction[];
  selectedIndex: number;
  isSearching: boolean;
  onSelect: (index: number) => void;
  onMouseEnter: (index: number) => void;
}

/**
 * Dropdown panel for the omnibar showing filtered actions and search results.
 */
export function OmnibarDropdown({
  results,
  selectedIndex,
  isSearching,
  onSelect,
  onMouseEnter,
}: OmnibarDropdownProps) {
  // Group results by category for better organization
  const actionResults = results.filter((r) => r.category !== 'object');
  const objectResults = results.filter((r) => r.category === 'object');

  // Render icon - either as Lucide icon name or emoji fallback
  const renderIcon = (icon: string) => {
    if (/^[a-z-]+$/.test(icon)) {
      return <Icon name={icon as IconName} size={14} />;
    }
    return <span style={{ fontSize: 12 }}>{icon}</span>;
  };

  const renderItem = (action: PaletteAction, index: number) => {
    const isSelected = index === selectedIndex;
    const isSemanticMatch = action.matchType === 'semantic' || action.matchType === 'hybrid';
    const semanticPercent = action.semanticScore
      ? Math.round(action.semanticScore * 100)
      : null;

    return (
      <UnstyledButton
        key={action.id}
        onClick={() => onSelect(index)}
        onMouseEnter={() => onMouseEnter(index)}
        role="option"
        aria-selected={isSelected}
        className={classes.resultItem}
        data-selected={isSelected || undefined}
      >
        <Group gap="sm" wrap="nowrap">
          <Text c="dimmed" style={{ flexShrink: 0 }}>
            {renderIcon(action.icon)}
          </Text>
          <Text size="sm" style={{ flex: 1, minWidth: 0 }} truncate>
            {action.label}
          </Text>
          {isSemanticMatch && (
            <Badge
              size="xs"
              variant="light"
              color="clay"
              title={semanticPercent ? `${semanticPercent}% similar` : 'Semantic match'}
            >
              ~{semanticPercent ? `${semanticPercent}%` : ''}
            </Badge>
          )}
          <Text size="xs" c="dimmed" tt="capitalize" style={{ flexShrink: 0 }}>
            {action.category}
          </Text>
        </Group>
      </UnstyledButton>
    );
  };

  if (results.length === 0) {
    return (
      <Box py="md" px="sm">
        <Text c="dimmed" ta="center" size="sm">
          {isSearching ? 'Searching...' : 'No results found'}
        </Text>
      </Box>
    );
  }

  // Calculate indices for each section
  let currentIndex = 0;

  return (
    <ScrollArea.Autosize mah={400} className={classes.dropdown}>
      <Stack gap={0} p="xs">
        {/* Actions section */}
        {actionResults.length > 0 && (
          <>
            <Text className={classes.categoryHeader}>Actions</Text>
            {actionResults.map((action) => {
              const item = renderItem(action, currentIndex);
              currentIndex++;
              return item;
            })}
          </>
        )}

        {/* Objects section */}
        {objectResults.length > 0 && (
          <>
            <Text className={classes.categoryHeader}>Objects</Text>
            {objectResults.map((action) => {
              const item = renderItem(action, currentIndex);
              currentIndex++;
              return item;
            })}
          </>
        )}
      </Stack>
    </ScrollArea.Autosize>
  );
}
