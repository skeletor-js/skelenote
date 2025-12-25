# Phase 5: Task Management

## Objective
Implement the complete task management system with all task views (Today, This Week, Overdue, Blocked, Eventually, Completed), list and kanban view modes, and recurring task completion logic.

## Dependencies
- Phase 2: Task type definition and CRUD
- Phase 3: Design system and sidebar
- Phase 4: Object detail view for task editing

## Key Deliverables
- [ ] Today view (tasks due today)
- [ ] This Week view (tasks due this week, after today)
- [ ] Overdue view (past due tasks)
- [ ] Blocked view (status = blocked)
- [ ] Eventually view (tasks due beyond this week)
- [ ] Completed view (done tasks)
- [ ] List view mode
- [ ] Kanban view mode (group by status or project)
- [ ] Task checkbox toggle
- [ ] Recurring task completion (clone forward)
- [ ] Sidebar navigation to all views

## Technical Notes

### Task View Filters (from PRD)
| View | Filter | Default Sort |
|------|--------|--------------|
| Today | `typeId = task` AND `status ≠ done` AND `dueDate = today` | priority desc |
| This Week | `typeId = task` AND `status ≠ done` AND `dueDate > today` AND `dueDate ≤ endOfWeek` | dueDate asc |
| Overdue | `typeId = task` AND `status ≠ done` AND `dueDate < today` | dueDate asc |
| Blocked | `typeId = task` AND `status = blocked` | updatedAt desc |
| Eventually | `typeId = task` AND `status ≠ done` AND `dueDate > endOfWeek` | dueDate asc |
| Completed | `typeId = task` AND `status = done` | updatedAt desc |

### Task Status Options
- `todo` (default)
- `in-progress`
- `blocked`
- `done`

### Task Priority Options
- `low`
- `medium`
- `high`
- `urgent`

### List View
- Each row: checkbox, title, due date, priority indicator, project chip, tags
- Click row to open task detail view
- Click checkbox to toggle status (todo ↔ done)
- Sortable columns

### Kanban View
- Columns grouped by status (default) or project (selectable)
- Cards show: title, due date, priority, tags
- Drag-and-drop between columns updates status/project
- Click card to open detail view

### Recurring Tasks (Clone Forward)
When a recurring task is marked done:
1. Current task → `status: done`
2. Create new task with:
   - Same: title, priority, project, tags, note relations, recurrence
   - New: id, createdAt, updatedAt
   - Calculated: dueDate based on recurrence rule
   - Reset: `status: todo`, `inboxed: false`

Recurrence patterns:
- `daily` → +1 day
- `weekly` → +7 days
- `monthly` → +1 month (same day of month)
- `yearly` → +1 year

### Date Utilities
- `isToday(date)` - check if date is today
- `isThisWeek(date)` - check if date is within current week
- `isPastDue(date)` - check if date is before today
- `getEndOfWeek()` - get Sunday of current week
- `addDays/Months/Years(date, n)` - date arithmetic for recurrence

## Files to Create/Modify
- `src/components/views/TaskView.tsx` - Container for task views
- `src/components/views/TaskList.tsx` - List view mode
- `src/components/views/TaskKanban.tsx` - Kanban view mode
- `src/components/views/TaskCard.tsx` - Card for kanban/list item
- `src/components/views/TaskRow.tsx` - Row for list view
- `src/components/views/ViewModeToggle.tsx` - List/Kanban switcher
- `src/lib/tasks/filters.ts` - View filter functions
- `src/lib/tasks/recurrence.ts` - Recurring task logic
- `src/lib/utils/date.ts` - Date utilities
- `src/hooks/useTasks.ts` - Task query hook with filters
- Update `src/components/layout/Sidebar.tsx` - Add task view navigation

## Acceptance Criteria
- [ ] All 6 task views display correct filtered tasks
- [ ] Today view shows only today's incomplete tasks
- [ ] Overdue highlights tasks past their due date
- [ ] List view displays all task properties
- [ ] Kanban view groups tasks by status
- [ ] Drag-and-drop in kanban updates task status
- [ ] Checkbox toggles between todo and done
- [ ] Completing a recurring task creates new instance
- [ ] New recurring instance has correct calculated due date
- [ ] Priority sorts correctly (urgent > high > medium > low)
- [ ] Sidebar shows all task views with navigation
- [ ] Clicking task opens detail view
