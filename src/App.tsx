import { Layout } from '@/components/layout';
import { useNavigation, useObjects, type ViewType } from '@/contexts';

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
 * Object detail view placeholder (will be replaced in Commit 2)
 */
function ObjectDetailPlaceholder({ objectId }: { objectId: string }) {
  const { navigateBack, canGoBack } = useNavigation();

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      {canGoBack && (
        <button
          onClick={navigateBack}
          style={{
            marginBottom: 'var(--spacing-md)',
            padding: 'var(--spacing-xs) var(--spacing-sm)',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ← Back
        </button>
      )}
      <h1
        className="font-ui"
        style={{
          marginBottom: 'var(--spacing-md)',
          color: 'var(--text-primary)',
        }}
      >
        Object Detail
      </h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Viewing object: <code>{objectId}</code>
      </p>
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
    return <ObjectDetailPlaceholder objectId={selectedObjectId} />;
  }

  return <PlaceholderView view={currentView} />;
}

function App() {
  const { store } = useObjects();
  const inboxCount = store?.getInboxed().length ?? 0;

  return (
    <Layout inboxCount={inboxCount}>
      <MainContent />
    </Layout>
  );
}

export default App;
