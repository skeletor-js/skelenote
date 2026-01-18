/**
 * Performance benchmarks for Template operations
 *
 * Run with: pnpm vitest bench src/lib/templates/__tests__/templates.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore } from '@/lib/loro/objects';
import { registerBuiltInTypes, BuiltInTypeIds } from '@/lib/types';
import {
  getTemplates,
  getTemplatesForType,
  createTemplate,
  createFromTemplate,
} from '../manager';
import { expandPlaceholders } from '../placeholders';

describe('Template Query Performance', () => {
  let store: ObjectStore;

  beforeAll(() => {
    const doc = new LoroDoc();
    store = new ObjectStore(doc);
    registerBuiltInTypes(store);

    // Create 50 templates of various types
    const types = [
      BuiltInTypeIds.NOTE,
      BuiltInTypeIds.TASK,
      BuiltInTypeIds.PROJECT,
      BuiltInTypeIds.MEETING,
    ];

    for (let i = 0; i < 50; i++) {
      createTemplate(store, {
        name: `Template ${i}`,
        targetTypeId: types[i % types.length],
        defaultProperties: {
          title: `{{date}} - Item ${i}`,
          description: 'Template description',
        },
      });
    }
  });

  bench('get all templates (50)', () => {
    getTemplates(store);
  });

  bench('get templates for type', () => {
    getTemplatesForType(store, BuiltInTypeIds.NOTE);
  });
});

describe('Template Creation Performance', () => {
  bench(
    'create template',
    () => {
      const doc = new LoroDoc();
      const store = new ObjectStore(doc);
      registerBuiltInTypes(store);

      createTemplate(store, {
        name: 'Test Template',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: {
          title: '{{date}} - New Note',
          priority: 2,
        },
        hasContent: true,
      });
    },
    { iterations: 50 }
  );
});

describe('Create from Template Performance', () => {
  let store: ObjectStore;
  let templateId: string;

  beforeAll(() => {
    const doc = new LoroDoc();
    store = new ObjectStore(doc);
    registerBuiltInTypes(store);

    const template = createTemplate(store, {
      name: 'Meeting Notes',
      targetTypeId: BuiltInTypeIds.MEETING,
      defaultProperties: {
        title: '{{date}} - Meeting Notes',
        attendees: '{{time}} meeting',
      },
      hasContent: true,
    });
    templateId = template.id;
  });

  bench('create object from template', () => {
    createFromTemplate(store, templateId, {
      properties: { title: 'Override Title' },
    });
  });

  bench('create object from template with context', () => {
    createFromTemplate(store, templateId, {
      context: {
        date: new Date(),
        customFields: { project: 'Skelenote' },
      },
    });
  });
});

describe('Placeholder Expansion Performance', () => {
  bench('expand simple placeholders', () => {
    expandPlaceholders('Meeting on {{date}} at {{time}}', {
      date: new Date(),
    });
  });

  bench('expand complex placeholders', () => {
    expandPlaceholders(
      '{{date}} - Week {{week}} of {{month}} {{year}}. Tomorrow: {{tomorrow}}',
      { date: new Date() }
    );
  });

  bench(
    'expand 100 strings',
    () => {
      const template = '{{date}} - Item {{time}}';
      const context = { date: new Date() };
      for (let i = 0; i < 100; i++) {
        expandPlaceholders(template, context);
      }
    },
    { iterations: 10 }
  );
});
