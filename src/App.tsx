import { useEffect, useState, useCallback, useRef } from 'react';
import { Layout } from '@/components/layout';
import { ObjectDetailView } from '@/components/object';
import { TaskView, InboxView } from '@/components/views';
import { CommandPalette } from '@/components/palette';
import { QuickCapture } from '@/components/capture';
import { useNavigation, useObjects, type ViewType } from '@/contexts';
import { useCommandPalette, useTodaysDailyNote } from '@/hooks';
import type { TaskFilter } from '@/lib/tasks/filters';

/**
 * Placeholder component for views not yet implemented
 */
function PlaceholderView({ view }: { view: ViewType }) {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();

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
  };

  const handleCreateTestNote = () => {
    if (!store) return;
    const note = store.create({
      typeId: 'note',
      properties: {
        title: `Test Note ${Date.now()}`,
        isDailyNote: false,
      },
    });
    refreshData();
    navigateToObject(note.id);
  };

  const handleCreateTestTask = () => {
    if (!store) return;
    const task = store.create({
      typeId: 'task',
      properties: {
        title: `Test Task ${Date.now()}`,
        status: 'todo',
        priority: 'medium',
      },
    });
    refreshData();
    navigateToObject(task.id);
  };

  const handleCreateTestPerson = () => {
    if (!store) return;
    const person = store.create({
      typeId: 'person',
      properties: {
        name: `Test Person ${Date.now()}`,
      },
    });
    refreshData();
    navigateToObject(person.id);
  };

  const handleCreateTestLink = () => {
    if (!store) return;
    const link = store.create({
      typeId: 'link',
      properties: {
        url: 'https://example.com',
        title: `Test Link ${Date.now()}`,
      },
    });
    refreshData();
    navigateToObject(link.id);
  };

  const handleCreateTestProject = () => {
    if (!store) return;
    const project = store.create({
      typeId: 'project',
      properties: {
        name: `Test Project ${Date.now()}`,
        status: 'active',
      },
    });
    refreshData();
    navigateToObject(project.id);
  };

  const handleCreateTestTag = () => {
    if (!store) return;
    const tag = store.create({
      typeId: 'tag',
      properties: {
        name: `test-tag-${Date.now()}`,
      },
    });
    refreshData();
    navigateToObject(tag.id);
  };

  // Get all objects for testing
  const allObjects = store?.getAll() ?? [];

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
      <p style={{ marginBottom: 'var(--spacing-lg)' }}>
        This view will be implemented soon.
      </p>

      {/* Test controls - will be removed later */}
      <div
        style={{
          padding: 'var(--spacing-md)',
          background: 'var(--bg-raised)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'left',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <h2
          className="font-ui"
          style={{
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--spacing-md)',
            color: 'var(--text-muted)',
          }}
        >
          Test Controls (temporary)
        </h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <button onClick={handleCreateTestNote}>Create Note</button>
          <button onClick={handleCreateTestTask}>Create Task</button>
          <button onClick={handleCreateTestPerson}>Create Person</button>
          <button onClick={handleCreateTestLink}>Create Link</button>
          <button onClick={handleCreateTestProject}>Create Project</button>
          <button onClick={handleCreateTestTag}>Create Tag</button>
        </div>

        {allObjects.length > 0 && (
          <>
            <h3
              className="font-ui"
              style={{
                fontSize: 'var(--font-size-xs)',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-muted)',
              }}
            >
              Existing Objects ({allObjects.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              {allObjects.slice(0, 5).map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => navigateToObject(obj.id)}
                  style={{
                    textAlign: 'left',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    background: 'var(--bg-sunken)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {obj.typeId}: {String(obj.properties.title ?? obj.properties.name ?? obj.id)}
                </button>
              ))}
              {allObjects.length > 5 && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  ...and {allObjects.length - 5} more
                </p>
              )}
            </div>
          </>
        )}
      </div>
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

  return <PlaceholderView view={currentView} />;
}

function App() {
  const { store } = useObjects();
  const inboxCount = store?.getInboxed().length ?? 0;
  const { isOpen: isPaletteOpen, close: closePalette, toggle: togglePalette } = useCommandPalette();
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const { ensureExists: ensureTodaysDailyNote } = useTodaysDailyNote();
  const dailyNoteCreatedRef = useRef(false);

  // Auto-create today's daily note on app launch
  useEffect(() => {
    if (!dailyNoteCreatedRef.current && store) {
      ensureTodaysDailyNote();
      dailyNoteCreatedRef.current = true;
    }
  }, [store, ensureTodaysDailyNote]);

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
