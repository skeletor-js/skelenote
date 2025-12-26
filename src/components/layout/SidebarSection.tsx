import { type ReactNode } from 'react';
import './SidebarSection.css';
import { useSidebar } from '@/contexts';

interface SidebarSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  collapsible?: boolean;
}

export function SidebarSection({
  id,
  title,
  children,
  collapsible = true,
}: SidebarSectionProps) {
  const { isSectionCollapsed, toggleSection } = useSidebar();
  const isCollapsed = collapsible && isSectionCollapsed(id);

  const handleToggle = () => {
    if (collapsible) {
      toggleSection(id);
    }
  };

  return (
    <div className="sidebar-section">
      <button
        className={`sidebar-section__header ${collapsible ? 'sidebar-section__header--collapsible' : ''}`}
        onClick={handleToggle}
        aria-expanded={!isCollapsed}
        disabled={!collapsible}
      >
        {collapsible && (
          <span
            className={`sidebar-section__chevron ${isCollapsed ? 'sidebar-section__chevron--collapsed' : ''}`}
          >
            &#9656;
          </span>
        )}
        <span className="sidebar-section__title">{title}</span>
      </button>
      {!isCollapsed && (
        <div className="sidebar-section__content">{children}</div>
      )}
    </div>
  );
}
