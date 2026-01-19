import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import posthog from 'posthog-js';
import { AnalyticsEvents } from '@/lib/analytics';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Props passed to render function for Mantine integration
 */
interface ThemeRenderProps {
  colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'skelenote-theme';

function getInitialTheme(): Theme {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    // Fall back to OS preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }

  return 'light';
}

interface ThemeProviderProps {
  /** Children can be ReactNode or render function for Mantine integration */
  children: ReactNode | ((props: ThemeRenderProps) => ReactNode);
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Track theme change
    try {
      if (posthog.__loaded && !posthog.has_opted_out_capturing()) {
        posthog.capture(AnalyticsEvents.THEME_CHANGED, { new_theme: newTheme });
      }
    } catch {
      // Silently fail if analytics is not available
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      // Track theme change
      try {
        if (posthog.__loaded && !posthog.has_opted_out_capturing()) {
          posthog.capture(AnalyticsEvents.THEME_CHANGED, {
            new_theme: newTheme,
          });
        }
      } catch {
        // Silently fail if analytics is not available
      }
      return newTheme;
    });
  };

  // Support render prop pattern for Mantine integration
  const renderContent = () => {
    if (typeof children === 'function') {
      return children({ colorScheme: theme });
    }
    return children;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {renderContent()}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
