import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  ThemeProvider,
  SidebarProvider,
  NavigationProvider,
  ObjectProvider,
} from '@/contexts';
import '@/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ObjectProvider>
        <NavigationProvider>
          <SidebarProvider>
            <App />
          </SidebarProvider>
        </NavigationProvider>
      </ObjectProvider>
    </ThemeProvider>
  </React.StrictMode>
);
