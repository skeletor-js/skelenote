import { useState, useCallback } from 'react';
import { UnstyledButton } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  CalendarDays,
  CheckSquare,
  Library,
  Plus,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useNavigation, type ViewType } from '@/contexts';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { usePlatform } from '@/hooks/usePlatform';
import { springs } from '@/lib/animations';
import { QuickCaptureSheet } from '@/components/mobile/sheets';
import classes from './BottomTabBar.module.css';

interface TabItem {
  id: ViewType;
  icon: typeof Inbox;
  label: string; // For accessibility
}

// Tab order: Inbox, Daily, Tasks, Browse (icons only)
const TABS: TabItem[] = [
  { id: 'inbox', icon: Inbox, label: 'Inbox' },
  { id: 'daily-notes', icon: CalendarDays, label: 'Daily' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'browse', icon: Library, label: 'Browse' },
];

// Dimensions (iOS HIG: 44pt minimum touch target)
const TAB_BAR_HEIGHT = 56;
const TAB_CIRCLE_SIZE = 44;
const TAB_ICON_SIZE = 20;
const FAB_SIZE = 56;

// LocalStorage key for collapse state persistence
const COLLAPSE_KEY = 'skelenote:tabBarCollapsed';

/**
 * Hook for managing tab bar collapse state with localStorage persistence
 */
function useTabBarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  });

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }, []);

  return { isCollapsed, toggle };
}

export function BottomTabBar() {
  const { currentView, navigateToView } = useNavigation();
  const { impact } = useHaptics();
  const { safeAreaBottom } = usePlatform();
  const reduceMotion = useReducedMotion();
  const { isCollapsed, toggle: toggleCollapse } = useTabBarCollapse();
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);

  const handleTabPress = async (tab: TabItem) => {
    await impact('light');
    navigateToView(tab.id);
  };

  const handleFabPress = async () => {
    await impact('medium');
    setCaptureSheetOpen(true);
  };

  const handleChevronPress = async () => {
    await impact('light');
    toggleCollapse();
  };

  const isActive = (tabId: ViewType): boolean => {
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
        'templates',
        'pinned',
      ].includes(currentView);
    }
    return currentView === tabId;
  };

  const transition = reduceMotion ? { duration: 0 } : springs.default;
  const snappyTransition = reduceMotion ? { duration: 0 } : springs.snappy;

  return (
    <>
      {/* Tab Bar Wrapper - pill with chevron (expands from FAB, collapses into FAB) */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className={classes.tabBarWrapper}
            initial={{ x: 80, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 80, opacity: 0, scale: 0.8 }}
            transition={transition}
            style={{
              bottom: safeAreaBottom + 16,
              transformOrigin: 'right center',
            }}
          >
            {/* Chevron toggle - collapse button (LEFT side of pill) */}
            <motion.button
              className={classes.chevronToggle}
              onClick={handleChevronPress}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              aria-label="Collapse navigation bar"
            >
              <ChevronRight size={18} strokeWidth={2} />
            </motion.button>

            {/* Pill container with circular tab buttons */}
            <nav className={classes.tabPill} aria-label="Main navigation">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = isActive(tab.id);

                return (
                  <UnstyledButton
                    key={tab.id}
                    onClick={() => handleTabPress(tab)}
                    aria-label={`${tab.label}${active ? ', selected' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    className={classes.tabCircle}
                    data-active={active || undefined}
                    style={{
                      width: TAB_CIRCLE_SIZE,
                      height: TAB_CIRCLE_SIZE,
                    }}
                  >
                    <Icon size={TAB_ICON_SIZE} strokeWidth={active ? 2 : 1.5} />
                  </UnstyledButton>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Group - always visible on the right */}
      <motion.div
        className={classes.fabGroup}
        style={{ bottom: safeAreaBottom + 16 }}
      >
        {/* Chevron appears when collapsed - points left to expand */}
        <AnimatePresence>
          {isCollapsed && (
            <motion.button
              className={classes.chevronToggle}
              onClick={handleChevronPress}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={snappyTransition}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              aria-label="Expand navigation bar"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Floating FAB with ember glow */}
        <UnstyledButton
          onClick={handleFabPress}
          aria-label="Quick capture"
          className={classes.fab}
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            backgroundColor: 'var(--mantine-color-ember-5, #B85C50)',
          }}
        >
          <Plus
            size={24}
            strokeWidth={2.5}
            color="var(--surface-canvas, #FAFAFA)"
          />
        </UnstyledButton>
      </motion.div>

      <QuickCaptureSheet
        opened={captureSheetOpen}
        onClose={() => setCaptureSheetOpen(false)}
      />
    </>
  );
}

export { TAB_BAR_HEIGHT };
