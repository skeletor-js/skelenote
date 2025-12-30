import { type ReactNode } from 'react';
import { NavLink, Box } from '@mantine/core';
import { ChevronRight } from 'lucide-react';
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
    <Box mb="xs">
      <NavLink
        label={title}
        leftSection={
          collapsible ? (
            <ChevronRight
              size={14}
              style={{
                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                transition: 'transform 150ms ease',
              }}
            />
          ) : undefined
        }
        onClick={handleToggle}
        opened={!isCollapsed}
        disableRightSectionRotation
        variant="subtle"
        styles={{
          label: {
            fontWeight: 600,
            fontSize: 'var(--mantine-font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--mantine-color-dimmed)',
          },
        }}
      >
        {children}
      </NavLink>
    </Box>
  );
}
