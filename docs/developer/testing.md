# Testing Guide

This guide covers testing practices, patterns, and commands for the Skelenote codebase.

## Test Philosophy

### Testing Pyramid

Skelenote follows the testing pyramid approach:

1. **Unit Tests** (majority) - Test individual functions, utilities, and pure business logic
2. **Integration Tests** - Test module interactions, hooks with mocked contexts
3. **Component Tests** - Test React components with mocked dependencies
4. **E2E Tests** - Currently manual; future Playwright/Tauri integration

### What to Test

**Always test:**

- Pure functions (utilities, calculations, transformations)
- Business logic (recurrence calculations, search algorithms, CRDT operations)
- Data transformations (import/export, serialization)
- Custom hooks (state management, side effects)
- Component behavior (user interactions, conditional rendering)

**Test selectively:**

- UI styling (prefer visual regression in the future)
- Third-party library behavior (trust their tests)
- Generated code or trivial wrappers

**Skip testing:**

- Type definitions (TypeScript handles this)
- Constants and configuration
- One-line passthrough functions

### Test Isolation

- Each test should be independent and not rely on state from other tests
- Use `beforeEach` to reset mocks and state
- Avoid shared mutable state between tests
- Tests should pass in any order

## Running Tests

### Frontend Tests (Vitest)

```bash
# Run all tests in watch mode (development)
pnpm test

# Run all tests once (CI mode)
pnpm test:run

# Run tests with Vitest UI (visual test runner)
pnpm test:ui

# Run a specific test file
pnpm test -- src/lib/tasks/__tests__/recurrence.test.ts

# Run tests matching a pattern
pnpm test -- --grep "recurrence"

# Run tests with coverage
pnpm test:run --coverage
```

### Rust Tests (Cargo)

```bash
# Run all Rust tests
cd src-tauri && cargo test

# Show println! output during tests
cd src-tauri && cargo test -- --nocapture

# Run a specific test module
cd src-tauri && cargo test crypto::encryption

# Run with verbose output
cd src-tauri && cargo test -- --nocapture --test-threads=1
```

### Coverage

Frontend coverage uses Istanbul:

```bash
# Generate coverage report
pnpm test:run --coverage

# Coverage report locations:
# - Terminal: text summary
# - coverage/index.html: interactive HTML report
# - coverage/coverage-final.json: JSON for CI
```

Rust coverage with `cargo-tarpaulin` (install first):

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Run coverage
cd src-tauri && cargo tarpaulin --out Html
```

## Benchmark Suites

Performance benchmarks ensure critical operations remain fast. Run all benchmarks with:

```bash
pnpm bench
```

Or run individual benchmark files:

```bash
pnpm vitest bench src/lib/loro/__tests__/store.bench.ts
```

### Available Benchmark Suites

| Suite | File | What it Measures |
|-------|------|------------------|
| **ObjectStore** | `src/lib/loro/__tests__/store.bench.ts` | CRUD operations, bulk creation, query performance |
| **CRDT Merge** | `src/lib/loro/__tests__/store.bench.ts` | Loro document merge with 100-1000 objects |
| **Fuzzy Search** | `src/lib/search/__tests__/search.bench.ts` | Fuse.js indexing and query times (100-5000 items) |
| **Vector Index** | `src/lib/semantic/__tests__/vector.bench.ts` | Semantic search insert/search (100-5000 vectors) |
| **Task Recurrence** | `src/lib/tasks/__tests__/recurrence.bench.ts` | Next due date calculations |
| **Markdown Import** | `src/lib/import/__tests__/import.bench.ts` | Parsing and importing markdown files |
| **Markdown Export** | `src/lib/export/__tests__/export.bench.ts` | BlockNote to markdown conversion |
| **Templates** | `src/lib/templates/__tests__/templates.bench.ts` | Template queries and object creation |
| **Daily Notes** | `src/lib/daily/__tests__/daily.bench.ts` | Daily note ID generation and retrieval |
| **Sync Operations** | `src/lib/sync/__tests__/sync.bench.ts` | CRDT export, import, and merge |

### Writing Benchmarks

```typescript
import { bench, describe, beforeAll } from 'vitest';

describe('My Performance Tests', () => {
  let testData: SomeType;

  beforeAll(() => {
    // Setup test data ONCE before all benchmarks
    testData = generateTestData(1000);
  });

  bench('operation name', () => {
    // Code to benchmark - runs many times
    myFunction(testData);
  });

  bench('slow operation', () => {
    // For slow operations, limit iterations
    slowFunction();
  }, { iterations: 10 });
});
```

## Test Patterns

### Mocking Tauri Commands

Tauri commands are invoked via `@tauri-apps/api/core`. Mock the `invoke` function:

```typescript
// Mock setup
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

// In tests
describe('Device Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invoke crypto_encrypt', async () => {
    mockInvoke.mockResolvedValue('encrypted-data');

    const result = await encryptData('plaintext');

    expect(mockInvoke).toHaveBeenCalledWith('crypto_encrypt', {
      data: 'plaintext',
    });
    expect(result).toBe('encrypted-data');
  });
});
```

### Testing Custom Hooks

Use `@testing-library/react` with `renderHook`:

```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

// Mock dependencies
const mockStore = {
  getAll: vi.fn(),
  create: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useObjects: vi.fn(() => ({
    store: mockStore,
    isLoading: false,
    refreshData: vi.fn(),
  })),
}));

describe('useMyHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getAll.mockReturnValue([]);
  });

  it('should return items', () => {
    mockStore.getAll.mockReturnValue([{ id: '1', name: 'Test' }]);

    const { result } = renderHook(() => useMyHook());

    expect(result.current.items).toHaveLength(1);
  });

  it('should handle actions', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.createItem({ name: 'New' });
    });

    expect(mockStore.create).toHaveBeenCalled();
  });
});
```

### Testing React Components

Components need `MantineProvider` and jsdom environment:

```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MyComponent } from '../MyComponent';

// Mock matchMedia for Mantine
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MyComponent', () => {
  it('should render message', () => {
    renderWithProvider(<MyComponent message="Hello" />);
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('should handle click', async () => {
    const onClick = vi.fn();
    renderWithProvider(<MyComponent onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalled();
  });
});
```

### Testing Pure Functions

The simplest tests - no mocking needed:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateNextDueDate, parseRecurrence } from '../recurrence';

describe('parseRecurrence', () => {
  it('parses legacy string formats', () => {
    expect(parseRecurrence('daily')).toEqual({
      pattern: 'daily',
      interval: 1,
    });
  });

  it('returns null for invalid inputs', () => {
    expect(parseRecurrence('')).toBeNull();
    expect(parseRecurrence('invalid')).toBeNull();
  });
});

describe('calculateNextDueDate', () => {
  it('adds 1 day for daily recurrence', () => {
    const start = new Date('2024-01-01T10:00:00Z').getTime();
    const next = calculateNextDueDate(start, {
      pattern: 'daily',
      interval: 1,
    });
    expect(new Date(next).toISOString()).toBe('2024-01-02T10:00:00.000Z');
  });
});
```

### Testing with ObjectStore

Create isolated stores for testing data operations:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore } from '../objects';
import { createTypeRegistry, BuiltInTypeIds } from '../../types';
import { TaskType, NoteType } from '../../types/built-in-types';

function createTestStore(): ObjectStore {
  const doc = new LoroDoc();
  const registry = createTypeRegistry([TaskType, NoteType]);
  return new ObjectStore(doc, registry);
}

describe('ObjectStore', () => {
  let store: ObjectStore;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should create and retrieve objects', () => {
    store.create({
      id: 'task-1',
      typeId: BuiltInTypeIds.TASK,
      properties: { title: 'Test Task', status: 'todo' },
    });

    const task = store.get('task-1');
    expect(task?.properties.title).toBe('Test Task');
  });
});
```

## Integration Tests

### Testing Module Interactions

Integration tests verify multiple modules work together correctly:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore } from '@/lib/loro/objects';
import { createRelationHelper } from '@/lib/loro/relations';
import { registerBuiltInTypes, BuiltInTypeIds } from '@/lib/types';

describe('Relations Integration', () => {
  let store: ObjectStore;
  let helper: ReturnType<typeof createRelationHelper>;

  beforeEach(() => {
    const doc = new LoroDoc();
    store = new ObjectStore(doc);
    registerBuiltInTypes(store);
    helper = createRelationHelper(store, store.getTypeRegistry());
  });

  it('should find backlinks across multiple objects', () => {
    // Create a project
    store.create({
      id: 'project-1',
      typeId: BuiltInTypeIds.PROJECT,
      properties: { name: 'Project', status: 'active' },
    });

    // Create tasks that reference the project
    store.create({
      id: 'task-1',
      typeId: BuiltInTypeIds.TASK,
      properties: {
        title: 'Task 1',
        status: 'todo',
        project: ['project-1'],
      },
    });

    const backlinks = helper.findBacklinks('project-1');
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0].sourceId).toBe('task-1');
  });
});
```

### Testing CRDT Sync

Test that documents merge correctly:

```typescript
describe('CRDT Sync', () => {
  it('should merge concurrent edits', () => {
    const doc1 = new LoroDoc();
    const doc2 = new LoroDoc();

    const store1 = new ObjectStore(doc1);
    const store2 = new ObjectStore(doc2);
    registerBuiltInTypes(store1);
    registerBuiltInTypes(store2);

    // Each device creates objects
    store1.create({ id: 'a', typeId: BuiltInTypeIds.NOTE, properties: { title: 'A' } });
    store2.create({ id: 'b', typeId: BuiltInTypeIds.NOTE, properties: { title: 'B' } });

    // Exchange and merge
    const snapshot1 = doc1.export({ mode: 'snapshot' });
    const snapshot2 = doc2.export({ mode: 'snapshot' });
    doc1.import(snapshot2);
    doc2.import(snapshot1);

    // Both stores should have both objects
    expect(store1.get('a')).toBeDefined();
    expect(store1.get('b')).toBeDefined();
    expect(store2.get('a')).toBeDefined();
    expect(store2.get('b')).toBeDefined();
  });
});
```

## Writing Tests for New Features

### Checklist

When adding a new feature, create tests for:

1. **Core logic** - Pure function unit tests
2. **Edge cases** - Null inputs, empty arrays, boundary conditions
3. **Error handling** - Invalid inputs, failed operations
4. **Integration** - How it interacts with existing modules
5. **Performance** - Add benchmarks if the feature is performance-sensitive

### Test File Organization

Tests are co-located with source files:

```
src/lib/tasks/
  recurrence.ts              # Implementation
  __tests__/
    recurrence.test.ts       # Unit tests
    recurrence.bench.ts      # Benchmarks
```

Or alongside the file:

```
src/lib/import/
  markdown.ts                # Implementation
  markdown.test.ts           # Unit tests
```

### Naming Conventions

- Test files: `*.test.ts` or `*.spec.ts`
- Benchmark files: `*.bench.ts`
- Test directories: `__tests__/`

### Test Structure

Follow the Arrange-Act-Assert pattern:

```typescript
it('should calculate next due date correctly', () => {
  // Arrange - set up test data
  const startDate = new Date('2024-01-01').getTime();
  const recurrence = { pattern: 'weekly', interval: 1 };

  // Act - call the function under test
  const nextDate = calculateNextDueDate(startDate, recurrence);

  // Assert - verify the result
  expect(new Date(nextDate).toISOString()).toBe('2024-01-08T00:00:00.000Z');
});
```

### Test Descriptions

Write descriptive test names that explain the expected behavior:

```typescript
// Good
it('should return null when recurrence pattern is invalid')
it('should exclude archived objects from inbox')
it('should handle month-end clamping for Feb 30')

// Bad
it('works')
it('test recurrence')
it('handles edge case')
```

## Rust Test Patterns

### Unit Tests in Rust

Rust tests live in the same file as the implementation:

```rust
pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<EncryptedBlob, CryptoError> {
    // Implementation
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; 32] {
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        key
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = test_key();
        let plaintext = b"Hello, Skelenote!";

        let encrypted = encrypt(&key, plaintext).unwrap();
        let decrypted = decrypt(&key, &encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_wrong_key_fails() {
        let key1 = test_key();
        let key2 = test_key();
        let plaintext = b"Secret data";

        let encrypted = encrypt(&key1, plaintext).unwrap();
        let result = decrypt(&key2, &encrypted);

        assert!(result.is_err());
    }
}
```

### Testing Tauri Commands

Test the underlying functions, not the Tauri command wrappers:

```rust
// In lib.rs or the module
#[tauri::command]
pub fn crypto_encrypt(data: &str) -> Result<String, String> {
    encrypt_internal(data).map_err(|e| e.to_string())
}

// Test the internal function
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_internal() {
        let result = encrypt_internal("test").unwrap();
        assert!(!result.is_empty());
    }
}
```

## Environment Configuration

### Vitest Configuration

The test configuration in `vite.config.ts`:

```typescript
test: {
  globals: true,
  environment: 'node',              // Default to Node.js
  environmentMatchGlobs: [
    ['src/hooks/**/*.test.ts', 'jsdom'],      // Hooks need DOM
    ['src/components/**/*.test.tsx', 'jsdom'], // Components need DOM
  ],
  include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  coverage: {
    provider: 'istanbul',
    reporter: ['text', 'json', 'html'],
  },
}
```

### Per-File Environment Override

Use the magic comment at the top of files that need jsdom:

```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
// ... rest of test file
```

## Troubleshooting

### Common Issues

**"Cannot find module" errors:**

- Check path aliases (`@/`) are correctly resolved
- Verify the import path is correct

**"window is not defined":**

- Add `@vitest-environment jsdom` comment to the file
- Or add the file pattern to `environmentMatchGlobs`

**Mantine components fail to render:**

- Wrap with `MantineProvider`
- Mock `window.matchMedia` (see Component Testing section)

**Tauri invoke errors:**

- Mock `@tauri-apps/api/core` before importing modules that use it
- Clear mocks in `beforeEach`

**Tests hang or timeout:**

- Check for unresolved promises
- Ensure mocks return values (not `undefined`)
- Use `vi.useFakeTimers()` for time-dependent code

### Debugging Tests

```bash
# Run single test with verbose output
pnpm test -- --reporter=verbose src/lib/tasks/__tests__/recurrence.test.ts

# Run with console output visible
pnpm test -- --no-silent

# Debug in VS Code
# Add "vitest" launch configuration in .vscode/launch.json
```
