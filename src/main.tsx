import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider, SidebarProvider } from '@/contexts';
import '@/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </ThemeProvider>
  </React.StrictMode>
);
