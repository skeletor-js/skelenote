---
name: test-file
description: Generate a test file for a component, hook, or utility
---

# Test File Skill

Generates test file scaffolding matching project conventions.

## Information Needed

1. **Target File** - Path to the file to test
2. **Test Type** (optional) - unit or integration (default: auto-detect)

## Generated File

Co-located with source file as `{filename}.test.ts` or `{filename}.test.tsx`.

## Steps

1. Read the target file to understand:
   - Exports (functions, components, hooks)
   - Dependencies and imports
   - Logic that needs testing

2. Determine test type:
   - **Integration**: ObjectStore, sync, business logic (P0-P2)
   - **Unit**: UI components, utilities, hooks (P3-P5)

3. Generate test file with appropriate mocks

## Test File Templates

### Component Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentName } from './ComponentName';

// Mock contexts
vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    dataVersion: 1,
    refreshData: vi.fn(),
  }),
  useNavigation: () => ({
    navigate: vi.fn(),
  }),
}));

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    render(<ComponentName />);
    fireEvent.click(screen.getByRole('button'));
    // Assert expected behavior
  });
});
```

### Hook Test

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHookName } from './useHookName';

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    dataVersion: 1,
    refreshData: vi.fn(),
  }),
}));

describe('useHookName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns expected initial state', () => {
    const { result } = renderHook(() => useHookName());
    expect(result.current.value).toBe(expected);
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => useHookName());
    act(() => {
      result.current.setValue('new value');
    });
    expect(result.current.value).toBe('new value');
  });
});
```

### Utility Test

```typescript
import { describe, it, expect } from 'vitest';
import { utilityFunction } from './utility';

describe('utilityFunction', () => {
  it('handles normal input', () => {
    expect(utilityFunction('input')).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(utilityFunction('')).toBe('');
    expect(utilityFunction(null)).toBeNull();
  });

  it('throws on invalid input', () => {
    expect(() => utilityFunction(undefined)).toThrow();
  });
});
```

### Integration Test (ObjectStore)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LoroDocStore } from '@/lib/loro/LoroDocStore';
import { ObjectStore } from '@/lib/loro/ObjectStore';
import { registerBuiltInTypes } from '@/lib/types/built-in-types';

describe('Feature Integration', () => {
  let store: ObjectStore;

  beforeEach(() => {
    const docStore = new LoroDocStore();
    store = new ObjectStore(docStore.doc);
    registerBuiltInTypes(store);
  });

  it('creates and retrieves objects', () => {
    const obj = store.create({
      typeId: 'built-in:task',
      properties: { title: 'Test Task' },
    });

    expect(store.get(obj.id)).toBeDefined();
    expect(store.get(obj.id)?.properties.title).toBe('Test Task');
  });
});
```

## Mock Patterns

**Mock at boundaries only:**

```typescript
// Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// File system
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));
```

**Use real implementations for:**

- React contexts (wrap in provider)
- ObjectStore operations
- Business logic functions

## Notes

- Test files co-located with source
- Use `.test.ts` or `.test.tsx` suffix
- Run with `pnpm test` (watch) or `pnpm test:run` (CI)
- Mock Tauri APIs, use real business logic
