import './Sidebar.css';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { Tag } from '@/components/ui';
import { useSidebar, useNavigation, type ViewType } from '@/contexts';
import { useTheme } from '@/hooks';

// Mock data - will be replaced with real data from ObjectStore in later phases
const mockProjects = [
  { id: 'proj-1', name: 'Website Redesign' },
  { id: 'proj-2', name: 'Q1 Planning' },
];

const mockTags = [
  { id: 'tag-1', name: 'urgent', color: 'red' as const },
  { id: 'tag-2', name: 'work', color: 'blue' as const },
  { id: 'tag-3', name: 'personal', color: 'green' as const },
];

interface SidebarProps {
  inboxCount?: number;
}

export function Sidebar({ inboxCount = 0 }: SidebarProps) {
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const { navigateToView } = useNavigation();
  const { theme, toggleTheme } = useTheme();

  const handleNavigate = (view: ViewType) => {
    navigateToView(view);
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__content">
        {/* Primary navigation */}
        <div className="sidebar__primary">
          <SidebarItem
            id="inbox"
            icon="📥"
            label="Inbox"
            count={inboxCount}
            onClick={() => handleNavigate('inbox')}
          />
        </div>

        <div className="sidebar__divider" />

        {/* Quick access */}
        <div className="sidebar__quick">
          <SidebarItem
            id="today"
            icon="📅"
            label="Today"
            onClick={() => handleNavigate('today')}
          />
          <SidebarItem
            id="daily-notes"
            icon="📆"
            label="Daily Notes"
            onClick={() => handleNavigate('daily-notes')}
          />
        </div>

        <div className="sidebar__divider" />

        {/* Tasks section */}
        <SidebarSection id="tasks" title="Tasks">
          <SidebarItem
            id="this-week"
            label="This Week"
            indent
            onClick={() => handleNavigate('this-week')}
          />
          <SidebarItem
            id="overdue"
            label="Overdue"
            indent
            onClick={() => handleNavigate('overdue')}
          />
          <SidebarItem
            id="blocked"
            label="Blocked"
            indent
            onClick={() => handleNavigate('blocked')}
          />
          <SidebarItem
            id="eventually"
            label="Eventually"
            indent
            onClick={() => handleNavigate('eventually')}
          />
          <SidebarItem
            id="completed"
            label="Completed"
            indent
            onClick={() => handleNavigate('completed')}
          />
        </SidebarSection>

        {/* Projects section */}
        <SidebarSection id="projects" title="Projects">
          {mockProjects.map((project) => (
            <SidebarItem
              key={project.id}
              id={`project-${project.id}`}
              label={project.name}
              indent
            />
          ))}
          <SidebarItem id="new-project" label="+ New Project" indent />
        </SidebarSection>

        {/* Tags section */}
        <SidebarSection id="tags" title="Tags">
          {mockTags.map((tag) => (
            <div key={tag.id} className="sidebar__tag-item">
              <Tag name={tag.name} color={tag.color} size="sm" onClick={() => {}} />
            </div>
          ))}
        </SidebarSection>
      </div>

      {/* Footer with controls */}
      <div className="sidebar__footer">
        <button
          className="sidebar__control-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          className="sidebar__control-btn"
          onClick={toggleCollapsed}
          aria-label="Collapse sidebar"
        >
          ◀
        </button>
      </div>
    </aside>
  );
}
