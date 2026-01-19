import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';
import {
  ThemeProvider,
  SidebarProvider,
  NavigationProvider,
  ObjectProvider,
  SyncProvider,
  ToastProvider,
  SkeletonKeyProvider,
  LocalSyncProvider,
  DeviceRegistryProvider,
  KeyboardShortcutsProvider,
  SemanticSearchProvider,
  UndoProvider,
  AnalyticsProvider,
} from '@/contexts';
import { ToastContainer } from '@/components/ui';
import { migrateLocalStorageKeys } from '@/lib/migration';
import { initDevTestInterface } from '@/lib/semantic/dev-test';
import { theme } from '@/theme/mantine';

// Mantine styles
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

// App global styles (fonts, minimal overrides)
import '@/styles/global.css';

// Mantine component overrides (CSS selectors not supported in styles API)
import '@/styles/mantine-overrides.css';

// Migrate localStorage keys from legacy naming to skelenote
migrateLocalStorageKeys();

// Initialize semantic search dev tools (only in development mode)
initDevTestInterface();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      {({ colorScheme }) => (
        <MantineProvider
          theme={theme}
          defaultColorScheme={colorScheme}
          forceColorScheme={colorScheme}
        >
          <Notifications position="top-right" />
          <ToastProvider>
            <AnalyticsProvider>
              <SkeletonKeyProvider>
                <DeviceRegistryProvider>
                  <ObjectProvider>
                    <UndoProvider>
                      <SemanticSearchProvider>
                        <LocalSyncProvider>
                          <SyncProvider>
                            <NavigationProvider>
                              <SidebarProvider>
                                <KeyboardShortcutsProvider>
                                  <App />
                                </KeyboardShortcutsProvider>
                              </SidebarProvider>
                            </NavigationProvider>
                          </SyncProvider>
                        </LocalSyncProvider>
                      </SemanticSearchProvider>
                    </UndoProvider>
                  </ObjectProvider>
                </DeviceRegistryProvider>
              </SkeletonKeyProvider>
            </AnalyticsProvider>
            <ToastContainer />
          </ToastProvider>
        </MantineProvider>
      )}
    </ThemeProvider>
  </React.StrictMode>
);
