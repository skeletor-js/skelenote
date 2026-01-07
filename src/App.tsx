import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Layout,
  SplitPane,
  type OmnibarFocusFunctions,
} from '@/components/layout';
import { ObjectDetailView } from '@/components/object';
import {
  TaskView,
  TasksView,
  InboxView,
  DailyNotesView,
  SavedViewContent,
  TypeBrowseView,
  ArchiveView,
} from '@/components/views';
import { SettingsView } from '@/components/settings';
import { SkeletonKeySetup } from '@/components/setup';
import { TimeMachine, HistoricalObjectView } from '@/components/history';
import { SearchResultsView } from '@/components/search';
import { KeyboardShortcutsModal } from '@/components/help';
import { TemplatePicker, TemplateEditor } from '@/components/templates';
import {
  useNavigation,
  useObjects,
  useSkeletonKey,
  useKeyboardShortcuts,
  useUndo,
  type ViewType,
} from '@/contexts';
import { useTodaysDailyNote, useTemplates } from '@/hooks';
import type { Template } from '@/lib/templates';
import { runFirstRunSetup } from '@/lib/first-run';
import type { TaskFilter } from '@/lib/tasks/filters';
import { BuiltInTypeIds } from '@/lib/types';

/**
 * Placeholder component for views not yet implemented
 */
function PlaceholderView({ view }: { view: ViewType }) {
  const viewLabels: Record<ViewType, string> = {
    inbox: 'Inbox',
    tasks: 'Tasks',
    today: 'Today',
    'daily-notes': 'Daily Notes',
    'this-week': 'This Week',
    overdue: 'Overdue',
    waiting: 'Waiting',
    eventually: 'Eventually',
    completed: 'Completed',
    object: 'Object Detail',
    settings: 'Settings',
    'time-machine': 'Time Machine',
    archive: 'Archive',
    search: 'Search',
    'saved-view': 'Saved View',
    'type-browse': 'Browse Objects',
  };

  return (
    <div
      style={{
        padding: 'var(--spacing-lg)',
        textAlign: 'center',
        color: 'var(--mantine-color-gray-6)',
      }}
    >
      <h1
        className="font-ui"
        style={{
          marginBottom: 'var(--spacing-md)',
          color: 'var(--mantine-color-text)',
        }}
      >
        {viewLabels[view]}
      </h1>
      <p>This view will be implemented soon.</p>
    </div>
  );
}

/**
 * Router for type browse view that gets typeId from navigation context
 */
function TypeBrowseViewRouter() {
  const { browseTypeId } = useNavigation();
  if (!browseTypeId) {
    return null;
  }
  return <TypeBrowseView typeId={browseTypeId} />;
}

/**
 * Renders the primary view based on current navigation state
 */
function PrimaryContent() {
  const { currentView, selectedObjectId } = useNavigation();
  const { isLoading, error } = useObjects();

  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--spacing-lg)',
          textAlign: 'center',
          color: 'var(--mantine-color-gray-6)',
        }}
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 'var(--spacing-lg)',
          textAlign: 'center',
          color: 'var(--mantine-color-gray-6)',
        }}
      >
        <p>Error initializing data store:</p>
        <p style={{ color: 'var(--mantine-color-brick-5)' }}>{error.message}</p>
      </div>
    );
  }

  if (currentView === 'object' && selectedObjectId) {
    return <ObjectDetailView objectId={selectedObjectId} paneType="primary" />;
  }

  // Consolidated Tasks view (with tabs)
  if (currentView === 'tasks') {
    return <TasksView />;
  }

  // Legacy task views (DEPRECATED - kept for backwards compatibility)
  const taskViewConfig: Record<string, { filter: TaskFilter; title: string }> =
    {
      today: { filter: 'today', title: 'Today' },
      'this-week': { filter: 'this-week', title: 'This Week' },
      overdue: { filter: 'overdue', title: 'Overdue' },
      waiting: { filter: 'waiting', title: 'Waiting' },
      eventually: { filter: 'eventually', title: 'Eventually' },
      completed: { filter: 'completed', title: 'Completed' },
    };

  if (currentView in taskViewConfig) {
    const config = taskViewConfig[currentView];
    return <TaskView filter={config.filter} title={config.title} />;
  }

  // Inbox view
  if (currentView === 'inbox') {
    return <InboxView />;
  }

  // Daily Notes view
  if (currentView === 'daily-notes') {
    return <DailyNotesView />;
  }

  // Settings view
  if (currentView === 'settings') {
    return <SettingsView />;
  }

  // Time Machine view
  if (currentView === 'time-machine') {
    return <TimeMachine />;
  }

  // Archive view
  if (currentView === 'archive') {
    return <ArchiveView />;
  }

  // Search view
  if (currentView === 'search') {
    return <SearchResultsView />;
  }

  // Saved view
  if (currentView === 'saved-view') {
    return <SavedViewContent />;
  }

  // Type browse view
  if (currentView === 'type-browse') {
    return <TypeBrowseViewRouter />;
  }

  return <PlaceholderView view={currentView} />;
}

/**
 * Main content router with split pane support
 */
function MainContent() {
  const { splitPane, setSplitWidth, closeSplit, openInSplit } = useNavigation();

  // Expose openInSplit for testing (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (
        window as unknown as { __openInSplit: typeof openInSplit }
      ).__openInSplit = openInSplit;
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        delete (window as unknown as { __openInSplit?: typeof openInSplit })
          .__openInSplit;
      }
    };
  }, [openInSplit]);

  // Render secondary content when split is open
  let secondaryContent = null;
  if (splitPane.isOpen && splitPane.objectId) {
    if (splitPane.mode === 'version-comparison') {
      // Show historical version in read-only view
      secondaryContent = <HistoricalObjectView />;
    } else {
      // Normal split mode - editable object detail
      secondaryContent = (
        <ObjectDetailView objectId={splitPane.objectId} paneType="secondary" />
      );
    }
  }

  return (
    <SplitPane
      secondaryContent={secondaryContent}
      splitWidth={splitPane.width}
      onWidthChange={setSplitWidth}
      onClose={closeSplit}
    >
      <PrimaryContent />
    </SplitPane>
  );
}

function App() {
  const { store, refreshData, saveNow } = useObjects();
  const { isInitialized: isCryptoInitialized, hasSkeletonKey } =
    useSkeletonKey();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const {
    splitPane,
    closeSplit,
    swapPanes,
    navigateToView,
    navigateToSearch,
    navigateBack,
    navigateForward,
    canGoBack,
    canGoForward,
    isEditorFocused,
    currentView,
    selectedObjectId,
  } = useNavigation();
  const { undo, redo } = useUndo();
  // Exclude tags, projects, and areas from inbox count (they appear in sidebar)
  const inboxCount =
    store
      ?.getInboxed()
      .filter(
        (item) =>
          item.typeId !== BuiltInTypeIds.TAG &&
          item.typeId !== BuiltInTypeIds.PROJECT &&
          item.typeId !== BuiltInTypeIds.AREA
      ).length ?? 0;
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const { ensureExists: ensureTodaysDailyNote } = useTodaysDailyNote();
  const { createObject: createFromTemplate } = useTemplates();
  const startupCompleteRef = useRef(false);
  const omnibarFocusRef = useRef<OmnibarFocusFunctions | null>(null);

  // Callback to receive the omnibar focus functions from Layout
  const handleRegisterOmnibarFocus = useCallback(
    (fns: OmnibarFocusFunctions) => {
      omnibarFocusRef.current = fns;
    },
    []
  );

  // Auto-create today's daily note and run first-run setup on app launch
  useEffect(() => {
    // Only run after crypto is ready and key exists
    if (!startupCompleteRef.current && store && hasSkeletonKey) {
      // Create today's daily note first
      const dailyNote = ensureTodaysDailyNote();

      // Run first-run setup if needed (creates welcome note)
      if (dailyNote) {
        const dailyNoteName = String(dailyNote.properties.title ?? 'Today');
        const welcomeNoteId = runFirstRunSetup(
          store,
          dailyNote.id,
          dailyNoteName
        );
        refreshData();

        // Immediately save if first-run created data
        if (welcomeNoteId) {
          saveNow();
        }
      }

      startupCompleteRef.current = true;
    }
  }, [store, hasSkeletonKey, ensureTodaysDailyNote, refreshData, saveNow]);

  const toggleShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen((prev) => !prev);
  }, []);

  const closeShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen(false);
  }, []);

  const openTemplatePicker = useCallback(() => {
    setIsTemplatePickerOpen(true);
  }, []);

  const closeTemplatePicker = useCallback(() => {
    setIsTemplatePickerOpen(false);
  }, []);

  const openTemplateEditor = useCallback(() => {
    setIsTemplateEditorOpen(true);
  }, []);

  const closeTemplateEditor = useCallback(() => {
    setIsTemplateEditorOpen(false);
  }, []);

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      createFromTemplate(template.id, { navigate: true });
      closeTemplatePicker();
    },
    [createFromTemplate, closeTemplatePicker]
  );

  // Register global keyboard shortcuts
  useEffect(() => {
    // Cmd+[ to navigate back
    registerShortcut('navigate-back', {
      key: '[',
      metaKey: true,
      action: () => {
        if (canGoBack) {
          navigateBack();
        }
      },
      description: 'Navigate back',
    });

    // Cmd+] to navigate forward
    registerShortcut('navigate-forward', {
      key: ']',
      metaKey: true,
      action: () => {
        if (canGoForward) {
          navigateForward();
        }
      },
      description: 'Navigate forward',
    });

    // Cmd+\ to close split view (only when open)
    registerShortcut('close-split', {
      key: '\\',
      metaKey: true,
      action: () => {
        if (splitPane.isOpen) {
          closeSplit();
        }
      },
      description: 'Close split view',
    });

    // Cmd+Shift+\ to swap panes
    registerShortcut('swap-panes', {
      key: '\\',
      metaKey: true,
      shiftKey: true,
      action: swapPanes,
      description: 'Swap split panes',
    });

    // Escape to close split view
    registerShortcut('escape-close-split', {
      key: 'Escape',
      action: () => {
        if (splitPane.isOpen) {
          closeSplit();
        }
      },
      description: 'Close split view',
    });

    // Cmd+Shift+H to open Time Machine
    registerShortcut('time-machine', {
      key: 'h',
      metaKey: true,
      shiftKey: true,
      action: () => navigateToView('time-machine'),
      description: 'Open Time Machine',
    });

    // Cmd+Shift+F to open Search
    registerShortcut('search', {
      key: 'f',
      metaKey: true,
      shiftKey: true,
      action: () => navigateToSearch(),
      description: 'Open Search',
    });

    // Cmd+? to open Keyboard Shortcuts help (? is Shift+/)
    // Register both '/' and '?' to handle browser differences
    registerShortcut('keyboard-shortcuts', {
      key: '/',
      metaKey: true,
      shiftKey: true,
      action: toggleShortcutsModal,
      description: 'Keyboard Shortcuts',
    });
    registerShortcut('keyboard-shortcuts-alt', {
      key: '?',
      metaKey: true,
      action: toggleShortcutsModal,
      description: 'Keyboard Shortcuts',
    });

    // Cmd+Shift+T to open Tasks view
    registerShortcut('tasks-view', {
      key: 't',
      metaKey: true,
      shiftKey: true,
      action: () => navigateToView('tasks'),
      description: 'Open Tasks',
    });

    // Cmd+K to focus omnibar
    registerShortcut('focus-omnibar', {
      key: 'k',
      metaKey: true,
      action: () => {
        omnibarFocusRef.current?.focus();
      },
      description: 'Focus Omnibar',
    });

    // Cmd+Z to undo (returns false when editor focused to let BlockNote handle it)
    registerShortcut('global-undo', {
      key: 'z',
      metaKey: true,
      action: () => {
        if (isEditorFocused) {
          return false; // Let BlockNote handle undo
        }
        undo();
      },
      description: 'Undo',
    });

    // Cmd+Shift+Z to redo
    registerShortcut('global-redo', {
      key: 'z',
      metaKey: true,
      shiftKey: true,
      action: () => {
        if (isEditorFocused) {
          return false; // Let BlockNote handle redo
        }
        redo();
      },
      description: 'Redo',
    });

    // Cmd+Y to redo (alternative)
    registerShortcut('global-redo-y', {
      key: 'y',
      metaKey: true,
      action: () => {
        if (isEditorFocused) {
          return false; // Let BlockNote handle redo
        }
        redo();
      },
      description: 'Redo',
    });

    // Cmd+1 to go to Inbox
    registerShortcut('go-to-inbox', {
      key: '1',
      metaKey: true,
      action: () => navigateToView('inbox'),
      description: 'Go to Inbox',
    });

    // Cmd+2 to go to Daily Notes
    registerShortcut('go-to-daily-notes', {
      key: '2',
      metaKey: true,
      action: () => navigateToView('daily-notes'),
      description: 'Go to Daily Notes',
    });

    // Cmd+3 to go to Tasks
    registerShortcut('go-to-tasks', {
      key: '3',
      metaKey: true,
      action: () => navigateToView('tasks'),
      description: 'Go to Tasks',
    });

    // Cmd+4 to go to Archive
    registerShortcut('go-to-archive', {
      key: '4',
      metaKey: true,
      action: () => navigateToView('archive'),
      description: 'Go to Archive',
    });

    // Cmd+N to open omnibar in create mode
    registerShortcut('new-object', {
      key: 'n',
      metaKey: true,
      action: () => {
        omnibarFocusRef.current?.focusCommandMode();
      },
      description: 'New object',
    });

    // Cmd+, to open Settings
    registerShortcut('open-settings', {
      key: ',',
      metaKey: true,
      action: () => navigateToView('settings'),
      description: 'Open Settings',
    });

    // Cmd+Backspace to archive current object
    registerShortcut('archive-object', {
      key: 'Backspace',
      metaKey: true,
      action: () => {
        if (currentView === 'object' && selectedObjectId && store) {
          store.archive(selectedObjectId);
          refreshData();
        }
      },
      description: 'Archive object',
    });

    // Cmd+Shift+P to pin/unpin current object
    registerShortcut('toggle-pin', {
      key: 'p',
      metaKey: true,
      shiftKey: true,
      action: () => {
        if (currentView === 'object' && selectedObjectId && store) {
          const obj = store.get(selectedObjectId);
          if (obj) {
            if (obj.pinned) {
              store.unpin(selectedObjectId);
            } else {
              store.pin(selectedObjectId);
            }
            refreshData();
          }
        }
      },
      description: 'Pin/Unpin object',
    });

    // E to toggle task completion (when viewing a task)
    registerShortcut('toggle-task-complete', {
      key: 'e',
      action: () => {
        if (currentView === 'object' && selectedObjectId && store) {
          const obj = store.get(selectedObjectId);
          if (obj && obj.typeId === BuiltInTypeIds.TASK) {
            const currentStatus = obj.properties.status;
            const newStatus = currentStatus === 'done' ? 'todo' : 'done';
            store.update(selectedObjectId, {
              properties: { ...obj.properties, status: newStatus },
            });
            refreshData();
          }
        }
      },
      description: 'Complete task',
    });

    return () => {
      unregisterShortcut('navigate-back');
      unregisterShortcut('navigate-forward');
      unregisterShortcut('close-split');
      unregisterShortcut('swap-panes');
      unregisterShortcut('escape-close-split');
      unregisterShortcut('time-machine');
      unregisterShortcut('search');
      unregisterShortcut('keyboard-shortcuts');
      unregisterShortcut('keyboard-shortcuts-alt');
      unregisterShortcut('tasks-view');
      unregisterShortcut('focus-omnibar');
      unregisterShortcut('global-undo');
      unregisterShortcut('global-redo');
      unregisterShortcut('global-redo-y');
      unregisterShortcut('go-to-inbox');
      unregisterShortcut('go-to-daily-notes');
      unregisterShortcut('go-to-tasks');
      unregisterShortcut('go-to-archive');
      unregisterShortcut('new-object');
      unregisterShortcut('open-settings');
      unregisterShortcut('archive-object');
      unregisterShortcut('toggle-pin');
      unregisterShortcut('toggle-task-complete');
    };
  }, [
    registerShortcut,
    unregisterShortcut,
    splitPane.isOpen,
    closeSplit,
    swapPanes,
    navigateToView,
    navigateToSearch,
    navigateBack,
    navigateForward,
    canGoBack,
    canGoForward,
    toggleShortcutsModal,
    isEditorFocused,
    undo,
    redo,
    currentView,
    selectedObjectId,
    store,
    refreshData,
  ]);

  // Show loading only during initial crypto initialization
  // (not during subsequent operations like key generation)
  if (!isCryptoInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--mantine-color-gray-6)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        Initializing...
      </div>
    );
  }

  // Show Skeleton Key setup if no key exists
  if (!hasSkeletonKey) {
    return <SkeletonKeySetup />;
  }

  return (
    <>
      <Layout
        inboxCount={inboxCount}
        onCreateFromTemplate={openTemplatePicker}
        onOpenShortcuts={toggleShortcutsModal}
        onNewTemplate={openTemplateEditor}
        onRegisterOmnibarFocus={handleRegisterOmnibarFocus}
      >
        <MainContent />
      </Layout>
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={closeShortcutsModal}
      />
      <TemplatePicker
        isOpen={isTemplatePickerOpen}
        onClose={closeTemplatePicker}
        onSelect={handleTemplateSelect}
      />
      <TemplateEditor
        isOpen={isTemplateEditorOpen}
        onClose={closeTemplateEditor}
      />
    </>
  );
}

export default App;
