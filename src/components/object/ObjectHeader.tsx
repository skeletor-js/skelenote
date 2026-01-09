/**
 * ObjectHeader - Header component for object detail view
 * Shows editable title with hover-reveal quick actions and overflow menu
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Group,
  Text,
  TextInput,
  ActionIcon,
  Menu,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { MoreHorizontal } from 'lucide-react';
import { useNavigation, useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import type { SkelenoteObject, TypeDefinition } from '@/lib/types';
import { BuiltInTypeIds } from '@/lib/types';
import styles from './ObjectHeader.module.css';

// Types that can be changed to (excludes Template which is special)
const CHANGEABLE_TYPES = [
  BuiltInTypeIds.TASK,
  BuiltInTypeIds.NOTE,
  BuiltInTypeIds.PROJECT,
  BuiltInTypeIds.AREA,
  BuiltInTypeIds.MEETING,
  BuiltInTypeIds.LINK,
  BuiltInTypeIds.PERSON,
  BuiltInTypeIds.TAG,
];

interface ObjectHeaderProps {
  object: SkelenoteObject;
  typeDef: TypeDefinition;
  onTitleChange: (newTitle: string) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  /** Whether the title can be edited (default: true) */
  titleEditable?: boolean;
  /** Which pane this header is in */
  paneType?: 'primary' | 'secondary';
  /** Callback to close split view (secondary pane only) */
  onCloseSplit?: () => void;
  /** Callback to view object history in Time Machine */
  onViewHistory?: () => void;
  /** Callback to export object to Markdown */
  onExport?: () => void;
  /** Whether to show "Back to Time Machine" option */
  showBackToTimeMachine?: boolean;
  /** Callback for navigating back to Time Machine */
  onBackToTimeMachine?: () => void;
  /** Callback for pinning the object */
  onPin?: () => void;
  /** Whether the object is pinned */
  isPinned?: boolean;
  /** Callback for archiving the object */
  onArchive?: () => void;
  /** Whether archive action should be shown */
  canArchive?: boolean;
  /** Whether the object is archived (determines Archive vs Delete Permanently) */
  isArchived?: boolean;
  /** Callback for duplicating the object */
  onDuplicate?: () => void;
  /** Whether the object can be duplicated (false for daily notes) */
  canDuplicate?: boolean;
  /** Callback for changing the object type */
  onTypeChange?: (newTypeId: string) => void;
  /** Whether the type can be changed (false for daily notes, templates) */
  canChangeType?: boolean;
}

export function ObjectHeader({
  object,
  typeDef,
  onTitleChange,
  onDelete,
  canDelete = true,
  titleEditable = true,
  paneType = 'primary',
  onCloseSplit,
  onViewHistory,
  onExport,
  showBackToTimeMachine = false,
  onBackToTimeMachine,
  onPin,
  isPinned = false,
  onArchive,
  canArchive = true,
  isArchived = false,
  onDuplicate,
  canDuplicate = true,
  onTypeChange,
  canChangeType = true,
}: ObjectHeaderProps) {
  const { openInSplit, splitPane } = useNavigation();
  const typeRegistry = useTypeRegistry();
  // Determine which property holds the title (varies by type)
  const titlePropertyId =
    object.properties.title !== undefined ? 'title' : 'name';
  const currentTitle = String(object.properties[titlePropertyId] ?? 'Untitled');

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editValue when object changes
  useEffect(() => {
    setEditValue(currentTitle);
  }, [currentTitle]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setEditValue(currentTitle);
    setIsEditing(true);
  }, [currentTitle]);

  const saveEdit = useCallback(() => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== currentTitle) {
      onTitleChange(trimmedValue);
    }
    setIsEditing(false);
  }, [editValue, currentTitle, onTitleChange]);

  const cancelEdit = useCallback(() => {
    setEditValue(currentTitle);
    setIsEditing(false);
  }, [currentTitle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  const handleTitleClick = useCallback(() => {
    if (!isEditing) {
      startEditing();
    }
  }, [isEditing, startEditing]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startEditing();
      }
    },
    [startEditing]
  );

  // Determine if we should show the overflow menu
  const showOverflowMenu = paneType === 'primary';
  const showSplitOption = !splitPane.isOpen;
  const showHistoryOption =
    onViewHistory && splitPane.mode !== 'version-comparison';

  // Can this object's type be changed?
  const showTypeMenu = onTypeChange && canChangeType;

  return (
    <Group component="header" gap="sm" wrap="nowrap" className={styles.header}>
      {/* Type indicator - clickable to change type if allowed */}
      {showTypeMenu ? (
        <Menu position="bottom-start" withinPortal>
          <Menu.Target>
            <Tooltip
              label={`Type: ${typeDef.name} (click to change)`}
              withArrow
            >
              <UnstyledButton className={styles.typeButton}>
                <Icon
                  name={getIconFromEmoji(typeDef.icon)}
                  size={18}
                  className={styles.typeIcon}
                />
              </UnstyledButton>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Change type to</Menu.Label>
            {CHANGEABLE_TYPES.map((typeId) => {
              const targetType = typeRegistry.get(typeId);
              if (!targetType) return null;
              const isCurrentType = typeId === object.typeId;
              return (
                <Menu.Item
                  key={typeId}
                  leftSection={
                    <Icon name={getIconFromEmoji(targetType.icon)} size={14} />
                  }
                  onClick={() => !isCurrentType && onTypeChange(typeId)}
                  disabled={isCurrentType}
                  rightSection={
                    isCurrentType ? (
                      <Icon
                        name="check"
                        size={12}
                        color="var(--mantine-color-sage-6)"
                      />
                    ) : undefined
                  }
                >
                  {targetType.name}
                </Menu.Item>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      ) : (
        <Tooltip label={`Type: ${typeDef.name}`} withArrow>
          <Icon
            name={getIconFromEmoji(typeDef.icon)}
            size={18}
            className={styles.typeIcon}
          />
        </Tooltip>
      )}

      {/* Title (editable or static) */}
      {isEditing && titleEditable ? (
        <TextInput
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          aria-label="Edit title"
          variant="unstyled"
          className={styles.titleInput}
          styles={{
            input: {
              fontSize: 'var(--mantine-font-size-lg)',
              fontWeight: 600,
              padding: 0,
            },
          }}
        />
      ) : (
        <Text
          size="lg"
          fw={600}
          onClick={titleEditable ? handleTitleClick : undefined}
          onKeyDown={titleEditable ? handleTitleKeyDown : undefined}
          tabIndex={titleEditable ? 0 : undefined}
          role={titleEditable ? 'button' : undefined}
          aria-label={
            titleEditable ? `Edit title: ${currentTitle}` : currentTitle
          }
          className={styles.title}
          truncate
        >
          {currentTitle}
        </Text>
      )}

      {/* Hover-reveal quick actions for primary pane */}
      {paneType === 'primary' && (
        <Group gap={2} className={styles.quickActions}>
          {/* Pin action */}
          {onPin && (
            <Tooltip label={isPinned ? 'Unpin' : 'Pin'} withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onPin}
                aria-label={isPinned ? 'Unpin' : 'Pin'}
                className={styles.quickAction}
              >
                <Icon name={isPinned ? 'pin-off' : 'pin'} size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Duplicate action */}
          {onDuplicate && canDuplicate && (
            <Tooltip label="Duplicate" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onDuplicate}
                aria-label="Duplicate"
                className={styles.quickAction}
              >
                <Icon name="copy" size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Export action */}
          {onExport && (
            <Tooltip label="Export" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onExport}
                aria-label="Export"
                className={styles.quickAction}
              >
                <Icon name="download" size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Archive action - only for non-archived items */}
          {canArchive && onArchive && !isArchived && (
            <Tooltip label="Archive" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onArchive}
                aria-label="Archive"
                className={styles.quickAction}
              >
                <Icon name="archive" size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Delete action - only for archived items */}
          {canDelete && onDelete && isArchived && (
            <Tooltip label="Delete permanently" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onDelete}
                aria-label="Delete permanently"
                className={styles.quickActionDanger}
              >
                <Icon name="trash-2" size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      )}

      {/* Close button for secondary pane */}
      {paneType === 'secondary' && onCloseSplit && (
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={onCloseSplit}
          aria-label="Close split view"
        >
          <Icon name="x" size={16} />
        </ActionIcon>
      )}

      {/* Overflow menu for primary pane */}
      {showOverflowMenu && (
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="More actions"
            >
              <MoreHorizontal size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {/* Back to Time Machine option */}
            {showBackToTimeMachine && onBackToTimeMachine && (
              <>
                <Menu.Item
                  leftSection={<Icon name="clock" size={14} />}
                  onClick={onBackToTimeMachine}
                >
                  Back to Time Machine
                </Menu.Item>
                <Menu.Divider />
              </>
            )}

            {/* Open in split view */}
            {showSplitOption && (
              <Menu.Item
                leftSection={<Icon name="columns-2" size={14} />}
                onClick={() => openInSplit(object.id)}
              >
                Open in split view
              </Menu.Item>
            )}

            {/* View history */}
            {showHistoryOption && (
              <Menu.Item
                leftSection={<Icon name="history" size={14} />}
                onClick={onViewHistory}
              >
                View history
              </Menu.Item>
            )}

            {/* Pin/Unpin (also in quick actions but keep in menu for discoverability) */}
            {onPin && (
              <Menu.Item
                leftSection={
                  <Icon name={isPinned ? 'pin-off' : 'pin'} size={14} />
                }
                onClick={onPin}
              >
                {isPinned ? 'Unpin' : 'Pin to sidebar'}
              </Menu.Item>
            )}

            {/* Duplicate */}
            {onDuplicate && (
              <Menu.Item
                leftSection={<Icon name="copy" size={14} />}
                onClick={onDuplicate}
                disabled={!canDuplicate}
                rightSection={
                  <Text size="xs" c="dimmed">
                    Cmd+D
                  </Text>
                }
              >
                Duplicate
              </Menu.Item>
            )}

            {/* Export */}
            {onExport && (
              <Menu.Item
                leftSection={<Icon name="download" size={14} />}
                onClick={onExport}
                rightSection={
                  <Text size="xs" c="dimmed">
                    Cmd+Shift+E
                  </Text>
                }
              >
                Export...
              </Menu.Item>
            )}

            {/* Archive/Delete - with divider if there are other items */}
            {((canArchive && onArchive && !isArchived) ||
              (canDelete && onDelete && isArchived)) && <Menu.Divider />}

            {/* Archive - only for non-archived items */}
            {canArchive && onArchive && !isArchived && (
              <Menu.Item
                leftSection={<Icon name="archive" size={14} />}
                onClick={onArchive}
              >
                Archive
              </Menu.Item>
            )}

            {/* Delete permanently - only for archived items */}
            {canDelete && onDelete && isArchived && (
              <Menu.Item
                color="brick"
                leftSection={<Icon name="trash-2" size={14} />}
                onClick={onDelete}
              >
                Delete permanently
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}
