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
          <ObjectProvider>
            <SyncProvider>
              <NavigationProvider>
                <SidebarProvider>
                  <App />
                </SidebarProvider>
              </NavigationProvider>
            </SyncProvider>
          </ObjectProvider>
        </SkeletonKeyProvider>
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
