/**
 * Built-in type definitions for Ephemera
 */

import type { TypeDefinition } from './type-definition';
import { BuiltInTypeIds } from './type-definition';

/**
 * Task status options
 */
export const TaskStatusOptions = ['todo', 'in-progress', 'blocked', 'done'] as const;
export type TaskStatus = (typeof TaskStatusOptions)[number];

/**
 * Task priority options
 */
export const TaskPriorityOptions = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TaskPriorityOptions)[number];

/**
 * Project status options
 */
export const ProjectStatusOptions = ['active', 'on-hold', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof ProjectStatusOptions)[number];

/**
 * Tag color options (maps to CSS variables like --tag-red, --tag-blue, etc.)
 */
export const TagColorOptions = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'] as const;
export type TagColor = (typeof TagColorOptions)[number];

/**
 * Task type definition
 * Properties: title, status, dueDate, priority, project, note, tags, recurrence
 */
export const TaskType: TypeDefinition = {
  id: BuiltInTypeIds.TASK,
  name: 'Task',
  icon: '✓',
  hasContent: true,
  isBuiltIn: true,
  schema: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      required: true,
      multiple: false,
    },
    {
      id: 'status',
      name: 'Status',
      type: 'select',
      required: true,
      multiple: false,
      config: {
        options: [...TaskStatusOptions],
      },
    },
    {
      id: 'dueDate',
      name: 'Due Date',
      type: 'date',
      required: false,
      multiple: false,
    },
    {
      id: 'priority',
      name: 'Priority',
      type: 'select',
      required: false,
      multiple: false,
      config: {
        options: [...TaskPriorityOptions],
      },
    },
    {
      id: 'project',
      name: 'Project',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.PROJECT],
      },
    },
    {
      id: 'note',
      name: 'Note',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'relation',
      required: false,
      multiple: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.TAG],
      },
    },
    {
      id: 'recurrence',
      name: 'Recurrence',
      type: 'recurrence',
      required: false,
      multiple: false,
    },
    {
      id: 'sortOrder',
      name: 'Sort Order',
      type: 'number',
      required: false,
      multiple: false,
      hidden: true,
    },
  ],
};

/**
 * Note type definition
 * Properties: title, date, isDailyNote, project, tags
 */
export const NoteType: TypeDefinition = {
  id: BuiltInTypeIds.NOTE,
  name: 'Note',
  icon: '📝',
  hasContent: true,
  isBuiltIn: true,
  schema: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      required: true,
      multiple: false,
    },
    {
      id: 'date',
      name: 'Date',
      type: 'date',
      required: false,
      multiple: false,
    },
    {
      id: 'isDailyNote',
      name: 'Is Daily Note',
      type: 'checkbox',
      required: false,
      multiple: false,
    },
    {
      id: 'project',
      name: 'Project',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.PROJECT],
      },
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'relation',
      required: false,
      multiple: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.TAG],
      },
    },
  ],
};

/**
 * Project type definition
 * Properties: name, status, tags
 */
export const ProjectType: TypeDefinition = {
  id: BuiltInTypeIds.PROJECT,
  name: 'Project',
  icon: '📁',
  hasContent: true,
  isBuiltIn: true,
  schema: [
    {
      id: 'name',
      name: 'Name',
      type: 'text',
      required: true,
      multiple: false,
    },
    {
      id: 'status',
      name: 'Status',
      type: 'select',
      required: true,
      multiple: false,
      config: {
        options: [...ProjectStatusOptions],
      },
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'relation',
      required: false,
      multiple: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.TAG],
      },
    },
  ],
};

/**
 * Link type definition
 * Properties: url, title, description, tags
 */
export const LinkType: TypeDefinition = {
  id: BuiltInTypeIds.LINK,
  name: 'Link',
  icon: '🔗',
  hasContent: false,
  isBuiltIn: true,
  schema: [
    {
      id: 'url',
      name: 'URL',
      type: 'url',
      required: true,
      multiple: false,
    },
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      required: false,
      multiple: false,
    },
    {
      id: 'description',
      name: 'Description',
      type: 'text',
      required: false,
      multiple: false,
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'relation',
      required: false,
      multiple: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.TAG],
      },
    },
  ],
};

/**
 * Meeting type definition
 * Properties: title, startTime, endTime, location, attendees, calendarEventId, project, tags
 */
export const MeetingType: TypeDefinition = {
  id: BuiltInTypeIds.MEETING,
  name: 'Meeting',
  icon: '📅',
  hasContent: true,
  isBuiltIn: true,
  schema: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      required: true,
      multiple: false,
    },
    {
      id: 'startTime',
      name: 'Start Time',
      type: 'date',
      required: true,
      multiple: false,
    },
    {
      id: 'endTime',
      name: 'End Time',
      type: 'date',
      required: false,
      multiple: false,
    },
    {
      id: 'location',
      name: 'Location',
      type: 'text',
      required: false,
      multiple: false,
    },
    {
      id: 'attendees',
      name: 'Attendees',
      type: 'text',
      required: false,
      multiple: false,
    },
    {
      id: 'calendarEventId',
      name: 'Calendar Event ID',
      type: 'text',
      required: false,
      multiple: false,
    },
    {
      id: 'project',
      name: 'Project',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.PROJECT],
      },
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'relation',
      required: false,
      multiple: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.TAG],
      },
    },
  ],
};

/**
 * Tag type definition
 * Properties: name, color, description
 */
export const TagType: TypeDefinition = {
  id: BuiltInTypeIds.TAG,
  name: 'Tag',
  icon: '🏷️',
  hasContent: false,
  isBuiltIn: true,
  schema: [
    {
      id: 'name',
      name: 'Name',
      type: 'text',
      required: true,
      multiple: false,
    },
    {
      id: 'color',
      name: 'Color',
      type: 'select',
      required: false,
      multiple: false,
      config: {
        options: [...TagColorOptions],
      },
    },
    {
      id: 'description',
      name: 'Description',
      type: 'text',
      required: false,
      multiple: false,
    },
  ],
};

/**
 * Person type definition
 * Properties: name, email, phone, company, website, tags
 */
export const PersonType: TypeDefinition = {
  id: BuiltInTypeIds.PERSON,
  name: 'Person',
  icon: '👤',
  hasContent: true,
  isBuiltIn: true,
  schema: [
    {
      id: 'name',
      name: 'Name',
      type: 'text',
      required: true,
      multiple: false,
    },
    {
      id: 'email',
      name: 'Email',
      type: 'email',
      required: false,
      multiple: false,
    },
    {
      id: 'phone',
      name: 'Phone',
      type: 'phone',
      required: false,
      multiple: false,
    },
    {
      id: 'company',
      name: 'Company',
      type: 'text',
      required: false,
      multiple: false,
    },
    {
      id: 'website',
      name: 'Website',
      type: 'url',
      required: false,
      multiple: false,
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'relation',
      required: false,
      multiple: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.TAG],
      },
    },
  ],
};

/**
 * All built-in type definitions
 */
export const builtInTypes: TypeDefinition[] = [
  TaskType,
  NoteType,
  ProjectType,
  LinkType,
  MeetingType,
  TagType,
  PersonType,
];

/**
 * Get a built-in type by ID
 */
export function getBuiltInType(typeId: string): TypeDefinition | undefined {
  return builtInTypes.find((t) => t.id === typeId);
}
