/**
 * SavedViewsSection - Collapsible section displaying saved views in the sidebar
 */

import { useCallback, useState } from 'react';
import {
  NavLink,
  Badge,
  Box,
  Group,
  ActionIcon,
  Menu,
  Text,
  Stack,
} from '@mantine/core';
import { ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { useSidebar } from '@/contexts';
import { useSavedViews, useConfirmDialog } from '@/hooks';
import { SavedViewEditor } from '@/components/views';
import { ConfirmDialog } from '@/components/ui';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { SavedView } from '@/lib/types';
import styles from './SavedViewsSection.module.css';
import sidebarStyles from './SidebarItem.module.css';

interface SavedViewsSectionProps {
  /** Callback when a view is selected */
  onViewSelect?: (view: SavedView) => void;
  /** ID of the currently active view (for highlighting) */
  activeViewId?: string | null;
}

export function SavedViewsSection({
  onViewSelect,
  activeViewId,
}: SavedViewsSectionProps) {
  const { isSectionCollapsed, toggleSection } = useSidebar();
  const { views, deleteView } = useSavedViews();
  const { confirm, dialogState, handleConfirm, handleCancel } =
    useConfirmDialog();

  const [contextMenuView, setContextMenuView] = useState<SavedView | null>(
    null
  );

  // Editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingView, setEditingView] = useState<SavedView | null>(null);

  const isCollapsed = isSectionCollapsed('saved-views');

  const handleToggle = useCallback(() => {
    toggleSection('saved-views');
  }, [toggleSection]);

  // Open editor for creating new view
  const handleCreateView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingView(null);
    setIsEditorOpen(true);
  }, []);

  // Open editor for editing existing view
  const handleEdit = useCallback((view: SavedView) => {
    setEditingView(view);
    setIsEditorOpen(true);
    setContextMenuView(null);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingView(null);
  }, []);

  const handleDelete = useCallback(
    async (view: SavedView) => {
      setContextMenuView(null);

      const confirmed = await confirm({
        title: 'Delete View',
        message: `Are you sure you want to delete "${view.name}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });

      if (confirmed) {
        deleteView(view.id);
      }
    },
    [confirm, deleteView]
  );

  const handleViewClick = useCallback(
    (view: SavedView) => {
      onViewSelect?.(view);
    },
    [onViewSelect]
  );

  // Render icon - either as Lucide icon name or emoji fallback
  const renderIcon = (icon: string | undefined) => {
    const iconValue = icon || 'clipboard';
    if (/^[a-z-]+$/.test(iconValue)) {
      return <Icon name={iconValue as IconName} size={16} />;
    }
    return <span style={{ fontSize: 14 }}>{iconValue}</span>;
  };

  return (
    <Box mb="xs" className={styles.sectionHeader}>
      <NavLink
        label="Saved Views"
        leftSection={
          <ChevronRight
            size={14}
            style={{
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform 150ms ease',
            }}
          />
        }
        rightSection={
          <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
            {views.length > 0 && (
              <Badge size="xs" variant="light" color="gray" radius="sm">
                {views.length}
              </Badge>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              onClick={handleCreateView}
              aria-label="Create new saved view"
              title="Create new saved view"
            >
              <Plus size={14} />
            </ActionIcon>
          </Group>
        }
        onClick={handleToggle}
        opened={!isCollapsed}
        disableRightSectionRotation
        variant="subtle"
        className={sidebarStyles.navLink}
        styles={{
          label: {
            fontWeight: 600,
            fontSize: 'var(--mantine-font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--mantine-color-dimmed)',
          },
        }}
      >
        <Stack gap={0} role="listbox" aria-label="Saved views">
          {views.length === 0 ? (
            <Text size="xs" c="dimmed" py="xs" px="md">
              No saved views yet
            </Text>
          ) : (
            views.map((view) => (
              <Menu
                key={view.id}
                opened={contextMenuView?.id === view.id}
                onClose={() => setContextMenuView(null)}
                position="right-start"
              >
                <Menu.Target>
                  <Box
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuView(view);
                    }}
                  >
                    <NavLink
                      label={view.name}
                      leftSection={renderIcon(view.icon)}
                      active={activeViewId === view.id}
                      onClick={() => handleViewClick(view)}
                      variant="subtle"
                      className={sidebarStyles.navLink}
                    />
                  </Box>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<Pencil size={14} />}
                    onClick={() => handleEdit(view)}
                  >
                    Edit View
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<Trash2 size={14} />}
                    color="brick"
                    onClick={() => handleDelete(view)}
                  >
                    Delete View
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ))
          )}
        </Stack>
      </NavLink>

      <SavedViewEditor
        view={editingView}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
      />

      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}
