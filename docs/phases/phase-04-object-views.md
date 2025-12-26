
# Phase 4: Object Views & Editor

## Objective
Build the Universal Object Detail View with BlockNote editor integration, property editors for all property types, object mentions, and the backlinks section.

## Dependencies
- Phase 2: Object model and CRUD operations
- Phase 3: Design system and layout components

## Key Deliverables
- [ ] Universal Object Detail View component
- [ ] BlockNote editor integration with Loro persistence
- [ ] Property editors for all property types
- [ ] Object mention system (`@` trigger)
- [ ] Relation property chips with navigation
- [ ] Backlinks section (collapsible, includes @-mentions and relations)
- [ ] Inline title editing

## Technical Notes

### Universal Object View Layout (from PRD)
```
┌─────────────────────────────────────────────────────────┐
│  [icon] Title                                  [Edit]   │
├─────────────────────────────────────────────────────────┤
│  [Properties rendered based on type schema]             │
│  Status: Active        Tags: #work, #q1                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Content area - BlockNote editor]                      │
│  (Only shown if type.hasContent = true)                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Backlinks (3)                          [▼ collapse]    │
│  ─────────────────────────────────────────────────────  │
│  ✓ Task that has this as project        via Project     │
│  📝 Note that @mentions this object     via Content     │
└─────────────────────────────────────────────────────────┘
```

Note: Tasks linked to an object appear in the Backlinks section (e.g., a Task with this Project in its "project" relation will show as a backlink). This simplifies the UI while maintaining discoverability.

### BlockNote Integration
- Install `@blocknote/core` and `@blocknote/react`
- Configure with blocks: paragraph, headings (H1-H3), bullet/numbered/check lists, code blocks, blockquotes, images, tables
- Persist content to Loro using `editor.document` serialization
- Load content from Loro on mount

### Object Mentions
- Custom `SuggestionMenuController` with `triggerCharacter="@"`
- Query all objects for suggestions
- Filter by name as user types
- Insert styled mention chip on selection
- Store mention as relation in parent object

### Property Editors by Type
| Type | Editor Component |
|------|------------------|
| text | Single-line input |
| number | Number input |
| date | Date picker |
| checkbox | Toggle/checkbox |
| select | Dropdown menu |
| relation | Multi-select with object search |
| url | URL input with link preview |
| email | Email input |
| phone | Phone input |
| file | File picker (deferred upload) |

### Relation Display
- Show as chips with object icon + name
- Click to navigate to related object
- "×" button to remove relation
- "+ Add" to open relation picker

### Backlinks Section
- Query all objects where any relation contains current object ID
- Also scan content for @-mentions referencing current object
- Show source property name (e.g., "via Project", "via Content")
- Collapsed by default with count in header
- Click to navigate

## Files to Create/Modify
- `src/components/object/ObjectDetailView.tsx` - Main detail view
- `src/components/object/ObjectHeader.tsx` - Icon, title, edit mode
- `src/components/object/PropertyList.tsx` - Property display/edit
- `src/components/object/PropertyEditor.tsx` - Editor router by type
- `src/components/object/editors/TextInput.tsx`
- `src/components/object/editors/NumberInput.tsx`
- `src/components/object/editors/DatePicker.tsx`
- `src/components/object/editors/Checkbox.tsx`
- `src/components/object/editors/Select.tsx`
- `src/components/object/editors/RelationPicker.tsx`
- `src/components/object/editors/UrlInput.tsx`
- `src/components/object/Backlinks.tsx` - Backlinks section (includes relations and @-mentions)
- `src/components/editor/Editor.tsx` - BlockNote wrapper
- `src/components/editor/MentionSuggestion.tsx` - @ mention menu
- `src/lib/editor/schema.ts` - BlockNote configuration
- `src/lib/editor/persistence.ts` - Loro ↔ BlockNote sync

## Acceptance Criteria
- [ ] Object detail view renders for any object type
- [ ] Title is editable inline
- [ ] All property types have working editors
- [ ] BlockNote editor loads and saves content
- [ ] `@` triggers mention menu with object search
- [ ] Mentions insert as styled chips
- [ ] Relations display as clickable chips
- [ ] Backlinks section shows all referencing objects (via relations and @-mentions)
- [ ] Backlinks are collapsible with count in header
