/**
 * AppearanceSettingsSheet - Mobile settings for theme and display preferences
 *
 * Features:
 * - Theme selector: Light/Dark/System
 * - Default view on startup selector
 * - Persists to localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  SegmentedControl,
  Select,
  Divider,
} from '@mantine/core';
import { Moon, Sun, Monitor, Layout } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useTheme } from '@/contexts';
import { useHaptics } from '@/hooks';

type ThemePreference = 'light' | 'dark' | 'system';
type DefaultView = 'inbox' | 'daily-notes' | 'tasks' | 'last-used';

const STORAGE_KEY_THEME_PREF = 'skelenote-theme-preference';
const STORAGE_KEY_DEFAULT_VIEW = 'skelenote-default-view';

interface AppearanceSettingsSheetProps {
  opened: boolean;
  onClose: () => void;
}

export function AppearanceSettingsSheet({
  opened,
  onClose,
}: AppearanceSettingsSheetProps) {
  const { theme, setTheme } = useTheme();
  const haptics = useHaptics();

  const [themePreference, setThemePreference] =
    useState<ThemePreference>('light');
  const [defaultView, setDefaultView] = useState<DefaultView>('inbox');

  // Initialize from localStorage
  useEffect(() => {
    const storedPref = localStorage.getItem(
      STORAGE_KEY_THEME_PREF
    ) as ThemePreference | null;
    if (storedPref && ['light', 'dark', 'system'].includes(storedPref)) {
      setThemePreference(storedPref);
    } else {
      // Infer from current theme
      setThemePreference(theme);
    }

    const storedView = localStorage.getItem(
      STORAGE_KEY_DEFAULT_VIEW
    ) as DefaultView | null;
    if (storedView) {
      setDefaultView(storedView);
    }
  }, [theme]);

  // Handle theme preference change
  const handleThemeChange = useCallback(
    (value: string) => {
      const pref = value as ThemePreference;
      setThemePreference(pref);
      localStorage.setItem(STORAGE_KEY_THEME_PREF, pref);
      haptics.selection();

      if (pref === 'system') {
        // Apply system preference
        const systemDark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
        setTheme(systemDark ? 'dark' : 'light');
      } else {
        setTheme(pref);
      }
    },
    [setTheme, haptics]
  );

  // Listen for system theme changes when 'system' is selected
  useEffect(() => {
    if (themePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference, setTheme]);

  // Handle default view change
  const handleDefaultViewChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const view = value as DefaultView;
      setDefaultView(view);
      localStorage.setItem(STORAGE_KEY_DEFAULT_VIEW, view);
      haptics.selection();
    },
    [haptics]
  );

  // Get icon for current theme
  const ThemeIcon =
    themePreference === 'system'
      ? Monitor
      : themePreference === 'dark'
        ? Moon
        : Sun;

  return (
    <BottomSheet title="Appearance" opened={opened} onClose={onClose} size="md">
      <Stack gap="lg" px="md" pb="xl">
        {/* Theme Selection */}
        <Box>
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <ThemeIcon
              size={18}
              style={{ color: 'var(--mantine-color-gray-6)' }}
            />
            <Text size="sm" fw={500}>
              Theme
            </Text>
          </Box>
          <Text size="xs" c="dimmed" mb="sm">
            Choose your preferred color scheme
          </Text>
          <SegmentedControl
            value={themePreference}
            onChange={handleThemeChange}
            radius="sm"
            size="sm"
            data={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'System', value: 'system' },
            ]}
            fullWidth
          />
        </Box>

        <Divider />

        {/* Default View */}
        <Box>
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Layout
              size={18}
              style={{ color: 'var(--mantine-color-gray-6)' }}
            />
            <Text size="sm" fw={500}>
              Default View
            </Text>
          </Box>
          <Text size="xs" c="dimmed" mb="sm">
            Which view opens when you launch the app
          </Text>
          <Select
            value={defaultView}
            onChange={handleDefaultViewChange}
            data={[
              { value: 'inbox', label: 'Inbox' },
              { value: 'daily-notes', label: 'Daily Notes' },
              { value: 'tasks', label: 'Tasks' },
              { value: 'last-used', label: 'Last Used' },
            ]}
            size="md"
          />
        </Box>
      </Stack>
    </BottomSheet>
  );
}
