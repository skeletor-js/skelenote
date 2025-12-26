import { Layout } from '@/components/layout';
import { ObjectDetailView } from '@/components/object';
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
