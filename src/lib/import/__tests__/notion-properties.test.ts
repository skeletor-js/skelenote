import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMappableProperties,
  inferPropertyMappings,
  convertNotionProperties,
  analyzeSchemaProperties,
  summarizeDatabaseSchema,
} from '../notion-properties';
import type {
  NotionDatabaseInfo,
  DatabasePropertySchema,
  NotionPropertyValue,
} from '../notion-api';
import { BuiltInTypeIds } from '../../types';

// Mock getBuiltInType
vi.mock('../../types/built-in-types', () => ({
  getBuiltInType: vi.fn((typeId: string) => {
    const types: Record<
      string,
      {
        schema: Array<{
          id: string;
          name: string;
          type: string;
          hidden?: boolean;
        }>;
      }
    > = {
      [BuiltInTypeIds.TASK]: {
        schema: [
          { id: 'title', name: 'Title', type: 'text' },
          { id: 'status', name: 'Status', type: 'select' },
          { id: 'priority', name: 'Priority', type: 'select' },
          { id: 'dueDate', name: 'Due Date', type: 'date' },
          { id: 'description', name: 'Description', type: 'text' },
          { id: 'project', name: 'Project', type: 'relation', hidden: false },
        ],
      },
      [BuiltInTypeIds.NOTE]: {
        schema: [
          { id: 'title', name: 'Title', type: 'text' },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      [BuiltInTypeIds.PROJECT]: {
        schema: [
          { id: 'name', name: 'Name', type: 'text' },
          { id: 'status', name: 'Status', type: 'select' },
          { id: 'startDate', name: 'Start Date', type: 'date' },
          { id: 'endDate', name: 'End Date', type: 'date' },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      [BuiltInTypeIds.PERSON]: {
        schema: [
          { id: 'name', name: 'Name', type: 'text' },
          { id: 'email', name: 'Email', type: 'email' },
          { id: 'phone', name: 'Phone', type: 'phone' },
          { id: 'company', name: 'Company', type: 'text' },
          { id: 'website', name: 'Website', type: 'url' },
        ],
      },
      [BuiltInTypeIds.LINK]: {
        schema: [
          { id: 'title', name: 'Title', type: 'text' },
          { id: 'url', name: 'URL', type: 'url' },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      [BuiltInTypeIds.MEETING]: {
        schema: [
          { id: 'title', name: 'Title', type: 'text' },
          { id: 'startTime', name: 'Start Time', type: 'date' },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      [BuiltInTypeIds.AREA]: {
        schema: [
          { id: 'name', name: 'Name', type: 'text' },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
    };
    return types[typeId] || null;
  }),
}));

// Helper to create database property schema
function createProp(
  name: string,
  type: string,
  options?: Array<{ id: string; name: string; color: string }>
): DatabasePropertySchema {
  return {
    id: `prop-${name.toLowerCase().replace(/\s/g, '-')}`,
    name,
    type,
    config: options ? { options } : undefined,
  };
}

// Helper to create database info
function createDatabase(
  name: string,
  properties: DatabasePropertySchema[]
): NotionDatabaseInfo {
  return {
    id: 'test-db-id',
    name,
    icon: null,
    properties,
  };
}

describe('notion-properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMappableProperties', () => {
    it('should return properties for Task type', () => {
      const props = getMappableProperties(BuiltInTypeIds.TASK);

      expect(props.length).toBeGreaterThan(0);
      expect(props.some((p) => p.id === 'title')).toBe(true);
      expect(props.some((p) => p.id === 'status')).toBe(true);
      expect(props.some((p) => p.id === 'dueDate')).toBe(true);
    });

    it('should return properties for Project type with name', () => {
      const props = getMappableProperties(BuiltInTypeIds.PROJECT);

      expect(props.some((p) => p.id === 'name')).toBe(true);
      expect(props.some((p) => p.id === 'startDate')).toBe(true);
    });

    it('should return empty array for unknown type', () => {
      const props = getMappableProperties('unknown-type');
      expect(props).toEqual([]);
    });

    it('should filter out relation properties', () => {
      const props = getMappableProperties(BuiltInTypeIds.TASK);
      expect(props.some((p) => p.type === 'relation')).toBe(false);
    });
  });

  describe('inferPropertyMappings', () => {
    it('should map title property to title for Task', () => {
      const db = createDatabase('Tasks', [createProp('Title', 'title')]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.TASK);

      expect(mappings).toHaveLength(1);
      expect(mappings[0].skelenoteProperty).toBe('title');
      expect(mappings[0].confidence).toBe('auto');
    });

    it('should map title property to name for Project', () => {
      const db = createDatabase('Projects', [createProp('Name', 'title')]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.PROJECT);

      expect(mappings).toHaveLength(1);
      expect(mappings[0].skelenoteProperty).toBe('name');
    });

    it('should map status property for Task', () => {
      const db = createDatabase('Tasks', [
        createProp('Title', 'title'),
        createProp('Status', 'status', [
          { id: '1', name: 'Todo', color: 'gray' },
        ]),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.TASK);

      const statusMapping = mappings.find((m) => m.notionProperty === 'Status');
      expect(statusMapping?.skelenoteProperty).toBe('status');
    });

    it('should map priority property for Task', () => {
      const db = createDatabase('Tasks', [
        createProp('Title', 'title'),
        createProp('Priority', 'select', [
          { id: '1', name: 'High', color: 'red' },
        ]),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.TASK);

      const priorityMapping = mappings.find(
        (m) => m.notionProperty === 'Priority'
      );
      expect(priorityMapping?.skelenoteProperty).toBe('priority');
    });

    it('should map due date property for Task', () => {
      const db = createDatabase('Tasks', [
        createProp('Title', 'title'),
        createProp('Due Date', 'date'),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.TASK);

      const dateMapping = mappings.find((m) => m.notionProperty === 'Due Date');
      expect(dateMapping?.skelenoteProperty).toBe('dueDate');
    });

    it('should map URL property for Link type', () => {
      const db = createDatabase('Links', [
        createProp('Title', 'title'),
        createProp('URL', 'url'),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.LINK);

      const urlMapping = mappings.find((m) => m.notionProperty === 'URL');
      expect(urlMapping?.skelenoteProperty).toBe('url');
    });

    it('should map email property for Person type', () => {
      const db = createDatabase('Contacts', [
        createProp('Name', 'title'),
        createProp('Email', 'email'),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.PERSON);

      const emailMapping = mappings.find((m) => m.notionProperty === 'Email');
      expect(emailMapping?.skelenoteProperty).toBe('email');
    });

    it('should map phone property for Person type', () => {
      const db = createDatabase('Contacts', [
        createProp('Name', 'title'),
        createProp('Phone', 'phone_number'),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.PERSON);

      const phoneMapping = mappings.find((m) => m.notionProperty === 'Phone');
      expect(phoneMapping?.skelenoteProperty).toBe('phone');
    });

    it('should skip unmappable properties', () => {
      const db = createDatabase('Tasks', [
        createProp('Title', 'title'),
        createProp('Custom Field', 'created_time'), // Not mappable
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.TASK);

      const customMapping = mappings.find(
        (m) => m.notionProperty === 'Custom Field'
      );
      expect(customMapping?.skelenoteProperty).toBe('skip');
    });

    it('should not reuse already mapped properties', () => {
      const db = createDatabase('Tasks', [
        createProp('Title', 'title'),
        createProp('Name', 'title'), // Another title
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.TASK);

      const titleMappings = mappings.filter(
        (m) => m.skelenoteProperty === 'title'
      );
      expect(titleMappings).toHaveLength(1);

      const secondTitle = mappings.find((m) => m.notionProperty === 'Name');
      expect(secondTitle?.skelenoteProperty).toBe('skip');
    });

    it('should map description property', () => {
      const db = createDatabase('Tasks', [
        createProp('Title', 'title'),
        createProp('Description', 'rich_text'),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.TASK);

      const descMapping = mappings.find(
        (m) => m.notionProperty === 'Description'
      );
      expect(descMapping?.skelenoteProperty).toBe('description');
    });

    it('should map start date for Project', () => {
      const db = createDatabase('Projects', [
        createProp('Name', 'title'),
        createProp('Start Date', 'date'),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.PROJECT);

      const startMapping = mappings.find(
        (m) => m.notionProperty === 'Start Date'
      );
      expect(startMapping?.skelenoteProperty).toBe('startDate');
    });

    it('should map start time for Meeting', () => {
      const db = createDatabase('Meetings', [
        createProp('Title', 'title'),
        createProp('Start Time', 'date'),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.MEETING);

      const startMapping = mappings.find(
        (m) => m.notionProperty === 'Start Time'
      );
      expect(startMapping?.skelenoteProperty).toBe('startTime');
    });

    it('should map company property for Person', () => {
      const db = createDatabase('Contacts', [
        createProp('Name', 'title'),
        createProp('Company', 'rich_text'),
      ]);

      const mappings = inferPropertyMappings(db, BuiltInTypeIds.PERSON);

      const companyMapping = mappings.find(
        (m) => m.notionProperty === 'Company'
      );
      expect(companyMapping?.skelenoteProperty).toBe('company');
    });
  });

  describe('convertNotionProperties', () => {
    it('should convert title property to title for Task', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Title: { type: 'title', value: 'My Task' },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.title).toBe('My Task');
    });

    it('should convert title property to name for Project', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Name: { type: 'title', value: 'My Project' },
      };

      const result = convertNotionProperties(
        notionProps,
        BuiltInTypeIds.PROJECT
      );

      expect(result.properties.name).toBe('My Project');
    });

    it('should convert status to Skelenote status values', () => {
      const statusTests = [
        { input: 'To Do', expected: 'todo' },
        { input: 'In Progress', expected: 'in-progress' },
        { input: 'Done', expected: 'done' },
        { input: 'Waiting', expected: 'waiting' },
        { input: 'Blocked', expected: 'waiting' },
        { input: 'Not Started', expected: 'todo' },
        { input: 'Complete', expected: 'done' },
      ];

      for (const { input, expected } of statusTests) {
        const notionProps: Record<string, NotionPropertyValue> = {
          Status: { type: 'status', value: input },
        };

        const result = convertNotionProperties(
          notionProps,
          BuiltInTypeIds.TASK
        );
        expect(result.properties.status).toBe(expected);
      }
    });

    it('should default unknown status to todo', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Status: { type: 'status', value: 'Random Status' },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.status).toBe('todo');
    });

    it('should convert priority values', () => {
      const priorityTests = [
        { input: 'Low', expected: 'low' },
        { input: 'Medium', expected: 'medium' },
        { input: 'High', expected: 'high' },
        { input: 'Urgent', expected: 'urgent' },
        { input: 'P1', expected: 'high' },
        { input: 'P2', expected: 'medium' },
      ];

      for (const { input, expected } of priorityTests) {
        const notionProps: Record<string, NotionPropertyValue> = {
          Priority: { type: 'select', value: input },
        };

        const result = convertNotionProperties(
          notionProps,
          BuiltInTypeIds.TASK
        );
        expect(result.properties.priority).toBe(expected);
      }
    });

    it('should collect tags from multi_select', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Tags: { type: 'multi_select', value: ['Work', 'Important', 'Review'] },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.pendingTags).toEqual(['Work', 'Important', 'Review']);
    });

    it('should convert date properties', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        'Due Date': { type: 'date', value: { start: '2024-12-25T12:00:00' } },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.dueDate).toBeDefined();
      // Just verify it's a valid timestamp
      expect(typeof result.properties.dueDate).toBe('number');
      expect(result.properties.dueDate).toBeGreaterThan(0);
    });

    it('should convert start and end dates', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        'Start Date': { type: 'date', value: { start: '2024-01-01' } },
        'End Date': {
          type: 'date',
          value: { start: '2024-01-01', end: '2024-12-31' },
        },
      };

      const result = convertNotionProperties(
        notionProps,
        BuiltInTypeIds.PROJECT
      );

      expect(result.properties.startDate).toBeDefined();
      expect(result.properties.endDate).toBeDefined();
    });

    it('should collect people for later resolution', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Attendees: { type: 'people', value: ['Alice', 'Bob', 'Charlie'] },
      };

      const result = convertNotionProperties(
        notionProps,
        BuiltInTypeIds.MEETING
      );

      expect(result.pendingPeople).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should collect relations for later resolution', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Project: { type: 'relation', value: ['page-id-1', 'page-id-2'] },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.pendingRelations.get('Project')).toEqual([
        'page-id-1',
        'page-id-2',
      ]);
    });

    it('should convert URL property', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        URL: { type: 'url', value: 'https://example.com' },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.LINK);

      expect(result.properties.url).toBe('https://example.com');
    });

    it('should convert email property', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Email: { type: 'email', value: 'test@example.com' },
      };

      const result = convertNotionProperties(
        notionProps,
        BuiltInTypeIds.PERSON
      );

      expect(result.properties.email).toBe('test@example.com');
    });

    it('should convert phone property', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Phone: { type: 'phone_number', value: '+1-555-1234' },
      };

      const result = convertNotionProperties(
        notionProps,
        BuiltInTypeIds.PERSON
      );

      expect(result.properties.phone).toBe('+1-555-1234');
    });

    it('should convert checkbox property', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        'Is Urgent': { type: 'checkbox', value: true },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.isUrgent).toBe(true);
    });

    it('should convert number property', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        'Estimate Hours': { type: 'number', value: 5 },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.estimateHours).toBe(5);
    });

    it('should convert description property', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Description: { type: 'rich_text', value: 'This is a description' },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.description).toBe('This is a description');
    });

    it('should convert company property', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Company: { type: 'rich_text', value: 'Acme Corp' },
      };

      const result = convertNotionProperties(
        notionProps,
        BuiltInTypeIds.PERSON
      );

      expect(result.properties.company).toBe('Acme Corp');
    });

    it('should skip null values', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Title: { type: 'title', value: 'Test' },
        Status: { type: 'status', value: null },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.title).toBe('Test');
      expect(result.properties.status).toBeUndefined();
    });

    it('should convert formula property', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        'Days Left': { type: 'formula', value: 5 },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.daysLeft).toBe(5);
    });

    it('should convert files property to URL', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Attachments: {
          type: 'files',
          value: ['https://file1.com', 'https://file2.com'],
        },
      };

      const result = convertNotionProperties(notionProps, BuiltInTypeIds.TASK);

      expect(result.properties.attachments).toBe(
        'https://file1.com, https://file2.com'
      );
    });

    it('should set meeting date and startTime', () => {
      const notionProps: Record<string, NotionPropertyValue> = {
        Date: { type: 'date', value: { start: '2024-06-15T10:00:00' } },
      };

      const result = convertNotionProperties(
        notionProps,
        BuiltInTypeIds.MEETING
      );

      expect(result.properties.date).toBeDefined();
      expect(result.properties.startTime).toBeDefined();
      expect(result.properties.date).toBe(result.properties.startTime);
    });
  });

  describe('analyzeSchemaProperties', () => {
    it('should detect status property', () => {
      const props = [createProp('Status', 'status')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasStatus).toBe(true);
    });

    it('should detect status from select named Status', () => {
      const props = [createProp('Status', 'select')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasStatus).toBe(true);
    });

    it('should detect status from select named State', () => {
      const props = [createProp('State', 'select')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasStatus).toBe(true);
    });

    it('should detect priority property', () => {
      const props = [createProp('Priority', 'select')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasPriority).toBe(true);
    });

    it('should detect due date property', () => {
      const props = [createProp('Due Date', 'date')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasDueDate).toBe(true);
    });

    it('should detect due date with deadline name', () => {
      const props = [createProp('Deadline', 'date')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasDueDate).toBe(true);
    });

    it('should detect tags property', () => {
      const props = [createProp('Tags', 'multi_select')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasTags).toBe(true);
    });

    it('should detect tags with various names', () => {
      const tagNames = ['Labels', 'Categories', 'Topics', 'Keywords'];
      for (const name of tagNames) {
        const props = [createProp(name, 'multi_select')];
        const result = analyzeSchemaProperties(props);
        expect(result.hasTags).toBe(true);
      }
    });

    it('should detect people property', () => {
      const props = [createProp('Assignee', 'people')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasPeople).toBe(true);
    });

    it('should detect URL property', () => {
      const props = [createProp('Link', 'url')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasUrl).toBe(true);
    });

    it('should detect URL by name', () => {
      const props = [createProp('URL', 'rich_text')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasUrl).toBe(true);
    });

    it('should detect email property', () => {
      const props = [createProp('Email', 'email')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasEmail).toBe(true);
    });

    it('should detect email by name', () => {
      const props = [createProp('Email', 'rich_text')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasEmail).toBe(true);
    });

    it('should detect phone property', () => {
      const props = [createProp('Phone', 'phone_number')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasPhone).toBe(true);
    });

    it('should detect relation property', () => {
      const props = [createProp('Project', 'relation')];
      const result = analyzeSchemaProperties(props);
      expect(result.hasRelations).toBe(true);
    });

    it('should analyze multiple properties', () => {
      const props = [
        createProp('Status', 'status'),
        createProp('Priority', 'select'),
        createProp('Due', 'date'),
        createProp('Tags', 'multi_select'),
        createProp('Assignee', 'people'),
      ];

      const result = analyzeSchemaProperties(props);

      expect(result.hasStatus).toBe(true);
      expect(result.hasPriority).toBe(true);
      expect(result.hasDueDate).toBe(true);
      expect(result.hasTags).toBe(true);
      expect(result.hasPeople).toBe(true);
    });

    it('should return all false for empty properties', () => {
      const result = analyzeSchemaProperties([]);

      expect(result.hasStatus).toBe(false);
      expect(result.hasPriority).toBe(false);
      expect(result.hasDueDate).toBe(false);
      expect(result.hasTags).toBe(false);
      expect(result.hasPeople).toBe(false);
      expect(result.hasUrl).toBe(false);
      expect(result.hasEmail).toBe(false);
      expect(result.hasPhone).toBe(false);
      expect(result.hasRelations).toBe(false);
    });
  });

  describe('summarizeDatabaseSchema', () => {
    it('should summarize database with multiple features', () => {
      const db = createDatabase('Tasks', [
        createProp('Status', 'status'),
        createProp('Priority', 'select'),
        createProp('Due', 'date'),
      ]);

      const summary = summarizeDatabaseSchema(db);

      expect(summary).toContain('status');
      expect(summary).toContain('priority');
      expect(summary).toContain('due dates');
    });

    it('should summarize database with tags', () => {
      const db = createDatabase('Items', [createProp('Tags', 'multi_select')]);

      const summary = summarizeDatabaseSchema(db);

      expect(summary).toContain('tags');
    });

    it('should summarize database with people', () => {
      const db = createDatabase('Meetings', [
        createProp('Attendees', 'people'),
      ]);

      const summary = summarizeDatabaseSchema(db);

      expect(summary).toContain('people');
    });

    it('should summarize database with relations', () => {
      const db = createDatabase('Tasks', [createProp('Project', 'relation')]);

      const summary = summarizeDatabaseSchema(db);

      expect(summary).toContain('relations');
    });

    it('should return property count for database with no detected features', () => {
      const db = createDatabase('Data', [
        createProp('Field1', 'created_time'),
        createProp('Field2', 'created_by'),
        createProp('Field3', 'last_edited_time'),
      ]);

      const summary = summarizeDatabaseSchema(db);

      expect(summary).toBe('3 properties');
    });

    it('should return 0 properties for empty database', () => {
      const db = createDatabase('Empty', []);

      const summary = summarizeDatabaseSchema(db);

      expect(summary).toBe('0 properties');
    });
  });
});
