/**
 * Appearance Settings Panel
 *
 * Theme and display preferences.
 */

import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Box,
  SegmentedControl,
  Select,
  Divider,
} from '@mantine/core';
import { useTheme } from '@/contexts';
import { IconSelector } from '../IconSelector';

type ThemePreference = 'light' | 'dark' | 'system';
type DefaultView = 'inbox' | 'daily-notes' | 'search' | 'last-used';

const STORAGE_KEY_THEME_PREF = 'skelenote-theme-preference';
const STORAGE_KEY_DEFAULT_VIEW = 'skelenote-default-view';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
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
  const handleThemeChange = (value: string) => {
    const pref = value as ThemePreference;
    setThemePreference(pref);
    localStorage.setItem(STORAGE_KEY_THEME_PREF, pref);

    if (pref === 'system') {
      // Apply system preference
      const systemDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      setTheme(systemDark ? 'dark' : 'light');
    } else {
      setTheme(pref);
    }
  };

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
  const handleDefaultViewChange = (value: string | null) => {
    if (!value) return;
    const view = value as DefaultView;
    setDefaultView(view);
    localStorage.setItem(STORAGE_KEY_DEFAULT_VIEW, view);
  };

  return (
    <Stack gap="lg">
      <Box>
        <Text size="xl" fw={600} mb="xs">
          Appearance
        </Text>
        <Text size="sm" c="dimmed">
          Customize how Skelenote looks and feels.
        </Text>
      </Box>

      <Divider />

      {/* Theme Selection */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          Theme
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Choose your preferred color scheme.
        </Text>
        <SegmentedControl
          value={themePreference}
          onChange={handleThemeChange}
          radius="sm"
          data={[
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'System', value: 'system' },
          ]}
          fullWidth
        />
      </Box>

      {/* App Icon Selection */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          App Icon
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Choose your preferred app icon for the dock and launcher.
        </Text>
        <IconSelector />
      </Box>

      {/* Default View */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          Default View
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Choose which view opens when you launch the app.
        </Text>
        <Select
          value={defaultView}
          onChange={handleDefaultViewChange}
          data={[
            { value: 'inbox', label: 'Inbox' },
            { value: 'daily-notes', label: 'Daily Notes' },
            { value: 'search', label: 'Search' },
            { value: 'last-used', label: 'Last Used' },
          ]}
        />
      </Box>
    </Stack>
  );
}
