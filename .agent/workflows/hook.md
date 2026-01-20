---
description: Generate a custom React hook with proper memoization
---

# Hook Generation Skill

Generates a custom React hook following Skelenote patterns.

## Information Needed

1. **Hook name** (starts with "use", e.g., `useTaskFilters`, `usePinnedObjects`)
2. **Purpose** - what the hook does
3. **Dependencies** - what contexts/data it needs
4. **Return value** - what it provides

## Generated File

`src/hooks/use{HookName}.ts`:

```typescript
import { useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';

export interface UseHookNameReturn {
  data: SomeType[];
  action1: () => void;
  action2: (param: string) => void;
  isLoading: boolean;
}

export function useHookName(): UseHookNameReturn {
  const { store, dataVersion, refreshData } = useObjects();

  // Derived data with useMemo
  const data = useMemo(() => {
    return store.getAll().filter(/* ... */);
  }, [store, dataVersion]);

  // Actions with useCallback
  const action1 = useCallback(() => {
    // Implementation
    refreshData();
  }, [refreshData]);

  const action2 = useCallback((param: string) => {
    // Implementation
    refreshData();
  }, [refreshData]);

  return {
    data,
    action1,
    action2,
    isLoading: false,
  };
}
```

## Example: usePinnedObjects

### User provides:
- Name: usePinnedObjects
- Purpose: Get and manage pinned objects
- Dependencies: ObjectContext
- Returns: { pinnedObjects, pin, unpin, isPinned }

### Generated:

```typescript
// src/hooks/usePinnedObjects.ts
import { useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';
import { SkelenoteObject } from '@/lib/loro';

export interface UsePinnedObjectsReturn {
  pinnedObjects: SkelenoteObject[];
  pin: (objectId: string) => void;
  unpin: (objectId: string) => void;
  isPinned: (objectId: string) => boolean;
  togglePin: (objectId: string) => void;
}

export function usePinnedObjects(): UsePinnedObjectsReturn {
  const { store, dataVersion, refreshData } = useObjects();

  const pinnedObjects = useMemo(() => {
    return store.getAll().filter((obj) => obj.pinned);
  }, [store, dataVersion]);

  const pinnedIds = useMemo(
    () => new Set(pinnedObjects.map((obj) => obj.id)),
    [pinnedObjects]
  );

  const pin = useCallback(
    (objectId: string) => {
      store.update(objectId, { pinned: true });
      refreshData();
    },
    [store, refreshData]
  );

  const unpin = useCallback(
    (objectId: string) => {
      store.update(objectId, { pinned: false });
      refreshData();
    },
    [store, refreshData]
  );

  const isPinned = useCallback(
    (objectId: string) => pinnedIds.has(objectId),
    [pinnedIds]
  );

  const togglePin = useCallback(
    (objectId: string) => {
      if (isPinned(objectId)) {
        unpin(objectId);
      } else {
        pin(objectId);
      }
    },
    [isPinned, pin, unpin]
  );

  return {
    pinnedObjects,
    pin,
    unpin,
    isPinned,
    togglePin,
  };
}
```

## Steps

1. Ask user for hook details
2. Read existing hook patterns from `src/hooks/`
3. Identify required context dependencies
4. Generate hook with:
   - TypeScript return interface
   - useMemo for derived data
   - useCallback for all actions
   - Proper dependency arrays
5. Add export to `src/hooks/index.ts` if exists

## Common Patterns

### Reading from ObjectContext
```typescript
const { store, dataVersion, refreshData } = useObjects();

// Always include dataVersion in dependencies for derived data
const items = useMemo(() => {
  return store.getAll();
}, [store, dataVersion]);
```

### Mutations
```typescript
const update = useCallback((id: string, data: Partial<SomeType>) => {
  store.update(id, { properties: data });
  refreshData(); // Always call after mutations
}, [store, refreshData]);
```

### With Navigation
```typescript
import { useNavigation } from '@/contexts';

const { navigateTo, currentView } = useNavigation();
```

### With Filtering
```typescript
const filteredItems = useMemo(() => {
  return items.filter((item) => {
    if (filter && item.type !== filter) return false;
    if (search && !item.title.includes(search)) return false;
    return true;
  });
}, [items, filter, search]);
```

## Testing Hook

`src/hooks/useHookName.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useHookName } from './useHookName';

// Mock contexts as needed
vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    dataVersion: 1,
    refreshData: vi.fn(),
  }),
}));

describe('useHookName', () => {
  it('returns expected data', () => {
    const { result } = renderHook(() => useHookName());
    expect(result.current.data).toEqual([]);
  });
});
```

## Notes

- Hooks should be pure - no side effects outside callbacks
- Always memoize expensive computations
- Return stable references (useCallback, useMemo) to prevent rerenders
- Document dependencies clearly
- Consider providing both hook and direct function if logic is reusable
