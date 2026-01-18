/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    sourcemap: true,
    // Use jsdom for hooks and components tests
    environmentMatchGlobs: [
      ['src/hooks/**/*.test.ts', 'jsdom'],
      ['src/components/**/*.test.tsx', 'jsdom'],
    ],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/hooks/**/*.ts',
        'src/contexts/**/*.ts',
        'src/contexts/**/*.tsx',
        'src/components/**/*.tsx',
      ],
      exclude: [
        'src/lib/**/*.test.ts',
        'src/lib/**/__tests__/**',
        'src/hooks/**/*.test.ts',
        'src/hooks/**/__tests__/**',
        'src/contexts/**/*.test.ts',
        'src/contexts/**/*.test.tsx',
        'src/contexts/**/__tests__/**',
        'src/components/**/*.test.tsx',
        'src/components/**/__tests__/**',
        '**/index.ts',
        // Dev utilities and platform shims (not worth testing)
        'src/lib/semantic/dev-test.ts',
        'src/hooks/biometric-loader.ts',
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
