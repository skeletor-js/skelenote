---
name: dev
description: Start development with pre-flight checks and dev server
---

# Dev Skill

Starts the development environment with pre-flight checks to catch issues early.

## Steps

1. Check TypeScript compiles:
```bash
pnpm exec tsc --noEmit
```
If errors, report them but continue (dev server will also show them).

2. Ensure dependencies are installed:
```bash
pnpm install
```

3. Start the Tauri development server:
// turbo
```bash
pnpm tauri dev
```

The dev server will run in the background with hot reload enabled.

## What You Get

- **Frontend**: React dev server with hot module replacement (Vite)
- **Backend**: Rust/Tauri with auto-rebuild on changes
- **DevTools**: Available via Cmd+Option+I in the app window

## Common Issues

### TypeScript Errors
If `tsc --noEmit` shows errors, review and fix them before continuing.
The dev server will still run, but the app may not work correctly.

### Missing Dependencies
If you see import errors, run `pnpm install` manually.

### Rust Build Failures
Check the terminal output for Rust compilation errors.
May need to run `cd src-tauri && cargo build` to see full errors.

## Example Output

```
✓ TypeScript compiles cleanly
✓ Dependencies installed

Starting Tauri dev server...
   Compiling skelenote v0.1.0
    Finished dev [unoptimized + debuginfo] target
        Info Watching for changes...

App window should open shortly.
DevTools: Cmd+Option+I
```
