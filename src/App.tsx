import { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, SplitPane } from '@/components/layout';
import { ObjectDetailView } from '@/components/object';
import { TaskView, InboxView, DailyNotesView, SavedViewContent } from '@/components/views';
import { CommandPalette } from '@/components/palette';
import { QuickCapture } from '@/components/capture';
import { SettingsView } from '@/components/settings';
import { SkeletonKeySetup } from '@/components/setup';
import { TimeMachine, HistoricalObjectView } from '@/components/history';
import { SearchResultsView } from '@/components/search';
import { KeyboardShortcutsModal } from '@/components/help';
import { TemplatePicker, TemplateEditor } from '@/components/templates';
import { useNavigation, useObjects, useSkeletonKey, useKeyboardShortcuts, type ViewType } from '@/contexts';
import { useCommandPalette, useTodaysDailyNote, useTemplates } from '@/hooks';
import type { Template } from '@/lib/templates';
import { runFirstRunSetup } from '@/lib/first-run';
import type { TaskFilter } from '@/lib/tasks/filters';

/**
 * Placeholder component for views not yet implemented
 */
function PlaceholderView({ view }: { view: ViewType }) {
  const viewLabels: Record<ViewType, string> = {
    inbox: 'Inbox',
    today: 'Today',
    'daily-notes': 'Daily Notes',
    'this-week': 'This Week',
    overdue: 'Overdue',
    blocked: 'Blocked',
    eventually: 'Eventually',
    completed: 'Completed',
    object: 'Object Detail',
    settings: 'Settings',
    'time-machine': 'Time Machine',
    search: 'Search',
    'saved-view': 'Saved View',
  };

  return (
    <div
      style={{
        padding: 'var(--spacing-lg)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      <h1
        className="font-ui"
        style={{
          marginBottom: 'var(--spacing-md)',
          color: 'var(--text-primary)',
        }}
      >
        {viewLabels[view]}
      </h1>
      <p>This view will be implemented soon.</p>
    </div>
  );
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
          color: 'var(--text-secondary)',
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
          color: 'var(--text-secondary)',
        }}
      >
        <p>Error initializing data store:</p>
        <p style={{ color: 'var(--tag-red)' }}>{error.message}</p>
      </div>
    );
  }

  if (currentView === 'object' && selectedObjectId) {
    return <ObjectDetailView objectId={selectedObjectId} paneType="primary" />;
  }

  // Task views
  const taskViewConfig: Record<string, { filter: TaskFilter; title: string }> = {
    today: { filter: 'today', title: 'Today' },
    'this-week': { filter: 'this-week', title: 'This Week' },
    overdue: { filter: 'overdue', title: 'Overdue' },
    blocked: { filter: 'blocked', title: 'Blocked' },
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

  // Search view
  if (currentView === 'search') {
    return <SearchResultsView />;
  }

  // Saved view
  if (currentView === 'saved-view') {
    return <SavedViewContent />;
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
      (window as unknown as { __openInSplit: typeof openInSplit }).__openInSplit = openInSplit;
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        delete (window as unknown as { __openInSplit?: typeof openInSplit }).__openInSplit;
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
      secondaryContent = <ObjectDetailView objectId={splitPane.objectId} paneType="secondary" />;
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
  const { isInitialized: isCryptoInitialized, hasSkeletonKey } = useSkeletonKey();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const { splitPane, closeSplit, swapPanes, navigateToView, navigateToSearch } = useNavigation();
  const inboxCount = store?.getInboxed().length ?? 0;
  const { isOpen: isPaletteOpen, close: closePalette, toggle: togglePalette } = useCommandPalette();
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const { ensureExists: ensureTodaysDailyNote } = useTodaysDailyNote();
  const { createObject: createFromTemplate } = useTemplates();
  const startupCompleteRef = useRef(false);

  // Auto-create today's daily note and run first-run setup on app launch
  useEffect(() => {
    // Only run after crypto is ready and key exists
    if (!startupCompleteRef.current && store && hasSkeletonKey) {
      // Create today's daily note first
      const dailyNote = ensureTodaysDailyNote();

      // Run first-run setup if needed (creates welcome note)
      if (dailyNote) {
        const dailyNoteName = String(dailyNote.properties.title ?? 'Today');
        const welcomeNoteId = runFirstRunSetup(store, dailyNote.id, dailyNoteName);
        refreshData();

        // Immediately save if first-run created data
        if (welcomeNoteId) {
          saveNow();
        }
      }

      startupCompleteRef.current = true;
    }
  }, [store, hasSkeletonKey, ensureTodaysDailyNote, refreshData, saveNow]);

  const openQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(true);
  }, []);

  const closeQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(false);
  }, []);

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
    registerShortcut('command-palette', {
      key: 'k',
      metaKey: true,
      action: togglePalette,
      description: 'Open command palette',
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

    return () => {
      unregisterShortcut('command-palette');
      unregisterShortcut('close-split');
      unregisterShortcut('swap-panes');
      unregisterShortcut('escape-close-split');
      unregisterShortcut('time-machine');
      unregisterShortcut('search');
      unregisterShortcut('keyboard-shortcuts');
      unregisterShortcut('keyboard-shortcuts-alt');
    };
  }, [registerShortcut, unregisterShortcut, togglePalette, splitPane.isOpen, closeSplit, swapPanes, navigateToView, navigateToSearch, toggleShortcutsModal]);

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
          color: 'var(--text-secondary)',
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
      <Layout inboxCount={inboxCount}>
        <MainContent />
      </Layout>
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
        onQuickCapture={openQuickCapture}
        onOpenShortcuts={toggleShortcutsModal}
        onCreateFromTemplate={openTemplatePicker}
        onNewTemplate={openTemplateEditor}
      />
      <QuickCapture isOpen={isQuickCaptureOpen} onClose={closeQuickCapture} />
      <KeyboardShortcutsModal isOpen={isShortcutsModalOpen} onClose={closeShortcutsModal} />
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
