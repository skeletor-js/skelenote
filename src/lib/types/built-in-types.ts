/**
 * Built-in type definitions for Skelenote
 */

import type { TypeDefinition } from './type-definition';
import { BuiltInTypeIds } from './type-definition';

/**
 * Task status options
 */
export const TaskStatusOptions = [
  'todo',
  'in-progress',
  'waiting',
  'done',
] as const;
export type TaskStatus = (typeof TaskStatusOptions)[number];

/**
 * Task priority options
 */
export const TaskPriorityOptions = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TaskPriorityOptions)[number];

/**
 * Project status options
 */
export const ProjectStatusOptions = [
  'active',
  'on-hold',
  'completed',
  'archived',
] as const;
export type ProjectStatus = (typeof ProjectStatusOptions)[number];

/**
 * Tag color options using our warm palette from the style guide
 * - ember: Terracotta/primary accent
 * - clay: Muted purple/mauve
 * - sage: Green/success
 * - ochre: Golden yellow/warning
 * - brick: Dark red/danger
 * - slate: Blue-gray/info
 */
export const TagColorOptions = [
  'ember',
  'clay',
  'sage',
  'ochre',
  'brick',
  'slate',
] as const;
export type TagColor = (typeof TagColorOptions)[number];

/**
 * Meeting duration options (in minutes)
 */
export const MeetingDurationOptions = [
  '15',
  '30',
  '45',
  '60',
  '90',
  '120',
  '180',
  '240',
] as const;
export type MeetingDuration = (typeof MeetingDurationOptions)[number];

/**
 * Task type definition
 * Properties: title, status, dueDate, reminderTime, priority, project, area, tags, recurrence, dailyNote
 */
export const TaskType: TypeDefinition = {
  id: BuiltInTypeIds.TASK,
  name: 'Task',
  icon: 'circle-check',
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
      id: 'reminderTime',
      name: 'Reminder',
      type: 'date',
      required: false,
      multiple: false,
      config: {
        showTime: true,
      },
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
      id: 'area',
      name: 'Area',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.AREA],
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
    {
      id: 'dailyNote',
      name: 'Daily Note',
      type: 'relation',
      required: false,
      multiple: false,
      hidden: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
  ],
};

/**
 * Note type definition
 * Properties: title, date, isDailyNote, project, tags, dailyNote
 */
export const NoteType: TypeDefinition = {
  id: BuiltInTypeIds.NOTE,
  name: 'Note',
  icon: 'file-text',
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
      hidden: true, // Only used internally for daily notes; title already shows the date
    },
    {
      id: 'isDailyNote',
      name: 'Is Daily Note',
      type: 'checkbox',
      required: false,
      multiple: false,
      hidden: true,
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
      id: 'area',
      name: 'Area',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.AREA],
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
      id: 'dailyNote',
      name: 'Daily Note',
      type: 'relation',
      required: false,
      multiple: false,
      hidden: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
  ],
};

/**
 * Project type definition
 * Properties: name, status, startDate, endDate, tags, dailyNote
 */
export const ProjectType: TypeDefinition = {
  id: BuiltInTypeIds.PROJECT,
  name: 'Project',
  icon: 'folder',
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
      id: 'startDate',
      name: 'Start Date',
      type: 'date',
      required: false,
      multiple: false,
    },
    {
      id: 'endDate',
      name: 'End Date',
      type: 'date',
      required: false,
      multiple: false,
    },
    {
      id: 'area',
      name: 'Area',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.AREA],
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
      id: 'dailyNote',
      name: 'Daily Note',
      type: 'relation',
      required: false,
      multiple: false,
      hidden: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
  ],
};

/**
 * Area type definition (PARA methodology)
 * Properties: name, projects, dailyNote
 */
export const AreaType: TypeDefinition = {
  id: BuiltInTypeIds.AREA,
  name: 'Area',
  icon: 'layers',
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
      id: 'projects',
      name: 'Projects',
      type: 'relation',
      required: false,
      multiple: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.PROJECT],
      },
    },
    {
      id: 'dailyNote',
      name: 'Daily Note',
      type: 'relation',
      required: false,
      multiple: false,
      hidden: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
  ],
};

/**
 * Link type definition
 * Properties: url, title, description, project, tags, dailyNote
 */
export const LinkType: TypeDefinition = {
  id: BuiltInTypeIds.LINK,
  name: 'Link',
  icon: 'link',
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
      id: 'area',
      name: 'Area',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.AREA],
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
      id: 'dailyNote',
      name: 'Daily Note',
      type: 'relation',
      required: false,
      multiple: false,
      hidden: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
  ],
};

/**
 * Meeting type definition
 * Properties: title, startTime, durationMinutes, attendees, project, area, tags, dailyNote
 */
export const MeetingType: TypeDefinition = {
  id: BuiltInTypeIds.MEETING,
  name: 'Meeting',
  icon: 'calendar',
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
      config: {
        showTime: true,
      },
    },
    {
      id: 'durationMinutes',
      name: 'Duration',
      type: 'select',
      required: false,
      multiple: false,
      config: {
        options: [...MeetingDurationOptions],
      },
    },
    {
      id: 'attendees',
      name: 'Attendees',
      type: 'relation',
      required: false,
      multiple: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.PERSON],
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
      id: 'area',
      name: 'Area',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.AREA],
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
      id: 'dailyNote',
      name: 'Daily Note',
      type: 'relation',
      required: false,
      multiple: false,
      hidden: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
  ],
};

/**
 * Tag type definition
 * Properties: name, color, description, dailyNote
 */
export const TagType: TypeDefinition = {
  id: BuiltInTypeIds.TAG,
  name: 'Tag',
  icon: 'tag',
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
    {
      id: 'dailyNote',
      name: 'Daily Note',
      type: 'relation',
      required: false,
      multiple: false,
      hidden: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
  ],
};

/**
 * Person type definition
 * Properties: name, email, phone, company, website, tags, dailyNote
 */
export const PersonType: TypeDefinition = {
  id: BuiltInTypeIds.PERSON,
  name: 'Person',
  icon: 'user',
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
      id: 'area',
      name: 'Area',
      type: 'relation',
      required: false,
      multiple: false,
      config: {
        targetTypeIds: [BuiltInTypeIds.AREA],
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
      id: 'dailyNote',
      name: 'Daily Note',
      type: 'relation',
      required: false,
      multiple: false,
      hidden: true,
      config: {
        targetTypeIds: [BuiltInTypeIds.NOTE],
      },
    },
  ],
};

/**
 * Template type definition
 * Properties: title, description, targetTypeId, isDailyNoteTemplate, templateProperties
 * Templates store reusable blueprints for creating new objects
 */
export const TemplateType: TypeDefinition = {
  id: BuiltInTypeIds.TEMPLATE,
  name: 'Template',
  icon: 'clipboard',
  hasContent: true, // Template body with placeholders
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
      id: 'description',
      name: 'Description',
      type: 'text',
      required: false,
      multiple: false,
    },
    {
      id: 'targetTypeId',
      name: 'Target Type',
      type: 'text',
      required: true,
      multiple: false,
    },
    {
      id: 'isDailyNoteTemplate',
      name: 'Daily Note Template',
      type: 'checkbox',
      required: false,
      multiple: false,
    },
    {
      id: 'templateProperties',
      name: 'Template Properties',
      type: 'text',
      required: false,
      multiple: false,
      hidden: true, // JSON-encoded default properties
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
  AreaType,
  LinkType,
  MeetingType,
  TagType,
  PersonType,
  TemplateType,
];

/**
 * Get a built-in type by ID
 */
export function getBuiltInType(typeId: string): TypeDefinition | undefined {
  return builtInTypes.find((t) => t.id === typeId);
}
