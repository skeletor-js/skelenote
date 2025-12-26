import './Sidebar.css';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { Tag } from '@/components/ui';
import { useSidebar } from '@/contexts';
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
  const { theme, toggleTheme } = useTheme();

  if (isCollapsed) {
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__content">
        {/* Primary navigation */}
        <div className="sidebar__primary">
          <SidebarItem id="inbox" icon="📥" label="Inbox" count={inboxCount} />
        </div>

        <div className="sidebar__divider" />

        {/* Quick access */}
        <div className="sidebar__quick">
          <SidebarItem id="today" icon="📅" label="Today" />
          <SidebarItem id="daily-notes" icon="📆" label="Daily Notes" />
        </div>

        <div className="sidebar__divider" />

        {/* Tasks section */}
        <SidebarSection id="tasks" title="Tasks">
          <SidebarItem id="this-week" label="This Week" indent />
          <SidebarItem id="overdue" label="Overdue" indent />
          <SidebarItem id="blocked" label="Blocked" indent />
          <SidebarItem id="eventually" label="Eventually" indent />
          <SidebarItem id="completed" label="Completed" indent />
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
