# Code Quality Rules

## TypeScript Standards

- **Strict mode enabled** with `noUnusedLocals` and `noUnusedParameters`
- Use `@/` path alias for imports from `src/`:

  ```typescript
  import { useObjects } from '@/contexts';
  import { ObjectStore } from '@/lib/loro';
  ```

## UI Conventions

- **Mantine components** - Use Mantine for all UI (Button, Modal, Menu, etc.)
- **Lucide icons** - All icons via lucide-react, mapped in `src/lib/icons.ts`
- **No emojis** - Clean, minimal aesthetic
- **No pure black text** - Use Carbon `#18181B` instead

## Code Style

- Test files are co-located with source files using `.test.ts` or `.spec.ts` suffix
- BlockNote editor content stored as Loro Text at key `content:<objectId>`

## Before Merging (REQUIRED)

```bash
pnpm lint                  # ESLint
pnpm exec tsc --noEmit     # TypeScript
pnpm test:run              # Frontend tests
cd src-tauri && cargo test # Rust tests
```

Or use the `/check` skill to run all validations at once.

## Anti-Patterns to Avoid

- Storing editor content in object properties (use content Text structure)
- Calling `sync()` during imports (causes feedback loops)
- Assuming `getAll()` includes archived objects
- Expecting template changes to affect existing objects
- Storing backlinks (they're computed on demand)
