/**
 * ObjectDetailView - Main container for viewing and editing objects
 * Redesigned with high-density layout and Linear-inspired styling
 */

import { useCallback, useMemo, useEffect, useState } from 'react';
import { Stack, Box, Text, Button, Loader, Center } from '@mantine/core';
import { ObjectHeader } from './ObjectHeader';
import { PropertyBar } from './PropertyBar';
import { Backlinks } from './Backlinks';
import { RelatedObjectsSection } from './RelatedObjectsSection';
import { Editor } from '@/components/editor';
import { ConfirmDialog, Icon, ContextMenu } from '@/components/ui';
import { ExportOptionsModal, type ExportOptions } from '@/components/export';
import { removeMentionsFromContent } from '@/lib/editor';
import { exportObjectToMarkdown, exportObjectToPDF } from '@/lib/export';
import type { PropertyValue } from '@/lib/types';
import {
  useObjects,
  useNavigation,
  useTypeRegistry,
  useToast,
  useKeyboardShortcuts,
  useSemanticSearchSafe,
} from '@/contexts';
import { useConfirmDialog, useDuplicate, useContextMenu } from '@/hooks';
import styles from './ObjectDetailView.module.css';

interface ObjectDetailViewProps {
  objectId: string;
  /** Which pane this view is rendered in */
  paneType?: 'primary' | 'secondary';
}

export function ObjectDetailView({
  objectId,
  paneType = 'primary',
}: ObjectDetailViewProps) {
  const { store, isLoading, refreshData, scheduleSave } = useObjects();
  const {
    navigateBack,
    canGoBack,
    closeSplit,
    splitPane,
    navigateToView,
    navigateToTimeMachine,
  } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } =
    useConfirmDialog();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const { duplicate, canDuplicate } = useDuplicate();
  const semanticContext = useSemanticSearchSafe();

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Context menu state
  const {
    isOpen: contextMenuOpen,
    position: contextMenuPosition,
    openContextMenu,
    closeContextMenu,
  } = useContextMenu();

  // Check if we're in version comparison mode
  const isVersionComparison = splitPane.mode === 'version-comparison';

  // Handler to go back to Time Machine from comparison view
  const handleBackToTimeMachine = useCallback(() => {
    closeSplit();
    navigateToView('time-machine');
  }, [closeSplit, navigateToView]);

  // Handler to view object history in filtered Time Machine
  const handleViewHistory = useCallback(() => {
    navigateToTimeMachine(objectId);
  }, [navigateToTimeMachine, objectId]);

  // Handler to open export modal
  const handleExport = useCallback(() => {
    setExportModalOpen(true);
  }, []);

  // Handler for export with options from modal
  const handleExportWithOptions = useCallback(
    async (options: ExportOptions) => {
      if (!store) return;

      const object = store.get(objectId);
      if (!object) return;

      const objTypeDef = typeRegistry.get(object.typeId);
      if (!objTypeDef) return;

      const content = store.getContent(objectId);

      // Create resolver function for object names
      const resolveObjectName = (id: string): string | undefined => {
        const obj = store.get(id);
        if (!obj) return undefined;
        const name = obj.properties.title ?? obj.properties.name;
        return name ? String(name) : undefined;
      };

      try {
        let filePath: string | null = null;

        if (options.format === 'pdf') {
          filePath = await exportObjectToPDF(
            object,
            objTypeDef,
            content,
            resolveObjectName,
            {
              theme: options.pdfTheme,
              includeTitle: options.includeTitle,
              includeFrontmatter: options.includeFrontmatter,
              pageSize: 'A4',
            }
          );
        } else {
          // Default to markdown
          filePath = await exportObjectToMarkdown(
            object,
            objTypeDef,
            content,
            resolveObjectName,
            {
              includeFrontmatter: options.includeFrontmatter,
              includeTitle: options.includeTitle,
            }
          );
        }

        if (filePath) {
          // Extract filename from path
          const filename = filePath.split('/').pop() || filePath;
          addToast({
            type: 'success',
            message: `Exported to ${filename}`,
          });
        }
      } catch (error) {
        console.error('Export failed:', error);
        addToast({
          type: 'error',
          message: 'Failed to export. Please try again.',
        });
      }
    },
    [store, objectId, typeRegistry, addToast]
  );

  // Handler to duplicate object
  const handleDuplicate = useCallback(() => {
    duplicate(objectId);
  }, [duplicate, objectId]);

  // Register keyboard shortcuts
  useEffect(() => {
    // Only register in primary pane and not in version comparison mode
    if (paneType === 'primary' && !isVersionComparison) {
      registerShortcut('view-object-history', {
        key: 'h',
        description: 'View object history',
        action: handleViewHistory,
      });

      registerShortcut('export-to-markdown', {
        key: 'e',
        metaKey: true,
        shiftKey: true,
        description: 'Export to Markdown',
        action: handleExport,
      });

      // Only register duplicate shortcut if object can be duplicated
      if (canDuplicate(objectId)) {
        registerShortcut('duplicate-object', {
          key: 'd',
          metaKey: true,
          description: 'Duplicate object',
          action: handleDuplicate,
        });
      }

      return () => {
        unregisterShortcut('view-object-history');
        unregisterShortcut('export-to-markdown');
        unregisterShortcut('duplicate-object');
      };
    }
  }, [
    paneType,
    isVersionComparison,
    handleViewHistory,
    handleExport,
    handleDuplicate,
    canDuplicate,
    objectId,
    registerShortcut,
    unregisterShortcut,
  ]);

  // Handler to archive object
  const handleArchive = useCallback(() => {
    if (!store) return;

    const object = store.get(objectId);
    if (!object) return;

    const titleProp =
      object.properties.title ?? object.properties.name ?? 'Untitled';
    const title = String(titleProp);

    store.archive(objectId);
    refreshData();
    addToast({
      type: 'success',
      message: `"${title}" archived`,
    });

    // Navigate based on pane type
    if (paneType === 'secondary') {
      closeSplit();
    } else if (canGoBack) {
      navigateBack();
    }
  }, [
    store,
    objectId,
    refreshData,
    addToast,
    paneType,
    closeSplit,
    canGoBack,
    navigateBack,
  ]);

  const handleDelete = useCallback(async () => {
    if (!store) return;

    const object = store.get(objectId);
    if (!object) return;

    const typeDef = typeRegistry.get(object.typeId);
    const titleProp =
      object.properties.title ?? object.properties.name ?? 'Untitled';
    const title = String(titleProp);

    const confirmed = await confirm({
      title: `Delete ${typeDef?.name ?? 'Object'}?`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      // Clean up mentions of this object in other objects' content
      const allObjects = store.getAll();
      for (const obj of allObjects) {
        if (obj.id === objectId) continue; // Skip the object being deleted

        try {
          const content = store.getContent(obj.id);
          if (content) {
            const cleanedContent = removeMentionsFromContent(content, objectId);
            if (cleanedContent) {
              store.setContent(obj.id, cleanedContent);
            }
          }
        } catch {
          // Content might not exist for this object, skip
        }
      }

      store.delete(objectId);
      refreshData();
      addToast({
        type: 'success',
        message: `"${title}" has been deleted.`,
      });
      // Navigate based on pane type
      if (paneType === 'secondary') {
        closeSplit();
      } else if (canGoBack) {
        navigateBack();
      }
    }
  }, [
    store,
    objectId,
    typeRegistry,
    confirm,
    refreshData,
    addToast,
    canGoBack,
    navigateBack,
    paneType,
    closeSplit,
  ]);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!store) return;
      const object = store.get(objectId);
      if (!object) return;

      // Determine which property holds the title
      const titlePropertyId =
        object.properties.title !== undefined ? 'title' : 'name';
      store.setProperty(objectId, titlePropertyId, newTitle);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  const handlePropertyChange = useCallback(
    (propertyId: string, value: PropertyValue) => {
      if (!store) return;
      store.setProperty(objectId, propertyId, value);
      refreshData();
    },
    [store, objectId, refreshData]
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!store) return;
      store.setContent(objectId, content);
      // Don't call refreshData here - editor handles its own state
      // But do schedule a save to persist content changes
      scheduleSave();
      // Notify semantic search of content change (will be indexed on blur)
      semanticContext?.notifyContentChange(objectId);
    },
    [store, objectId, scheduleSave, semanticContext]
  );

  // Context menu items for right-click
  const contextMenuItems = useMemo(() => {
    const object = store?.get(objectId);
    const isDailyNoteObj = object?.properties.isDailyNote === true;

    return [
      {
        id: 'export',
        label: 'Export...',
        icon: 'download',
        onClick: handleExport,
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: 'copy',
        disabled: !canDuplicate(objectId),
        onClick: handleDuplicate,
      },
      {
        id: 'archive',
        label: 'Archive',
        icon: 'archive',
        disabled: isDailyNoteObj,
        onClick: handleArchive,
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: 'trash-2',
        variant: 'danger' as const,
        disabled: isDailyNoteObj,
        onClick: handleDelete,
      },
    ];
  }, [
    store,
    objectId,
    canDuplicate,
    handleExport,
    handleDuplicate,
    handleArchive,
    handleDelete,
  ]);

  // Flush semantic index changes when leaving editor
  useEffect(() => {
    return () => {
      semanticContext?.flushContentChanges(objectId);
    };
  }, [objectId, semanticContext]);

  // Get current content for the editor
  const currentContent = useMemo(() => {
    if (!store) return null;
    try {
      return store.getContent(objectId);
    } catch {
      return null;
    }
  }, [store, objectId]);

  if (isLoading || !store) {
    return (
      <Center className={styles.loadingContainer}>
        <Loader size="sm" />
        <Text ml="sm" c="dimmed">
          Loading...
        </Text>
      </Center>
    );
  }

  const object = store.get(objectId);

  if (!object) {
    return (
      <Box className={styles.errorContainer}>
        <Text c="red" mb="sm">
          Object not found: {objectId}
        </Text>
        {paneType === 'secondary' ? (
          <Button
            variant="subtle"
            onClick={closeSplit}
            leftSection={<Icon name="x" size={14} />}
          >
            Close
          </Button>
        ) : (
          canGoBack && (
            <Button
              variant="subtle"
              onClick={navigateBack}
              leftSection={<Icon name="chevron-left" size={14} />}
            >
              Go Back
            </Button>
          )
        )}
      </Box>
    );
  }

  const typeDef = typeRegistry.get(object.typeId);

  if (!typeDef) {
    return (
      <Box className={styles.errorContainer}>
        <Text c="red" mb="sm">
          Unknown object type: {object.typeId}
        </Text>
        {paneType === 'secondary' ? (
          <Button
            variant="subtle"
            onClick={closeSplit}
            leftSection={<Icon name="x" size={14} />}
          >
            Close
          </Button>
        ) : (
          canGoBack && (
            <Button
              variant="subtle"
              onClick={navigateBack}
              leftSection={<Icon name="chevron-left" size={14} />}
            >
              Go Back
            </Button>
          )
        )}
      </Box>
    );
  }

  const isDailyNote = object.properties.isDailyNote === true;

  return (
    <Box className={styles.container}>
      {/* Header with inline title editing and hover-reveal actions */}
      <ObjectHeader
        object={object}
        typeDef={typeDef}
        onTitleChange={handleTitleChange}
        onDelete={handleDelete}
        canDelete={!isDailyNote}
        onArchive={handleArchive}
        canArchive={!isDailyNote}
        isArchived={object.archived}
        titleEditable={!isDailyNote}
        paneType={paneType}
        onCloseSplit={paneType === 'secondary' ? closeSplit : undefined}
        onViewHistory={handleViewHistory}
        onExport={handleExport}
        onDuplicate={handleDuplicate}
        canDuplicate={canDuplicate(objectId)}
        showBackToTimeMachine={isVersionComparison}
        onBackToTimeMachine={handleBackToTimeMachine}
      />

      {/* Scrollable content area */}
      <Box className={styles.content} onContextMenu={openContextMenu}>
        <Stack gap="sm">
          {/* Properties as inline chips with prominent status/priority badges */}
          <PropertyBar
            object={object}
            typeDef={typeDef}
            onPropertyChange={handlePropertyChange}
          />

          {/* Content Section with BlockNote Editor */}
          {typeDef.hasContent && (
            <Box component="section" className={styles.section}>
              <Editor
                objectId={objectId}
                initialContent={currentContent}
                onContentChange={handleContentChange}
              />
            </Box>
          )}

          {/* Related Objects Section (for Projects, Areas, Tags) */}
          {(object.typeId === 'project' ||
            object.typeId === 'area' ||
            object.typeId === 'tag') && (
            <RelatedObjectsSection
              objectId={objectId}
              objectTypeId={object.typeId as 'project' | 'area' | 'tag'}
            />
          )}

          {/* Backlinks Section - hidden for project/area/tag which have RelatedObjectsSection */}
          {object.typeId !== 'project' &&
            object.typeId !== 'area' &&
            object.typeId !== 'tag' && <Backlinks objectId={objectId} />}
        </Stack>
      </Box>

      {/* Confirm Dialog for Delete */}
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

      {/* Export Options Modal */}
      <ExportOptionsModal
        opened={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportWithOptions}
      />

      {/* Right-click context menu */}
      <ContextMenu
        items={contextMenuItems}
        position={contextMenuPosition}
        isOpen={contextMenuOpen}
        onClose={closeContextMenu}
      />
    </Box>
  );
}
