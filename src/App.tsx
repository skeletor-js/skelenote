import { useEffect, useState, useCallback, useRef } from 'react';
import { Layout } from '@/components/layout';
import { ObjectDetailView } from '@/components/object';
import { TaskView, InboxView, DailyNotesView } from '@/components/views';
import { CommandPalette } from '@/components/palette';
import { QuickCapture } from '@/components/capture';
import { SettingsView } from '@/components/settings';
import { useNavigation, useObjects, type ViewType } from '@/contexts';
import { useCommandPalette, useTodaysDailyNote } from '@/hooks';
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
 * Main content router based on current navigation state
 */
function MainContent() {
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
    return <ObjectDetailView objectId={selectedObjectId} />;
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

  return <PlaceholderView view={currentView} />;
}

function App() {
  const { store, refreshData, saveNow } = useObjects();
  const inboxCount = store?.getInboxed().length ?? 0;
  const { isOpen: isPaletteOpen, close: closePalette, toggle: togglePalette } = useCommandPalette();
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const { ensureExists: ensureTodaysDailyNote } = useTodaysDailyNote();
  const startupCompleteRef = useRef(false);

  // Auto-create today's daily note and run first-run setup on app launch
  useEffect(() => {
    if (!startupCompleteRef.current && store) {
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
  }, [store, ensureTodaysDailyNote, refreshData, saveNow]);

  const openQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(true);
  }, []);

  const closeQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(false);
  }, []);

  // Global Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        togglePalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette]);

  return (
    <>
      <Layout inboxCount={inboxCount}>
        <MainContent />
      </Layout>
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
        onQuickCapture={openQuickCapture}
      />
      <QuickCapture isOpen={isQuickCaptureOpen} onClose={closeQuickCapture} />
    </>
  );
}

export default App;
