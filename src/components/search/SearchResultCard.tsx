/**
 * SearchResultCard - Compact search result row with hover-reveal actions
 * Linear/Notion-style minimal design with full action support
 */

import { useMemo, useState, useCallback } from 'react';
import { UnstyledButton, Group, Text, Stack, ActionIcon, Tooltip, Checkbox, Box } from '@mantine/core';
import { useTypeRegistry, useObjects, useToast } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import { getBestSnippet, type SearchResult, type TextSegment } from '@/lib/search';
import { MatchTypeBadge } from './MatchTypeBadge';
import { ContextMenu, Tag, type ContextMenuItem, type TagColor } from '@/components/ui';
import { useContextMenu, usePinnedObjects } from '@/hooks';
import { ObjectSearchModal } from '@/components/object/editors';
import classes from './SearchResultCard.module.css';

interface SearchResultCardProps {
  /** The search result to display */
  result: SearchResult;
  /** Whether this item is currently selected (bulk selection) */
  isSelected: boolean;
  /** Whether this item is highlighted via keyboard navigation */
  isKeyboardSelected?: boolean;
  /** Called when the item is clicked */
  onClick: () => void;
  /** Called when "Open in Split" action is triggered */
  onOpenInSplit: () => void;
  /** Called when mouse enters the item */
  onMouseEnter?: () => void;
  /** Formatted date string (e.g., "Updated 2h ago") */
  dateLabel?: string;
  /** Called when item is archived */
  onArchive?: (itemId: string) => void;
  /** Callback when selection checkbox is toggled */
  onSelectionChange?: (id: string, shiftKey: boolean) => void;
  /** Whether any item in the list is selected (enables "selecting mode") */
  isSelectingMode?: boolean;
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

export function SearchResultCard({
  result,
  isSelected,
  isKeyboardSelected = false,
  onClick,
  onOpenInSplit,
  onMouseEnter,
  dateLabel,
  onArchive,
  onSelectionChange,
  isSelectingMode = false,
}: SearchResultCardProps) {
  const typeRegistry = useTypeRegistry();
  const { store } = useObjects();
  const { addToast } = useToast();
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();
  const { isPinned, pin, unpin } = usePinnedObjects();
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);

  // Get type definition for icon and name
  const typeDef = typeRegistry.get(result.item.typeId);
  const icon = typeDef?.icon ?? '📄';
  const typeName = typeDef?.name ?? result.item.typeId;
  const title = result.item.title || 'Untitled';

  // Get the actual object from store for properties access
  const object = store?.get(result.item.id);

  // Get first tag for preview
  const tagIds = object?.properties?.tags as string[] | null;
  const firstTag = tagIds?.[0] ? store?.get(tagIds[0]) : null;
  const tagInfo = firstTag
    ? {
        name: firstTag.properties.name as string,
        color: firstTag.properties.color as TagColor | undefined,
      }
    : null;

  // Get snippet from matches (only for text/hybrid matches)
  const snippet = useMemo(() => {
    if (result.matches.length === 0) return null;
    return getBestSnippet(result.matches, 100);
  }, [result.matches]);

  // Determine match type (default to 'text' if not specified)
  const matchType = result.matchType ?? 'text';

  // Check pin status
  const itemIsPinned = isPinned(result.item.id);

  // Handle action button clicks without triggering card click
  const handleOpenInSplit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenInSplit();
    },
    [onOpenInSplit]
  );

  // Handle pin/unpin
  const handleTogglePin = useCallback(() => {
    if (itemIsPinned) {
      unpin(result.item.id);
      addToast({ type: 'success', message: 'Removed from pins' });
    } else {
      pin(result.item.id);
      addToast({ type: 'success', message: 'Pinned to sidebar' });
    }
  }, [itemIsPinned, pin, unpin, result.item.id, addToast]);

  // Handle add tag
  const handleAddTag = useCallback(
    (tagId: string) => {
      if (!object) return;
      const currentTags = (object.properties?.tags as string[]) ?? [];
      if (!currentTags.includes(tagId)) {
        store?.update(result.item.id, {
          properties: { ...object.properties, tags: [...currentTags, tagId] },
        });
        addToast({ type: 'success', message: 'Tag added' });
      }
      setTagPickerOpen(false);
    },
    [result.item.id, object, store, addToast]
  );

  // Handle assign project
  const handleAssignProject = useCallback(
    (projectId: string) => {
      if (!object) return;
      store?.update(result.item.id, {
        properties: { ...object.properties, project: projectId },
      });
      addToast({ type: 'success', message: 'Project assigned' });
      setProjectPickerOpen(false);
    },
    [result.item.id, object, store, addToast]
  );

  // Handle area click (with event stop propagation)
  const handleAreaClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAreaPickerOpen(true);
  }, []);

  // Handle assign area
  const handleAssignArea = useCallback(
    (areaId: string) => {
      if (!object) return;
      store?.update(result.item.id, {
        properties: { ...object.properties, area: areaId },
      });
      addToast({ type: 'success', message: 'Area assigned' });
      setAreaPickerOpen(false);
    },
    [result.item.id, object, store, addToast]
  );

  // Handle selection checkbox change
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectionChange?.(result.item.id, e.shiftKey);
    },
    [onSelectionChange, result.item.id]
  );

  // Handle row click - shift+click toggles selection, regular click navigates
  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey && onSelectionChange) {
        e.preventDefault();
        onSelectionChange(result.item.id, true);
      } else {
        onClick();
      }
    },
    [onClick, onSelectionChange, result.item.id]
  );

  // Action click handlers with stopPropagation
  const handleAddTagClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTagPickerOpen(true);
  }, []);

  const handleProjectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectPickerOpen(true);
  }, []);

  const handlePinClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleTogglePin();
    },
    [handleTogglePin]
  );

  // Handle archive
  const handleArchive = useCallback(() => {
    if (!onArchive) return;
    onArchive(result.item.id);
    addToast({
      type: 'success',
      message: `"${title}" archived`,
    });
  }, [onArchive, result.item.id, title, addToast]);

  const handleArchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleArchive();
    },
    [handleArchive]
  );

  // Handle select from context menu
  const handleSelect = useCallback(() => {
    onSelectionChange?.(result.item.id, false);
  }, [onSelectionChange, result.item.id]);

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    ...(onSelectionChange
      ? [
          {
            id: 'select',
            label: isSelected ? 'Deselect' : 'Select',
            icon: 'check-square',
            onClick: handleSelect,
          } as ContextMenuItem,
        ]
      : []),
    {
      id: 'pin',
      label: itemIsPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar',
      icon: 'pin',
      onClick: handleTogglePin,
    },
    ...(onArchive
      ? [
          {
            id: 'archive',
            label: 'Archive',
            icon: 'archive',
            onClick: handleArchive,
          } as ContextMenuItem,
        ]
      : []),
  ];

  // Determine if row should show selected state (either bulk selection or keyboard)
  const showSelectedState = isSelected || isKeyboardSelected;

  return (
    <>
      <UnstyledButton
        onClick={handleRowClick}
        onMouseEnter={onMouseEnter}
        onContextMenu={openContextMenu}
        px="sm"
        py="xs"
        role="option"
        data-selected={showSelectedState || undefined}
        tabIndex={isKeyboardSelected ? 0 : -1}
        className={classes.resultRow}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mantine-spacing-sm)',
          borderRadius: 'var(--mantine-radius-sm)',
          borderBottom: '1px solid var(--border-subtle)',
          width: '100%',
        }}
      >
        {/* Selection checkbox - only show when in selection mode */}
        {onSelectionChange && isSelectingMode && (
          <Box
            onClick={handleCheckboxClick}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Checkbox
              checked={isSelected}
              onChange={() => {}}
              size="xs"
              color="slate"
              aria-label={`Select ${title}`}
              styles={{ input: { cursor: 'pointer' } }}
            />
          </Box>
        )}

        {/* Icon */}
        <Icon name={getIconFromEmoji(icon)} size={16} style={{ color: 'var(--mantine-color-gray-6)', flexShrink: 0 }} />

        {/* Main content */}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <Text size="sm" fw={500} truncate>
            {title}
          </Text>

          {/* Snippet + metadata inline */}
          <Group gap="xs" wrap="nowrap">
            {snippet && (
              <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
                <HighlightedText segments={snippet.segments} />
              </Text>
            )}
            <Text size="xs" c="dimmed" className={classes.typeName} style={{ flexShrink: 0 }}>
              {typeName}
            </Text>
            {dateLabel && (
              <Text size="xs" c="dimmed" className={classes.typeName} style={{ flexShrink: 0 }}>
                · {dateLabel}
              </Text>
            )}
          </Group>
        </Stack>

        {/* Tag preview */}
        {tagInfo && <Tag name={tagInfo.name} color={tagInfo.color} size="sm" />}

        {/* Badge + hover-reveal actions */}
        <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
          <MatchTypeBadge
            matchType={matchType}
            semanticScore={result.semanticScore}
          />
          <Group gap={4} className={classes.actions} wrap="nowrap">
            <Tooltip label="Open in split pane" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleOpenInSplit}
                aria-label="Open in split pane"
              >
                <Icon name="columns-2" size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Add tag" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleAddTagClick}
                aria-label="Add tag"
              >
                <Icon name="tag" size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Assign project" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleProjectClick}
                aria-label="Assign project"
              >
                <Icon name="folder" size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Assign area" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleAreaClick}
                aria-label="Assign area"
              >
                <Icon name="layers" size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={itemIsPinned ? 'Unpin' : 'Pin to sidebar'} position="top" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handlePinClick}
                aria-label={itemIsPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
              >
                <Icon name="pin" size={14} />
              </ActionIcon>
            </Tooltip>
            {onArchive && (
              <Tooltip label="Archive" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handleArchiveClick}
                  aria-label="Archive"
                >
                  <Icon name="archive" size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </UnstyledButton>

      {/* Context Menu */}
      <ContextMenu
        items={contextMenuItems}
        position={position}
        isOpen={isOpen}
        onClose={closeContextMenu}
      />

      {/* Tag Picker Modal */}
      <ObjectSearchModal
        isOpen={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        onSelect={handleAddTag}
        targetTypeIds={['tag']}
        title="Add Tag"
      />

      {/* Project Picker Modal */}
      <ObjectSearchModal
        isOpen={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
        onSelect={handleAssignProject}
        targetTypeIds={['project']}
        title="Assign to Project"
      />

      {/* Area Picker Modal */}
      <ObjectSearchModal
        isOpen={areaPickerOpen}
        onClose={() => setAreaPickerOpen(false)}
        onSelect={handleAssignArea}
        targetTypeIds={['area']}
        title="Assign to Area"
      />
    </>
  );
}
