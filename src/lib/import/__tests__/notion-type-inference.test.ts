import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  inferBuiltInType,
  getPossibleTypeMappings,
  formatConfidence,
  getConfidenceColor,
} from '../notion-type-inference';
import type { NotionDatabaseInfo, DatabasePropertySchema } from '../notion-api';
import { BuiltInTypeIds } from '../../types';

// Mock analyzeSchemaProperties
vi.mock('../notion-properties', () => ({
  analyzeSchemaProperties: vi.fn(),
}));

import { analyzeSchemaProperties } from '../notion-properties';
const mockAnalyze = analyzeSchemaProperties as ReturnType<typeof vi.fn>;

// Helper to create a database with minimal properties
function createDatabase(
  name: string,
  properties: DatabasePropertySchema[] = []
): NotionDatabaseInfo {
  return {
    id: 'test-db-id',
    name,
    icon: null,
    properties,
  };
}

// Helper to create a property
function createProperty(
  name: string,
  type: string,
  options?: Array<{ id: string; name: string; color: string }>
): DatabasePropertySchema {
  return {
    id: `prop-${name}`,
    name,
    type,
    config: options ? { options } : undefined,
  };
}

// Default analysis result (no special properties)
const defaultAnalysis = {
  hasStatus: false,
  hasPriority: false,
  hasDueDate: false,
  hasTags: false,
  hasPeople: false,
  hasUrl: false,
  hasEmail: false,
  hasPhone: false,
  hasRelations: false,
};

describe('notion-type-inference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyze.mockReturnValue({ ...defaultAnalysis });
  });

  describe('inferBuiltInType', () => {
    describe('Rule 1: Task detection with status', () => {
      it('should infer Task with 90% confidence when status has task-like values', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasStatus: true });

        const db = createDatabase('My Tasks', [
          createProperty('Status', 'status', [
            { id: '1', name: 'To Do', color: 'gray' },
            { id: '2', name: 'In Progress', color: 'blue' },
            { id: '3', name: 'Done', color: 'green' },
          ]),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.TASK);
        expect(result.typeName).toBe('Task');
        expect(result.confidence).toBe(90);
        expect(result.reason).toContain('task-like values');
      });

      it('should detect task status with select type named status', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasStatus: true });

        const db = createDatabase('Work Items', [
          createProperty('Status', 'select', [
            { id: '1', name: 'Not Started', color: 'gray' },
            { id: '2', name: 'Complete', color: 'green' },
          ]),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.TASK);
        expect(result.confidence).toBe(90);
      });

      it('should detect various task status words', () => {
        const taskStatusWords = [
          'todo',
          'to do',
          'done',
          'complete',
          'in progress',
          'doing',
          'not started',
        ];

        for (const word of taskStatusWords) {
          mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasStatus: true });

          const db = createDatabase('Items', [
            createProperty('Status', 'status', [
              { id: '1', name: word, color: 'gray' },
            ]),
          ]);

          const result = inferBuiltInType(db);
          expect(result.typeId).toBe(BuiltInTypeIds.TASK);
        }
      });

      it('should infer Task with 75% confidence when status + due date but no task-like values', () => {
        mockAnalyze.mockReturnValue({
          ...defaultAnalysis,
          hasStatus: true,
          hasDueDate: true,
        });

        const db = createDatabase('Items', [
          createProperty('Status', 'status', [
            { id: '1', name: 'Active', color: 'green' },
            { id: '2', name: 'Inactive', color: 'gray' },
          ]),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.TASK);
        expect(result.confidence).toBe(75);
        expect(result.reason).toContain('status and due date');
      });

      it('should handle status property without options', () => {
        mockAnalyze.mockReturnValue({
          ...defaultAnalysis,
          hasStatus: true,
          hasDueDate: true,
        });

        const db = createDatabase('Items', [
          createProperty('Status', 'status'), // No options defined
        ]);

        const result = inferBuiltInType(db);

        // Falls through to status + due date rule
        expect(result.typeId).toBe(BuiltInTypeIds.TASK);
        expect(result.confidence).toBe(75);
      });
    });

    describe('Rule 2: Meeting detection', () => {
      it('should infer Meeting when database name suggests meetings', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasPeople: true });

        const db = createDatabase('Team Meetings', [
          createProperty('Date', 'date'),
          createProperty('Attendees', 'people'),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.MEETING);
        expect(result.typeName).toBe('Meeting');
        expect(result.confidence).toBe(85);
      });

      it('should infer Meeting when has date + attendee properties', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasPeople: true });

        const db = createDatabase('Calendar', [
          createProperty('Date', 'date'),
          createProperty('Attendees', 'people'),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.MEETING);
      });

      it('should detect meeting with various name patterns', () => {
        const meetingNames = ['Meetings', 'Events', 'Calendar', 'Appointments'];

        for (const name of meetingNames) {
          mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasPeople: true });

          const db = createDatabase(name, [createProperty('People', 'people')]);

          const result = inferBuiltInType(db);
          expect(result.typeId).toBe(BuiltInTypeIds.MEETING);
        }
      });

      it('should detect meeting with participant/invitee properties', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasPeople: true });

        const db = createDatabase('Sessions', [
          createProperty('When', 'date'),
          createProperty('Participants', 'people'),
        ]);

        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.MEETING);
      });
    });

    describe('Rule 3: Link detection', () => {
      it('should infer Link with 85% confidence when URL property and name suggests links', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });

        const db = createDatabase('Bookmarks', [
          createProperty('URL', 'url'),
          createProperty('Title', 'title'),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.LINK);
        expect(result.typeName).toBe('Link');
        expect(result.confidence).toBe(85);
      });

      it('should detect link with various name patterns', () => {
        const linkNames = [
          'Bookmarks',
          'Links',
          'Resources',
          'Reading List',
          'Saved Items',
        ];

        for (const name of linkNames) {
          mockAnalyze.mockReturnValue({ ...defaultAnalysis });

          const db = createDatabase(name, [createProperty('URL', 'url')]);

          const result = inferBuiltInType(db);
          expect(result.typeId).toBe(BuiltInTypeIds.LINK);
          expect(result.confidence).toBe(85);
        }
      });

      it('should infer Link with 70% confidence for prominent URL property without status/people', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });

        const db = createDatabase('Items', [
          createProperty('URL', 'url'),
          createProperty('Notes', 'rich_text'),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.LINK);
        expect(result.confidence).toBe(70);
        expect(result.reason).toContain('prominent URL');
      });

      it('should infer Link for property named "link"', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });

        const db = createDatabase('Web Pages', [createProperty('Link', 'url')]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.LINK);
      });

      it('should not infer Link if status is present', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasStatus: true });

        const db = createDatabase('Items', [
          createProperty('URL', 'url'),
          createProperty('Status', 'status'),
        ]);

        // Should fall through to default (Note) since status doesn't have task-like values
        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.NOTE);
      });
    });

    describe('Rule 4: Person detection', () => {
      it('should infer Person with 85% confidence for contact-like database with email/phone', () => {
        mockAnalyze.mockReturnValue({
          ...defaultAnalysis,
          hasEmail: true,
          hasPhone: true,
        });

        const db = createDatabase('Contacts', [
          createProperty('Email', 'email'),
          createProperty('Phone', 'phone_number'),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.PERSON);
        expect(result.typeName).toBe('Person');
        expect(result.confidence).toBe(85);
      });

      it('should detect person with various contact-related names', () => {
        const contactNames = [
          'Contacts',
          'People',
          'Persons',
          'Clients',
          'Customers',
          'Team Members',
          'Directory',
        ];

        for (const name of contactNames) {
          mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasEmail: true });

          const db = createDatabase(name, [createProperty('Email', 'email')]);

          const result = inferBuiltInType(db);
          expect(result.typeId).toBe(BuiltInTypeIds.PERSON);
          expect(result.confidence).toBe(85);
        }
      });

      it('should infer Person with 60% confidence for email-only without contact name', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasEmail: true });

        const db = createDatabase('Items', [createProperty('Email', 'email')]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.PERSON);
        expect(result.confidence).toBe(60);
        expect(result.reason).toContain('email or phone');
      });

      it('should infer Person with 60% confidence for phone-only', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasPhone: true });

        const db = createDatabase('Items', [
          createProperty('Phone', 'phone_number'),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.PERSON);
        expect(result.confidence).toBe(60);
      });
    });

    describe('Rule 5: Project detection', () => {
      it('should infer Project when name suggests project with status', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasStatus: true });

        // Need to avoid triggering Task rule first - status without task-like values
        const db = createDatabase('Projects', [
          createProperty('Status', 'select', [
            { id: '1', name: 'Planning', color: 'gray' },
            { id: '2', name: 'Active', color: 'green' },
          ]),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.PROJECT);
        expect(result.typeName).toBe('Project');
        expect(result.confidence).toBe(70);
      });

      it('should detect project with various name patterns', () => {
        const projectNames = ['Projects', 'Initiatives', 'Epics', 'Goals'];

        for (const name of projectNames) {
          mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasDueDate: true });

          const db = createDatabase(name, [createProperty('Due', 'date')]);

          const result = inferBuiltInType(db);
          expect(result.typeId).toBe(BuiltInTypeIds.PROJECT);
        }
      });
    });

    describe('Rule 6: Area detection', () => {
      it('should infer Area when name suggests area without status/due date', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });

        const db = createDatabase('Areas of Responsibility', [
          createProperty('Description', 'rich_text'),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.AREA);
        expect(result.typeName).toBe('Area');
        expect(result.confidence).toBe(60);
      });

      it('should detect Areas as Area', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });
        const db = createDatabase('Areas', [createProperty('Name', 'title')]);
        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.AREA);
      });

      it('should detect Category as Area', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });
        // Use singular "Category" to test the pattern
        const db = createDatabase('My Category', [
          createProperty('Name', 'title'),
        ]);
        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.AREA);
      });

      it('should detect Departments as Area', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });
        const db = createDatabase('Departments', [
          createProperty('Name', 'title'),
        ]);
        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.AREA);
      });

      it('should detect Domains as Area', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });
        const db = createDatabase('Domains', [createProperty('Name', 'title')]);
        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.AREA);
      });

      it('should detect area with team in name', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });

        const db = createDatabase('My Team Areas', [
          createProperty('Name', 'title'),
        ]);

        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.AREA);
      });

      it('should not infer Area if has status', () => {
        // When hasStatus is true but no task-like values and no project name pattern,
        // it falls through to Note (default)
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasStatus: true });

        const db = createDatabase('Categories', [
          createProperty('Status', 'select', [
            { id: '1', name: 'Active', color: 'green' },
          ]),
        ]);

        // Falls through to Note because:
        // - Status exists but no task-like values (Rule 1 fails)
        // - No due date (Rule 1b fails)
        // - No people (Rule 2 skipped)
        // - No URL with link name (Rule 3 fails)
        // - No email/phone (Rule 4 fails)
        // - Name doesn't suggest project (Rule 5 fails)
        // - hasStatus is true so Area rule fails
        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.NOTE);
      });
    });

    describe('Default: Note fallback', () => {
      it('should infer Note with 50% confidence when no rules match', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });

        const db = createDatabase('Random Stuff', [
          createProperty('Notes', 'rich_text'),
        ]);

        const result = inferBuiltInType(db);

        expect(result.typeId).toBe(BuiltInTypeIds.NOTE);
        expect(result.typeName).toBe('Note');
        expect(result.confidence).toBe(50);
        expect(result.reason).toBe('General content database');
      });

      it('should infer Note for generic database names', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis });

        const genericNames = ['My Database', 'Table 1', 'Untitled', 'Data'];

        for (const name of genericNames) {
          const db = createDatabase(name, []);
          const result = inferBuiltInType(db);
          expect(result.typeId).toBe(BuiltInTypeIds.NOTE);
        }
      });
    });

    describe('Rule precedence', () => {
      it('should prioritize Task over Project when status has task-like values', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasStatus: true });

        const db = createDatabase('Projects', [
          createProperty('Status', 'status', [
            { id: '1', name: 'To Do', color: 'gray' },
            { id: '2', name: 'Done', color: 'green' },
          ]),
        ]);

        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.TASK);
        expect(result.confidence).toBe(90);
      });

      it('should prioritize Meeting over Link when has people and meeting name', () => {
        mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasPeople: true });

        const db = createDatabase('Meeting Links', [
          createProperty('URL', 'url'),
          createProperty('Attendees', 'people'),
        ]);

        const result = inferBuiltInType(db);
        expect(result.typeId).toBe(BuiltInTypeIds.MEETING);
      });
    });
  });

  describe('getPossibleTypeMappings', () => {
    it('should return inferred type first', () => {
      mockAnalyze.mockReturnValue({ ...defaultAnalysis });

      const db = createDatabase('Notes', []);

      const mappings = getPossibleTypeMappings(db);

      expect(mappings[0].typeId).toBe(BuiltInTypeIds.NOTE);
      expect(mappings[0].confidence).toBe(50);
    });

    it('should include all type options', () => {
      mockAnalyze.mockReturnValue({ ...defaultAnalysis });

      const db = createDatabase('Notes', []);

      const mappings = getPossibleTypeMappings(db);

      const typeIds = mappings.map((m) => m.typeId);
      expect(typeIds).toContain(BuiltInTypeIds.TASK);
      expect(typeIds).toContain(BuiltInTypeIds.NOTE);
      expect(typeIds).toContain(BuiltInTypeIds.PROJECT);
      expect(typeIds).toContain(BuiltInTypeIds.AREA);
      expect(typeIds).toContain(BuiltInTypeIds.MEETING);
      expect(typeIds).toContain(BuiltInTypeIds.LINK);
      expect(typeIds).toContain(BuiltInTypeIds.PERSON);
      expect(typeIds).toContain(BuiltInTypeIds.TAG);
    });

    it('should set confidence to 0 for non-inferred types', () => {
      mockAnalyze.mockReturnValue({ ...defaultAnalysis, hasStatus: true });

      const db = createDatabase('Tasks', [
        createProperty('Status', 'status', [
          { id: '1', name: 'Done', color: 'green' },
        ]),
      ]);

      const mappings = getPossibleTypeMappings(db);

      // First should be Task with confidence
      expect(mappings[0].typeId).toBe(BuiltInTypeIds.TASK);
      expect(mappings[0].confidence).toBe(90);

      // Others should have 0 confidence
      const alternatives = mappings.slice(1);
      for (const alt of alternatives) {
        expect(alt.confidence).toBe(0);
        expect(alt.reason).toBe('Alternative type');
      }
    });

    it('should not duplicate the inferred type', () => {
      mockAnalyze.mockReturnValue({ ...defaultAnalysis });

      const db = createDatabase('Notes', []);

      const mappings = getPossibleTypeMappings(db);
      const noteCount = mappings.filter(
        (m) => m.typeId === BuiltInTypeIds.NOTE
      ).length;

      expect(noteCount).toBe(1);
    });

    it('should include correct type names', () => {
      mockAnalyze.mockReturnValue({ ...defaultAnalysis });

      const db = createDatabase('Test', []);

      const mappings = getPossibleTypeMappings(db);

      const typeNameMap = new Map(mappings.map((m) => [m.typeId, m.typeName]));
      expect(typeNameMap.get(BuiltInTypeIds.TASK)).toBe('Task');
      expect(typeNameMap.get(BuiltInTypeIds.NOTE)).toBe('Note');
      expect(typeNameMap.get(BuiltInTypeIds.PROJECT)).toBe('Project');
      expect(typeNameMap.get(BuiltInTypeIds.AREA)).toBe('Area');
      expect(typeNameMap.get(BuiltInTypeIds.MEETING)).toBe('Meeting');
      expect(typeNameMap.get(BuiltInTypeIds.LINK)).toBe('Link');
      expect(typeNameMap.get(BuiltInTypeIds.PERSON)).toBe('Person');
      expect(typeNameMap.get(BuiltInTypeIds.TAG)).toBe('Tag');
    });
  });

  describe('formatConfidence', () => {
    it('should return "High" for confidence >= 80', () => {
      expect(formatConfidence(100)).toBe('High');
      expect(formatConfidence(90)).toBe('High');
      expect(formatConfidence(80)).toBe('High');
    });

    it('should return "Medium" for confidence >= 60 and < 80', () => {
      expect(formatConfidence(79)).toBe('Medium');
      expect(formatConfidence(70)).toBe('Medium');
      expect(formatConfidence(60)).toBe('Medium');
    });

    it('should return "Low" for confidence >= 40 and < 60', () => {
      expect(formatConfidence(59)).toBe('Low');
      expect(formatConfidence(50)).toBe('Low');
      expect(formatConfidence(40)).toBe('Low');
    });

    it('should return "Uncertain" for confidence < 40', () => {
      expect(formatConfidence(39)).toBe('Uncertain');
      expect(formatConfidence(20)).toBe('Uncertain');
      expect(formatConfidence(0)).toBe('Uncertain');
    });

    it('should handle boundary values', () => {
      expect(formatConfidence(80)).toBe('High');
      expect(formatConfidence(79)).toBe('Medium');
      expect(formatConfidence(60)).toBe('Medium');
      expect(formatConfidence(59)).toBe('Low');
      expect(formatConfidence(40)).toBe('Low');
      expect(formatConfidence(39)).toBe('Uncertain');
    });
  });

  describe('getConfidenceColor', () => {
    it('should return "green" for confidence >= 80', () => {
      expect(getConfidenceColor(100)).toBe('green');
      expect(getConfidenceColor(90)).toBe('green');
      expect(getConfidenceColor(80)).toBe('green');
    });

    it('should return "yellow" for confidence >= 60 and < 80', () => {
      expect(getConfidenceColor(79)).toBe('yellow');
      expect(getConfidenceColor(70)).toBe('yellow');
      expect(getConfidenceColor(60)).toBe('yellow');
    });

    it('should return "orange" for confidence >= 40 and < 60', () => {
      expect(getConfidenceColor(59)).toBe('orange');
      expect(getConfidenceColor(50)).toBe('orange');
      expect(getConfidenceColor(40)).toBe('orange');
    });

    it('should return "gray" for confidence < 40', () => {
      expect(getConfidenceColor(39)).toBe('gray');
      expect(getConfidenceColor(20)).toBe('gray');
      expect(getConfidenceColor(0)).toBe('gray');
    });

    it('should handle boundary values', () => {
      expect(getConfidenceColor(80)).toBe('green');
      expect(getConfidenceColor(79)).toBe('yellow');
      expect(getConfidenceColor(60)).toBe('yellow');
      expect(getConfidenceColor(59)).toBe('orange');
      expect(getConfidenceColor(40)).toBe('orange');
      expect(getConfidenceColor(39)).toBe('gray');
    });
  });
});
