import React from 'react';
import ReactDOM from 'react-dom/client';
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
} from '@/contexts';
import { ToastContainer } from '@/components/ui';
import { migrateLocalStorageKeys } from '@/lib/migration';
import { initDevTestInterface } from '@/lib/semantic/dev-test';
import '@/styles/global.css';

// Migrate localStorage keys from legacy naming to skelenote
migrateLocalStorageKeys();

// Initialize semantic search dev tools (only in development mode)
initDevTestInterface();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <SkeletonKeyProvider>
          <DeviceRegistryProvider>
            <ObjectProvider>
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
            </ObjectProvider>
          </DeviceRegistryProvider>
        </SkeletonKeyProvider>
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
