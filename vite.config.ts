/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Use jsdom for hooks and components tests
    environmentMatchGlobs: [
      ['src/hooks/**/*.test.ts', 'jsdom'],
      ['src/components/**/*.test.tsx', 'jsdom'],
    ],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/hooks/**/*.ts',
        'src/contexts/**/*.ts',
        'src/contexts/**/*.tsx',
      ],
      exclude: [
        'src/lib/**/*.test.ts',
        'src/lib/**/__tests__/**',
        'src/hooks/**/*.test.ts',
        'src/hooks/**/__tests__/**',
        'src/contexts/**/*.test.ts',
        'src/contexts/**/*.test.tsx',
        'src/contexts/**/__tests__/**',
        '**/index.ts',
      ],
    },
  },
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  // To make use of `TAURI_DEBUG` and other env variables
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Tauri doesn't support minification
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
