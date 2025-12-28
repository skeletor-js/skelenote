# Templates

> Reusable object templates with properties + content for consistent, efficient object creation.

---

## 1. Overview

Templates enable users to define reusable blueprints for new objects, complete with pre-configured properties and content blocks. When creating a new object, users can select a template to instantly populate the object with default values and structured content, including dynamic placeholders that expand at creation time.

**User Value:**
- Eliminate repetitive setup when creating similar objects (meeting notes, project specs, daily journals)
- Ensure consistency across objects of the same purpose
- Speed up object creation with pre-filled properties and content structure
- Support dynamic content via placeholders like `{{date}}`, `{{title}}`, `{{tomorrow}}`
- Auto-apply templates to daily notes for consistent journaling workflows

---

## 2. Goals

### Primary Goals
- Store templates as first-class objects with `isTemplate: true` flag
- Support default property values in templates
- Support content blocks with placeholder expansion
- Integrate template selection into object creation flow
- Enable daily note template auto-application

### Success Criteria
- Users can create, edit, and delete templates
- "Create from template" option available in type selector and command palette
- All placeholders expand correctly at object creation time
- Daily notes automatically apply designated template content
- Templates sync correctly across devices via existing Loro infrastructure

### Non-Goals
- Nested templates (templates referencing other templates)
- Template versioning or history
- Template sharing/export (future consideration)
- Computed/formula properties in templates

---

## 3. User Stories

**As a meeting organizer**, I want to create a Meeting template with agenda sections and attendee properties so that every meeting note starts with a consistent structure.

**As a daily journaler**, I want my daily notes to automatically include gratitude prompts, a "Today I learned" section, and links to yesterday's note so that I maintain my journaling habit with minimal friction.

**As a project manager**, I want a Project Kickoff template with pre-defined properties (status, deadline, stakeholders) and content sections (goals, milestones, risks) so that new projects are set up consistently.

**As a researcher**, I want a Literature Note template with properties for source URL, author, and publication date, plus content sections for summary and key takeaways so that I capture information uniformly.

**As a power user**, I want to quickly access my templates via keyboard shortcut or command palette so that template-based creation is as fast as regular object creation.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Template Storage (Loro Document)                           │
│  ├── Objects with isTemplate: true                          │
│  ├── Template properties: default values for target type    │
│  └── Template content: BlockNote JSON with placeholders     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  TemplateManager (src/lib/templates/manager.ts)             │
│  ├── getTemplates() - list all templates                    │
│  ├── getTemplatesForType(typeId) - filter by target type    │
│  ├── createFromTemplate(templateId) - instantiate object    │
│  ├── expandPlaceholders(content, context) - process {{...}} │
│  └── getDailyNoteTemplate() - get configured daily template │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Object Creation Flow                                        │
│  ├── TypeSelector: shows "From Template" option              │
│  ├── TemplatePicker: lists available templates               │
│  └── ObjectStore.create(): receives expanded properties/     │
│      content from TemplateManager                            │
└─────────────────────────────────────────────────────────────┘
```

### Template Storage Model

Templates are stored as regular `SkelenoteObject` instances with additional template-specific properties:

```typescript
// Template object structure (stored in Loro)
interface TemplateObject extends SkelenoteObject {
  properties: {
    title: string;              // Template name
    targetTypeId: string;       // Type this template creates
    isTemplate: true;           // Template marker
    isDailyNoteTemplate?: boolean; // Auto-apply to daily notes
    templateProperties: string; // JSON: default property values
  };
  hasContent: true;             // Content = template body with placeholders
}

// Deserialized template properties (for creation)
interface TemplateProperties {
  [propertyId: string]: PropertyValue;
}
```

### Template Type Definition

```typescript
// src/lib/templates/types.ts

export interface Template {
  id: string;
  name: string;
  targetTypeId: string;
  defaultProperties: Record<string, PropertyValue>;
  contentBlocks: BlockArray;
  isDailyNoteTemplate: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlaceholderContext {
  date: Date;
  title?: string;
  customValues?: Record<string, string>;
}

export type PlaceholderType =
  | 'date'           // Current date: "December 27, 2025"
  | 'date_short'     // Short date: "2025-12-27"
  | 'title'          // Object title (from properties)
  | 'time'           // Current time: "3:45 PM"
  | 'tomorrow'       // Tomorrow's date
  | 'yesterday'      // Yesterday's date
  | 'week'           // Current week number
  | 'month'          // Current month name
  | 'year';          // Current year
```

### Placeholder System

Placeholders use double-brace syntax and are expanded at object creation time:

| Placeholder | Description | Example Output |
|-------------|-------------|----------------|
| `{{date}}` | Current date, long format | December 27, 2025 |
| `{{date_short}}` | Current date, ISO format | 2025-12-27 |
| `{{title}}` | Object title property | Meeting: Q1 Planning |
| `{{time}}` | Current time | 3:45 PM |
| `{{tomorrow}}` | Tomorrow's date | December 28, 2025 |
| `{{yesterday}}` | Yesterday's date | December 26, 2025 |
| `{{week}}` | ISO week number | Week 52 |
| `{{month}}` | Current month name | December |
| `{{year}}` | Current year | 2025 |

Placeholder expansion occurs in both:
1. **Content blocks**: Text within BlockNote content JSON
2. **Property values**: Text and URL property defaults

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/templates/types.ts` | Template and placeholder TypeScript types |
| `src/lib/templates/manager.ts` | Template CRUD and expansion logic |
| `src/lib/templates/placeholders.ts` | Placeholder parsing and expansion |
| `src/components/templates/TemplateEditor.tsx` | Template creation/editing UI |
| `src/components/templates/TemplatePicker.tsx` | Template selection modal |
| `src/components/templates/TemplateList.tsx` | Template management list view |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types/built-in-types.ts` | Add `template` built-in type definition |
| `src/lib/loro/objects.ts` | Add template filtering methods to ObjectStore |
| `src/components/capture/TypeSelector.tsx` | Add "From Template" option |
| `src/components/capture/CaptureForm.tsx` | Integrate template selection |
| `src/lib/daily/daily-notes.ts` | Apply daily note template on creation |
| `src/components/palette/actions.ts` | Add "Create from Template" command |
| `src/components/settings/SettingsView.tsx` | Add template settings section |

---

## 5. Implementation Steps

1. **Define template types** (`src/lib/templates/types.ts`)
   - Define `Template` interface
   - Define `PlaceholderContext` interface
   - Define placeholder type enumeration
   - Export type guards and utilities

2. **Implement placeholder system** (`src/lib/templates/placeholders.ts`)
   - Implement `expandPlaceholders(content, context)` function
   - Support all defined placeholder types
   - Handle nested placeholders in BlockNote content JSON
   - Gracefully handle unknown placeholders (leave as-is or remove)

3. **Create TemplateManager** (`src/lib/templates/manager.ts`)
   - Implement `getTemplates()` to list all template objects
   - Implement `getTemplatesForType(typeId)` for filtered listing
   - Implement `createFromTemplate(templateId, overrides?)` for instantiation
   - Implement `getDailyNoteTemplate()` for daily note integration
   - Implement `setDailyNoteTemplate(templateId)` for configuration

4. **Add template type to built-in types** (`src/lib/types/built-in-types.ts`)
   - Define `template` type with appropriate schema
   - Properties: title, targetTypeId, isTemplate, isDailyNoteTemplate, templateProperties
   - Set `hasContent: true` for template body storage

5. **Create TemplateEditor component** (`src/components/templates/TemplateEditor.tsx`)
   - Type selector for target type
   - Property defaults editor (filtered by target type schema)
   - Content editor with placeholder insertion toolbar
   - Daily note template toggle
   - Save/cancel actions

6. **Create TemplatePicker component** (`src/components/templates/TemplatePicker.tsx`)
   - Modal for selecting from available templates
   - Filter by target type
   - Preview of template content
   - Keyboard navigation support

7. **Modify TypeSelector** (`src/components/capture/TypeSelector.tsx`)
   - Add "From Template" option alongside type options
   - Open TemplatePicker when selected
   - Pass selected template to creation flow

8. **Integrate with CaptureForm** (`src/components/capture/CaptureForm.tsx`)
   - Accept optional template parameter
   - Pre-populate properties from template defaults
   - Pre-populate content from template (with placeholders expanded)

9. **Integrate with daily notes** (`src/lib/daily/daily-notes.ts`)
   - In `getOrCreateDailyNote()`, check for daily note template
   - Apply template content when creating new daily note
   - Expand placeholders with daily note context

10. **Add command palette actions** (`src/lib/palette/actions.ts`)
    - Add "Create from Template" command
    - Add "Manage Templates" command
    - Add "Set Daily Note Template" command

11. **Create template management UI** (`src/components/templates/TemplateList.tsx`)
    - List all templates with target type indicator
    - Edit, duplicate, delete actions
    - Create new template button

12. **Add settings integration** (`src/components/settings/SettingsView.tsx`)
    - Templates section in settings
    - Daily note template selector
    - Link to template management

---

## 6. UI/UX Considerations

### Template Editor

```
┌─────────────────────────────────────────────────────────────┐
│  Create Template                                    [Save]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Template Name: [ Meeting Notes Template          ]         │
│                                                             │
│  Creates: [▼ Meeting                              ]         │
│                                                             │
│  [ ] Use as Daily Note Template                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Default Properties                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Status:      [▼ Scheduled ]                         │   │
│  │ Duration:    [ 60         ] minutes                 │   │
│  │ Attendees:   [ + Add relation ]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Template Content           [Insert Placeholder ▼]          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ## Agenda                                           │   │
│  │ - Item 1                                            │   │
│  │ - Item 2                                            │   │
│  │                                                      │   │
│  │ ## Notes                                            │   │
│  │ Meeting date: {{date}}                              │   │
│  │                                                      │   │
│  │ ## Action Items                                     │   │
│  │ - [ ] Follow up on...                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                               [Cancel]  [Save Template]     │
└─────────────────────────────────────────────────────────────┘
```

### Template Picker (Create from Template)

```
┌─────────────────────────────────────────────────────────────┐
│  Create from Template                              [×]      │
├─────────────────────────────────────────────────────────────┤
│  [ Search templates...                            ]         │
│                                                             │
│  Filter: [All Types ▼]                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ Meeting Notes Template                            │   │
│  │   Creates: Meeting                                  │   │
│  │   "Agenda, notes, and action items structure"       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │   Project Kickoff                                   │   │
│  │   Creates: Project                                  │   │
│  │   "Goals, milestones, and risk assessment"          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │   Literature Note                                   │   │
│  │   Creates: Note                                     │   │
│  │   "Source, summary, and key takeaways"              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │   Weekly Review                                     │   │
│  │   Creates: Note                                     │   │
│  │   "Accomplishments, lessons, and next week goals"   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [↑↓ Navigate]  [Enter Select]  [Esc Cancel]               │
└─────────────────────────────────────────────────────────────┘
```

### Type Selector with Template Option

```
┌─────────────────────────────────────────────────────────────┐
│  Quick Capture                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────────┐           │
│  │  ✓    │ │  📝   │ │  🔗   │ │  📋 Template  │           │
│  │ Task  │ │ Note  │ │ Link  │ │      ▼        │           │
│  └───────┘ └───────┘ └───────┘ └───────────────┘           │
│                                 ┌───────────────┐           │
│                                 │Meeting Notes  │           │
│                                 │Project Kickoff│           │
│                                 │Literature Note│           │
│                                 │Weekly Review  │           │
│                                 └───────────────┘           │
│  Title: [ Meeting: Q1 Planning                 ]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Placeholder Insertion Dropdown

```
┌──────────────────────────┐
│  Insert Placeholder      │
├──────────────────────────┤
│  {{date}}         Today  │
│  {{date_short}}   ISO    │
│  {{title}}        Title  │
│  {{time}}         Time   │
│  {{tomorrow}}     +1 day │
│  {{yesterday}}    -1 day │
│  {{week}}         Week # │
│  {{month}}        Month  │
│  {{year}}         Year   │
└──────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+T` | Create from template (opens picker) |
| `Cmd+T` | New template (from template management view) |
| `Escape` | Close template picker/editor |
| `Enter` | Select highlighted template |
| `Arrow Up/Down` | Navigate template list |
| `Cmd+S` | Save template (in editor) |

### Accessibility Requirements

- Template picker must be fully keyboard navigable
- Template list items must have proper ARIA roles (`role="listbox"`, `role="option"`)
- Selected template must be announced to screen readers
- Placeholder insertion dropdown must be accessible via keyboard
- Focus management: return focus to trigger element when picker closes
- Template content preview must have appropriate alt text descriptions
- Color is not the sole indicator of selection state (use border/icon)
- High contrast mode support for template type indicators

---

## 7. Testing Checklist

### Unit Tests
- [ ] `expandPlaceholders()` correctly expands all placeholder types
- [ ] `expandPlaceholders()` handles unknown placeholders gracefully
- [ ] `expandPlaceholders()` processes nested content in BlockNote JSON
- [ ] `TemplateManager.getTemplates()` returns only template objects
- [ ] `TemplateManager.getTemplatesForType()` filters correctly
- [ ] `TemplateManager.createFromTemplate()` creates object with expanded content
- [ ] `TemplateManager.createFromTemplate()` applies default properties
- [ ] `TemplateManager.getDailyNoteTemplate()` returns configured template
- [ ] Template type definition validates correctly
- [ ] Date-based placeholders use correct locale formatting

### Integration Tests
- [ ] Create template via TemplateEditor saves to ObjectStore
- [ ] Edit existing template updates correctly
- [ ] Delete template removes from store
- [ ] Create object from template populates all properties
- [ ] Create object from template expands all placeholders
- [ ] Daily note creation applies daily note template
- [ ] Template sync works across devices (Loro CRDT)
- [ ] Command palette "Create from Template" opens picker
- [ ] TypeSelector "Template" option shows picker
- [ ] Template picker keyboard navigation works

### Manual QA Checklist
- [ ] Create new template with all property types
- [ ] Create object from template via TypeSelector
- [ ] Create object from template via command palette
- [ ] Verify all placeholders expand correctly
- [ ] Edit existing template and verify changes persist
- [ ] Delete template and verify removal
- [ ] Set daily note template in settings
- [ ] Navigate to new date and verify template auto-applies
- [ ] Verify template content renders correctly in editor
- [ ] Test placeholder insertion dropdown in template editor
- [ ] Verify template picker search/filter functionality
- [ ] Test keyboard shortcuts for all template actions
- [ ] Verify template sync between two devices
- [ ] Check accessibility with screen reader

### Edge Cases
- [ ] Create template for type with no optional properties
- [ ] Create template with empty content (properties only)
- [ ] Create template with content only (no property defaults)
- [ ] Placeholder in property value (e.g., URL with date)
- [ ] Template for type that gets deleted (orphaned template)
- [ ] Very long template content (performance)
- [ ] Template with mentions to other objects
- [ ] Multiple daily note templates (only one should apply)
- [ ] Template creation when ObjectStore is empty
- [ ] Template with special characters in name
- [ ] Rapid template switching during creation
- [ ] Template picker opened with no templates available

---

## 8. Future Considerations

### Potential Enhancements
- **Template categories/folders**: Organize templates into groups
- **Template sharing**: Export/import templates as JSON or shareable links
- **Template variables**: User-prompted values at creation time (`{{prompt:Client Name}}`)
- **Conditional content**: Show/hide sections based on property values
- **Template inheritance**: Base templates that other templates extend
- **Template snippets**: Reusable content blocks insertable anywhere
- **Template analytics**: Track which templates are used most frequently
- **Template suggestions**: AI-powered template recommendations based on content
- **Bulk template application**: Apply template to existing objects
- **Template preview**: Live preview with sample data before creation
- **Weekly/monthly note templates**: Similar to daily notes, for periodic reviews
- **Template keyboard macros**: Custom shortcuts per template
