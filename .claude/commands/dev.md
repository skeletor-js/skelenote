---
description: Start development with pre-flight checks and dev server (project)
allowed-tools: Bash(pnpm exec tsc:*), Bash(pnpm install:*), Bash(pnpm tauri:*)
---

Start the development environment with pre-flight checks.

## Steps

1. Check TypeScript compiles:
```bash
pnpm exec tsc --noEmit
```
If errors, report them but continue.

2. Ensure dependencies are installed:
```bash
pnpm install
```

3. Start the Tauri development server:
```bash
pnpm tauri dev
```

The dev server will run in the background with hot reload enabled.

## What You Get

- **Frontend**: React dev server with hot module replacement (Vite)
- **Backend**: Rust/Tauri with auto-rebuild on changes
- **DevTools**: Available via Cmd+Option+I in the app window
