import { Box, UnstyledButton, Text } from '@mantine/core';
import {
  Inbox,
  CalendarDays,
  CheckSquare,
  Search,
  LayoutGrid,
} from 'lucide-react';
import { useNavigation, type ViewType } from '@/contexts';

interface TabItem {
  id: ViewType;
  label: string;
  icon: typeof Inbox;
}

const TABS: TabItem[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'daily-notes', label: 'Daily', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'browse', label: 'Browse', icon: LayoutGrid },
];

const TAB_BAR_HEIGHT = 64;

interface BottomTabBarProps {
  inboxCount?: number;
}

export function BottomTabBar({ inboxCount = 0 }: BottomTabBarProps) {
  const { currentView, navigateToView, navigateToSearch } = useNavigation();

  const handleTabPress = (tab: TabItem) => {
    if (tab.id === 'search') {
      navigateToSearch();
    } else {
      navigateToView(tab.id);
    }
  };

  const isActive = (tabId: ViewType): boolean => {
    // Search view is active when currentView is 'search'
    if (tabId === 'search') return currentView === 'search';
    // Tasks includes all task-related views
    if (tabId === 'tasks') {
      return [
        'tasks',
        'today',
        'this-week',
        'overdue',
        'waiting',
        'eventually',
        'completed',
      ].includes(currentView);
    }
    // Browse includes all organizational views
    if (tabId === 'browse') {
      return [
        'browse',
        'projects',
        'areas',
        'tags',
        'archive',
        'time-machine',
        'type-browse',
        'saved-view',
        'settings',
      ].includes(currentView);
    }
    return currentView === tabId;
  };

  return (
    <Box
      style={{
        // Use flex layout positioning (not fixed) - parent handles placement
        // Extend into safe area with padding to keep icons above home indicator
        minHeight: TAB_BAR_HEIGHT,
        paddingTop: 16,
        paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
        backgroundColor: 'var(--surface-paper)',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.id);
        const showBadge = tab.id === 'inbox' && inboxCount > 0;

        return (
          <UnstyledButton
            key={tab.id}
            onClick={() => handleTabPress(tab)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: TAB_BAR_HEIGHT,
              minWidth: 64,
              padding: '8px 16px',
              position: 'relative',
            }}
          >
            <Box style={{ position: 'relative' }}>
              <Icon
                size={24}
                strokeWidth={active ? 2 : 1.5}
                style={{
                  color: active
                    ? 'var(--mantine-color-ember-6)'
                    : 'var(--mantine-color-gray-6)',
                }}
              />
              {showBadge && (
                <Box
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: 'var(--mantine-color-ember-6)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {inboxCount > 99 ? '99+' : inboxCount}
                </Box>
              )}
            </Box>
            <Text
              size="xs"
              mt="xs"
              style={{
                color: active
                  ? 'var(--mantine-color-ember-6)'
                  : 'var(--mantine-color-gray-6)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {tab.label}
            </Text>
          </UnstyledButton>
        );
      })}
    </Box>
  );
}

export { TAB_BAR_HEIGHT };
