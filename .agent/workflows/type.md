---
description: Generate a new built-in type with property schemas and all required registrations
---

# Type Generation Skill

Generates a complete new built-in type for Skelenote objects (like Task, Note, Project).

## Information Needed

1. **Type name** (e.g., "Event", "Bookmark", "Contact")
2. **Icon name** from Lucide (e.g., "Calendar", "Bookmark", "User")
3. **Properties** with types:
   - Property name (camelCase)
   - Property type (text, number, boolean, date, select, multi-select, relation)
   - For select/multi-select: options list
   - For relation: target type

## Files Modified

### 1. `src/lib/types/built-in-types.ts`

Add to `BuiltInTypeIds` enum:
```typescript
export const BuiltInTypeIds = {
  // ... existing
  NEW_TYPE: 'built-in:new-type',
} as const;
```

Add TypeDefinition:
```typescript
const newTypeDefinition: TypeDefinition = {
  id: BuiltInTypeIds.NEW_TYPE,
  name: 'New Type',
  icon: 'icon-name',
  color: '#hexcolor',
  properties: [
    { id: 'property1', name: 'Property 1', type: 'text', required: false },
    // ... more properties
  ],
};
```

Register in `createTypeRegistry()`:
```typescript
registry.registerType(newTypeDefinition);
```

### 2. `src/lib/icons.ts`

Add icon mapping:
```typescript
import { IconName } from 'lucide-react';

export const typeIconMap: Record<string, LucideIcon> = {
  // ... existing
  [BuiltInTypeIds.NEW_TYPE]: IconName,
};
```

### 3. `src/hooks/useInbox.ts` (if needed)

Add to EXCLUDED_INBOX_TYPES if type shouldn't appear in inbox:
```typescript
const EXCLUDED_INBOX_TYPES = [
  BuiltInTypeIds.TAG,
  BuiltInTypeIds.PROJECT,
  BuiltInTypeIds.AREA,
  BuiltInTypeIds.NEW_TYPE, // Add if applicable
];
```

## Example: Adding "Event" Type

### User provides:
- Name: Event
- Icon: Calendar
- Properties:
  - startDate (date, required)
  - endDate (date)
  - location (text)
  - attendees (relation → Person, multi)
  - status (select: scheduled, completed, cancelled)

### Generated code:

```typescript
// In BuiltInTypeIds
EVENT: 'built-in:event',

// TypeDefinition
const eventDefinition: TypeDefinition = {
  id: BuiltInTypeIds.EVENT,
  name: 'Event',
  icon: 'Calendar',
  color: '#8B5CF6', // Purple
  properties: [
    { id: 'startDate', name: 'Start Date', type: 'date', required: true },
    { id: 'endDate', name: 'End Date', type: 'date', required: false },
    { id: 'location', name: 'Location', type: 'text', required: false },
    {
      id: 'attendees',
      name: 'Attendees',
      type: 'relation',
      required: false,
      config: { targetTypeId: BuiltInTypeIds.PERSON, multiple: true },
    },
    {
      id: 'status',
      name: 'Status',
      type: 'select',
      required: false,
      config: {
        options: [
          { value: 'scheduled', label: 'Scheduled', color: '#3B82F6' },
          { value: 'completed', label: 'Completed', color: '#22C55E' },
          { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
        ],
      },
    },
  ],
};
```

## Steps

1. Ask user for type details (name, icon, properties)
2. Read existing patterns from `src/lib/types/built-in-types.ts`
3. Generate type definition following existing patterns
4. Add to BuiltInTypeIds enum
5. Add to createTypeRegistry() registration
6. Add icon mapping in `src/lib/icons.ts`
7. Determine if should be excluded from inbox
8. Update CLAUDE.md with new type documentation if significant

## Property Type Reference

| Type | Config Options |
|------|----------------|
| text | maxLength |
| number | min, max |
| boolean | - |
| date | - |
| select | options: { value, label, color }[] |
| multi-select | options: { value, label, color }[] |
| relation | targetTypeId, multiple |

## Notes

- Follow existing color conventions (Ember, Sage, etc. from style guide)
- Use kebab-case for IDs, PascalCase for names
- Relations automatically enable backlinks
- Consider sidebar visibility for new types
