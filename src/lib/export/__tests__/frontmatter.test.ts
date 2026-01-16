import { describe, it, expect } from 'vitest';
import {
  generateFrontmatterProperties,
  renderFrontmatter,
  generateFrontmatter,
} from '../frontmatter';
import type { ExportContext } from '../types';
import type { TypeDefinition } from '../../types';

// Helper to create a minimal export context for testing
function createTestContext(
  properties: Record<string, unknown> = {},
  schemaOverrides: Partial<TypeDefinition>['schema'] = []
): ExportContext {
  const defaultSchema = [
    {
      id: 'title',
      name: 'Title',
      type: 'text' as const,
      required: true,
      multiple: false,
    },
    {
      id: 'status',
      name: 'Status',
      type: 'select' as const,
      required: false,
      multiple: false,
    },
    {
      id: 'priority',
      name: 'Priority',
      type: 'select' as const,
      required: false,
      multiple: false,
    },
    {
      id: 'dueDate',
      name: 'Due Date',
      type: 'date' as const,
      required: false,
      multiple: false,
    },
    {
      id: 'done',
      name: 'Done',
      type: 'checkbox' as const,
      required: false,
      multiple: false,
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'relation' as const,
      required: false,
      multiple: true,
    },
    ...schemaOverrides,
  ];

  return {
    object: {
      id: 'test-obj-1',
      typeId: 'built-in:task',
      properties: {
        title: 'Test Object',
        ...properties,
      },
      inboxed: false,
      pinned: false,
      archived: false,
      hasContent: true,
      createdAt: new Date('2024-01-15T10:00:00Z').getTime(),
      updatedAt: new Date('2024-01-15T12:00:00Z').getTime(),
    },
    typeDef: {
      id: 'built-in:task',
      name: 'Task',
      icon: 'CheckCircle',
      schema: defaultSchema,
    } as TypeDefinition,
    resolveObjectName: (id: string) => {
      const names: Record<string, string> = {
        'tag-1': 'Important',
        'tag-2': 'Work',
        'project-1': 'My Project',
      };
      return names[id];
    },
  };
}

describe('frontmatter', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // generateFrontmatterProperties
  // ─────────────────────────────────────────────────────────────────────────

  describe('generateFrontmatterProperties', () => {
    it('should always include title as first property', () => {
      const context = createTestContext();
      const properties = generateFrontmatterProperties(context);

      expect(properties[0].key).toBe('title');
      expect(properties[0].value).toBe('Test Object');
    });

    it('should include type property', () => {
      const context = createTestContext();
      const properties = generateFrontmatterProperties(context);

      const typeProp = properties.find((p) => p.key === 'type');
      expect(typeProp?.value).toBe('task');
    });

    it('should include created timestamp', () => {
      const context = createTestContext();
      const properties = generateFrontmatterProperties(context);

      const createdProp = properties.find((p) => p.key === 'created');
      expect(createdProp).toBeDefined();
      expect(createdProp?.value).toContain('2024-01-15');
    });

    it('should include updated timestamp', () => {
      const context = createTestContext();
      const properties = generateFrontmatterProperties(context);

      const updatedProp = properties.find((p) => p.key === 'updated');
      expect(updatedProp).toBeDefined();
      expect(updatedProp?.value).toContain('2024-01-15');
    });

    it('should convert property names to kebab-case', () => {
      const context = createTestContext({ dueDate: Date.now() });
      const properties = generateFrontmatterProperties(context);

      const dueDateProp = properties.find((p) => p.key === 'due-date');
      expect(dueDateProp).toBeDefined();
    });

    it('should handle select properties', () => {
      const context = createTestContext({ status: 'in-progress' });
      const properties = generateFrontmatterProperties(context);

      const statusProp = properties.find((p) => p.key === 'status');
      expect(statusProp?.value).toBe('in-progress');
    });

    it('should handle checkbox properties', () => {
      const context = createTestContext({ done: true });
      const properties = generateFrontmatterProperties(context);

      const doneProp = properties.find((p) => p.key === 'done');
      expect(doneProp?.value).toBe(true);
    });

    it('should handle date properties', () => {
      const timestamp = new Date('2024-02-01T00:00:00Z').getTime();
      const context = createTestContext({ dueDate: timestamp });
      const properties = generateFrontmatterProperties(context);

      const dueDateProp = properties.find((p) => p.key === 'due-date');
      expect(dueDateProp?.value).toContain('2024-02-01');
    });

    it('should resolve relation properties to names', () => {
      const context = createTestContext({ tags: ['tag-1', 'tag-2'] });
      const properties = generateFrontmatterProperties(context);

      const tagsProp = properties.find((p) => p.key === 'tags');
      expect(tagsProp?.value).toEqual(['Important', 'Work']);
    });

    it('should skip relation properties with unresolvable IDs', () => {
      const context = createTestContext({ tags: ['unknown-tag'] });
      const properties = generateFrontmatterProperties(context);

      const tagsProp = properties.find((p) => p.key === 'tags');
      // Should be null or not present if all IDs are unresolvable
      expect(tagsProp).toBeUndefined();
    });

    it('should skip null property values', () => {
      const context = createTestContext({ status: null });
      const properties = generateFrontmatterProperties(context);

      const statusProp = properties.find((p) => p.key === 'status');
      expect(statusProp).toBeUndefined();
    });

    it('should skip hidden properties', () => {
      const context = createTestContext({ secretField: 'hidden value' }, [
        {
          id: 'secretField',
          name: 'Secret',
          type: 'text',
          required: false,
          multiple: false,
          hidden: true,
        },
      ]);
      const properties = generateFrontmatterProperties(context);

      const secretProp = properties.find((p) => p.key === 'secret');
      expect(secretProp).toBeUndefined();
    });

    it('should skip recurrence properties', () => {
      const context = createTestContext(
        { recurrence: { frequency: 'daily' } },
        [
          {
            id: 'recurrence',
            name: 'Recurrence',
            type: 'recurrence',
            required: false,
            multiple: false,
          },
        ]
      );
      const properties = generateFrontmatterProperties(context);

      const recurrenceProp = properties.find((p) => p.key === 'recurrence');
      expect(recurrenceProp).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // renderFrontmatter
  // ─────────────────────────────────────────────────────────────────────────

  describe('renderFrontmatter', () => {
    it('should wrap content in YAML delimiters', () => {
      const result = renderFrontmatter([
        {
          key: 'title',
          value: 'Test',
          definition: {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            multiple: false,
          },
        },
      ]);

      expect(result.startsWith('---')).toBe(true);
      expect(result.endsWith('---')).toBe(true);
    });

    it('should render string properties correctly', () => {
      const result = renderFrontmatter([
        {
          key: 'title',
          value: 'My Title',
          definition: {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            multiple: false,
          },
        },
      ]);

      expect(result).toContain('title: My Title');
    });

    it('should escape strings with special characters', () => {
      const result = renderFrontmatter([
        {
          key: 'title',
          value: 'Title: With Colon',
          definition: {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            multiple: false,
          },
        },
      ]);

      expect(result).toContain('title: "Title: With Colon"');
    });

    it('should escape strings with quotes', () => {
      const result = renderFrontmatter([
        {
          key: 'title',
          value: 'Title "Quoted"',
          definition: {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            multiple: false,
          },
        },
      ]);

      expect(result).toContain('title: "Title \\"Quoted\\""');
    });

    it('should render boolean properties', () => {
      const result = renderFrontmatter([
        {
          key: 'done',
          value: true,
          definition: {
            id: 'done',
            name: 'Done',
            type: 'checkbox',
            required: false,
            multiple: false,
          },
        },
      ]);

      expect(result).toContain('done: true');
    });

    it('should render number properties', () => {
      const result = renderFrontmatter([
        {
          key: 'count',
          value: 42,
          definition: {
            id: 'count',
            name: 'Count',
            type: 'number',
            required: false,
            multiple: false,
          },
        },
      ]);

      expect(result).toContain('count: 42');
    });

    it('should render array properties as YAML lists', () => {
      const result = renderFrontmatter([
        {
          key: 'tags',
          value: ['Work', 'Important'],
          definition: {
            id: 'tags',
            name: 'Tags',
            type: 'relation',
            required: false,
            multiple: true,
          },
        },
      ]);

      expect(result).toContain('tags:');
      expect(result).toContain('  - Work');
      expect(result).toContain('  - Important');
    });

    it('should skip null values', () => {
      const result = renderFrontmatter([
        {
          key: 'title',
          value: 'Test',
          definition: {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            multiple: false,
          },
        },
        {
          key: 'status',
          value: null,
          definition: {
            id: 'status',
            name: 'Status',
            type: 'select',
            required: false,
            multiple: false,
          },
        },
      ]);

      expect(result).not.toContain('status:');
    });

    it('should handle newlines in strings', () => {
      const result = renderFrontmatter([
        {
          key: 'description',
          value: 'Line 1\nLine 2',
          definition: {
            id: 'description',
            name: 'Description',
            type: 'text',
            required: false,
            multiple: false,
          },
        },
      ]);

      expect(result).toContain('"Line 1\\nLine 2"');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // generateFrontmatter (integration)
  // ─────────────────────────────────────────────────────────────────────────

  describe('generateFrontmatter', () => {
    it('should generate complete YAML frontmatter', () => {
      const context = createTestContext({
        status: 'in-progress',
        priority: 'high',
      });

      const result = generateFrontmatter(context);

      expect(result.startsWith('---')).toBe(true);
      expect(result.endsWith('---')).toBe(true);
      expect(result).toContain('title: Test Object');
      expect(result).toContain('type: task');
      expect(result).toContain('status: in-progress');
      expect(result).toContain('priority: high');
      expect(result).toContain('created:');
      expect(result).toContain('updated:');
    });

    it('should handle objects with minimal properties', () => {
      const context = createTestContext();
      const result = generateFrontmatter(context);

      // Should at least have title, type, created, updated
      expect(result).toContain('title:');
      expect(result).toContain('type:');
      expect(result).toContain('created:');
      expect(result).toContain('updated:');
    });

    it('should handle objects with relations', () => {
      const context = createTestContext({
        tags: ['tag-1', 'tag-2'],
      });

      const result = generateFrontmatter(context);

      expect(result).toContain('tags:');
      expect(result).toContain('  - Important');
      expect(result).toContain('  - Work');
    });
  });
});
