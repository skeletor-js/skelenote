import { type ReactNode, useEffect } from 'react';
import './Layout.css';
import { Sidebar } from './Sidebar';
import { useSidebar, useNavigation } from '@/contexts';

interface LayoutProps {
  children: ReactNode;
  inboxCount?: number;
  onCreateFromTemplate?: () => void;
}

export function Layout({ children, inboxCount = 0, onCreateFromTemplate }: LayoutProps) {
  const { isCollapsed, setCollapsed, toggleCollapsed } = useSidebar();
  const { splitPane } = useNavigation();

  // Handle responsive collapse
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setCollapsed(true);
      }
    };

    // Check initial state
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setCollapsed]);

  return (
    <div
      className={`layout ${isCollapsed ? 'layout--sidebar-collapsed' : ''}`}
    >
      <Sidebar inboxCount={inboxCount} onCreateFromTemplate={onCreateFromTemplate} />
      <main className="layout__main">
        {/* Show menu button when sidebar is collapsed */}
        {isCollapsed && (
          <button
            className="layout__menu-btn"
            onClick={toggleCollapsed}
            aria-label="Open sidebar"
          >
            ☰
          </button>
        )}
        <div className={`layout__content ${splitPane.isOpen ? 'layout__content--split-active' : ''}`}>{children}</div>
      </main>
      {/* Overlay for mobile when sidebar is open */}
      {!isCollapsed && (
        <div
          className="layout__overlay"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
