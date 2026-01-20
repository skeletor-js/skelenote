---
description: Generate a new React Context with provider and hooks
---

# Context Generation Skill

Generates a complete React Context following Skelenote patterns.

## Information Needed

1. **Context name** (e.g., "Filter", "Theme", "Preferences")
2. **State shape** - what data it holds
3. **Actions** - functions to modify state
4. **Initialization** - how state is initialized

## Generated Files

### Context File

`src/contexts/{ContextName}Context.tsx`:

```typescript
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  FC,
} from 'react';

// Types
interface ContextNameState {
  value1: string;
  value2: number;
}

interface ContextNameContextValue extends ContextNameState {
  setValue1: (value: string) => void;
  setValue2: (value: number) => void;
  reset: () => void;
}

// Context
const ContextNameContext = createContext<ContextNameContextValue | null>(null);

// Provider
interface ContextNameProviderProps {
  children: ReactNode;
}

export const ContextNameProvider: FC<ContextNameProviderProps> = ({ children }) => {
  const [value1, setValue1State] = useState<string>('');
  const [value2, setValue2State] = useState<number>(0);

  const setValue1 = useCallback((value: string) => {
    setValue1State(value);
  }, []);

  const setValue2 = useCallback((value: number) => {
    setValue2State(value);
  }, []);

  const reset = useCallback(() => {
    setValue1State('');
    setValue2State(0);
  }, []);

  const value = useMemo<ContextNameContextValue>(
    () => ({
      value1,
      value2,
      setValue1,
      setValue2,
      reset,
    }),
    [value1, value2, setValue1, setValue2, reset]
  );

  return (
    <ContextNameContext.Provider value={value}>
      {children}
    </ContextNameContext.Provider>
  );
};

// Hooks
export function useContextName(): ContextNameContextValue {
  const context = useContext(ContextNameContext);
  if (!context) {
    throw new Error('useContextName must be used within ContextNameProvider');
  }
  return context;
}

export function useContextNameSafe(): ContextNameContextValue | null {
  return useContext(ContextNameContext);
}
```

### Index Export

Update `src/contexts/index.ts`:
```typescript
export { ContextNameProvider, useContextName, useContextNameSafe } from './ContextNameContext';
```

## Example: FilterContext

### User provides:
- Name: Filter
- State: { searchQuery: string, typeFilter: string[], statusFilter: string | null }
- Actions: setSearchQuery, setTypeFilter, setStatusFilter, clearFilters

### Generated:

```typescript
// src/contexts/FilterContext.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  FC,
} from 'react';

interface FilterState {
  searchQuery: string;
  typeFilter: string[];
  statusFilter: string | null;
}

interface FilterContextValue extends FilterState {
  setSearchQuery: (query: string) => void;
  setTypeFilter: (types: string[]) => void;
  setStatusFilter: (status: string | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const initialState: FilterState = {
  searchQuery: '',
  typeFilter: [],
  statusFilter: null,
};

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: FC<FilterProviderProps> = ({ children }) => {
  const [searchQuery, setSearchQueryState] = useState(initialState.searchQuery);
  const [typeFilter, setTypeFilterState] = useState(initialState.typeFilter);
  const [statusFilter, setStatusFilterState] = useState(initialState.statusFilter);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  const setTypeFilter = useCallback((types: string[]) => {
    setTypeFilterState(types);
  }, []);

  const setStatusFilter = useCallback((status: string | null) => {
    setStatusFilterState(status);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQueryState(initialState.searchQuery);
    setTypeFilterState(initialState.typeFilter);
    setStatusFilterState(initialState.statusFilter);
  }, []);

  const hasActiveFilters = useMemo(
    () => searchQuery !== '' || typeFilter.length > 0 || statusFilter !== null,
    [searchQuery, typeFilter, statusFilter]
  );

  const value = useMemo<FilterContextValue>(
    () => ({
      searchQuery,
      typeFilter,
      statusFilter,
      setSearchQuery,
      setTypeFilter,
      setStatusFilter,
      clearFilters,
      hasActiveFilters,
    }),
    [
      searchQuery,
      typeFilter,
      statusFilter,
      setSearchQuery,
      setTypeFilter,
      setStatusFilter,
      clearFilters,
      hasActiveFilters,
    ]
  );

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

export function useFilter(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return context;
}

export function useFilterSafe(): FilterContextValue | null {
  return useContext(FilterContext);
}
```

## Steps

1. Ask user for context details
2. Read existing context patterns from `src/contexts/`
3. Generate context with:
   - State interface
   - Context value interface
   - Provider component with memoization
   - useX() hook (throws if outside provider)
   - useXSafe() hook (returns null if outside provider)
4. Add export to `src/contexts/index.ts`

## Pattern Notes

- Always memoize context value with `useMemo`
- Wrap all actions with `useCallback`
- Include all dependencies in memo/callback dependency arrays
- Provide both throwing and safe hook variants
- Use TypeScript strictly - no `any` types

## Where to Mount Providers

Add new providers in `src/App.tsx`:
```typescript
<NewProvider>
  <ExistingProviders>
    {/* ... */}
  </ExistingProviders>
</NewProvider>
```

Order matters for contexts that depend on each other.
