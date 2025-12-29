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
} from '@/contexts';
import { ToastContainer } from '@/components/ui';
import { migrateLocalStorageKeys } from '@/lib/migration';
import '@/styles/global.css';

// Migrate localStorage keys from legacy naming to skelenote
migrateLocalStorageKeys();

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
                      <App />
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
