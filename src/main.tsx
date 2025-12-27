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
} from '@/contexts';
import { ToastContainer } from '@/components/ui';
import { migrateFromEphemera } from '@/lib/migration';
import '@/styles/global.css';

// Migrate localStorage keys from old ephemera naming to skelenote
migrateFromEphemera();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ObjectProvider>
          <SyncProvider>
            <NavigationProvider>
              <SidebarProvider>
                <App />
              </SidebarProvider>
            </NavigationProvider>
          </SyncProvider>
        </ObjectProvider>
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
