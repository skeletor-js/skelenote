# Phase 2: Data Layer & Object Model

## Objective
Implement the core object model with TypeScript types, Loro document structure, and CRUD operations for all built-in object types.

## Dependencies
- Phase 1: Loro integration and persistence foundation

## Key Deliverables
- [ ] Core `Object` and `TypeDefinition` TypeScript interfaces
- [ ] Built-in type definitions (Task, Note, Project, Meeting, Link, Tag)
- [ ] Property type system with validation
- [ ] Loro document schema for object storage
- [ ] CRUD operations (create, read, update, delete)
- [ ] Relation handling (storing object ID arrays)
- [ ] Backlink query utilities

## Technical Notes

### Object Schema (from PRD)
```typescript
interface Object {
  id: string;                              // UUID
  typeId: string;                          // references a TypeDefinition
  properties: Record<string, PropertyValue>;
  content?: LoroDoc;                       // rich text for types with hasContent
  inboxed: boolean;                        // true until explicitly processed
  createdAt: number;                       // Unix timestamp
  updatedAt: number;                       // Unix timestamp
}

type PropertyValue =
  | string
  | number
  | boolean
  | string[]                               // object IDs for relations
  | null;
```

### TypeDefinition Schema
```typescript
interface TypeDefinition {
  id: string;
  name: string;
  icon: string;                            // emoji
  schema: PropertyDefinition[];
  hasContent: boolean;
  isBuiltIn: boolean;
}

interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  required: boolean;
  multiple: boolean;
  config?: {
    options?: string[];                    // for select type
    targetTypeIds?: string[];              // for relation type
  };
}

type PropertyType =
  | 'text' | 'number' | 'date' | 'checkbox'
  | 'select' | 'relation' | 'url' | 'email' | 'phone' | 'file';
```

### Loro Document Structure
- Use Loro `LoroMap` for the root objects collection
- Each object stored as nested `LoroMap`
- Use `LoroText` for content when applicable
- Object IDs as keys for O(1) lookup

### Built-in Types to Define
1. **Task**: title, status, dueDate, priority, project, note, tags, recurrence
2. **Note**: title, date, isDailyNote, project, tags
3. **Project**: name, status, tags
4. **Link**: url, title, description, tags
5. **Meeting**: title, startTime, endTime, location, attendees, calendarEventId, project, tags
6. **Tag**: name, color, description

### Backlink Queries
Backlinks are computed, not stored:
- Query all objects where any relation property contains target ID
- Use Loro's query capabilities or in-memory filtering

## Files to Create/Modify
- `src/lib/types/object.ts` - Core object interfaces
- `src/lib/types/type-definition.ts` - Type system interfaces
- `src/lib/types/property.ts` - Property type definitions
- `src/lib/types/built-in-types.ts` - Task, Note, Project, etc. definitions
- `src/lib/loro/schema.ts` - Loro document structure
- `src/lib/loro/objects.ts` - CRUD operations
- `src/lib/loro/relations.ts` - Relation and backlink utilities
- `src/lib/loro/queries.ts` - Query helpers (filter, sort)

## Acceptance Criteria
- [ ] All built-in types defined with correct schemas
- [ ] Can create objects of any built-in type
- [ ] Can read, update, and delete objects
- [ ] Property validation enforces required fields
- [ ] Relation properties store and resolve object IDs
- [ ] Backlink queries return all objects referencing a given ID
- [ ] Objects persist across app restarts
- [ ] `inboxed` flag defaults to true on creation
- [ ] Timestamps auto-populate on create/update
