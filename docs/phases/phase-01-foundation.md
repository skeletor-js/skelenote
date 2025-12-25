# Phase 1: Foundation & Project Setup

## Objective
Establish the core development environment with Tauri 2.0, React, TypeScript, and Loro CRDT integration to create a functional desktop app shell.

## Dependencies
- None (first phase)

## Key Deliverables
- [ ] Tauri 2.0 project scaffolding with Rust backend
- [ ] React + TypeScript + Vite frontend setup
- [ ] Loro CRDT library integration
- [ ] Basic app window with native chrome
- [ ] Development tooling (ESLint, Prettier, TypeScript config)
- [ ] Hot reload working for frontend development

## Technical Notes

### Tauri 2.0 Setup
- Use `create-tauri-app` with React + TypeScript template
- Configure for macOS, Windows, and Linux builds
- Set up Tauri commands for Rust ↔ TypeScript communication
- Window configuration: resizable, min-size 800x600

### Frontend Stack
- Vite for fast development builds
- React 18+ with hooks
- TypeScript in strict mode
- Path aliases for clean imports (`@/components`, `@/lib`, etc.)

### Loro Integration
- Install `loro-crdt` package
- Create basic LoroDoc wrapper for document management
- Set up persistence to local file system via Tauri FS API
- Prepare structure for object storage

### Project Structure
```
src/
├── App.tsx              # Root component
├── main.tsx             # Entry point
├── lib/
│   └── loro/            # Loro CRDT utilities
├── components/          # React components
└── styles/              # Global styles
src-tauri/
├── src/
│   └── main.rs          # Tauri entry point
└── tauri.conf.json      # Tauri configuration
```

## Files to Create/Modify
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `src-tauri/tauri.conf.json` - Tauri app configuration
- `src-tauri/Cargo.toml` - Rust dependencies
- `src-tauri/src/main.rs` - Tauri entry point
- `src/main.tsx` - React entry point
- `src/App.tsx` - Root component
- `src/lib/loro/store.ts` - Loro document management

## Acceptance Criteria
- [ ] `npm run tauri dev` launches app window with React content
- [ ] Hot reload works for frontend changes
- [ ] Loro document can be created and persisted to disk
- [ ] App builds successfully for macOS (dev machine)
- [ ] TypeScript compiles without errors
- [ ] Basic Tauri command can be invoked from React
