import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  ThemeProvider,
  SidebarProvider,
  NavigationProvider,
  ObjectProvider,
  SyncProvider,
} from '@/contexts';
import '@/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ObjectProvider>
        <SyncProvider>
          <NavigationProvider>
            <SidebarProvider>
              <App />
            </SidebarProvider>
          </NavigationProvider>
        </SyncProvider>
      </ObjectProvider>
    </ThemeProvider>
  </React.StrictMode>
);
