/**
 * Notion Database to Skelenote Type Inference
 *
 * Analyzes Notion database schemas to determine the best matching
 * built-in Skelenote type.
 */

import type { NotionDatabaseInfo } from './notion-api';
import { analyzeSchemaProperties } from './notion-properties';
import { BuiltInTypeIds } from '../types';

/**
 * Result of type inference
 */
export interface TypeInferenceResult {
  /** The inferred Skelenote type ID */
  typeId: string;
  /** Human-readable type name */
  typeName: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Reason for the inference */
  reason: string;
}

/**
 * Infer the best matching Skelenote type for a Notion database
 */
export function inferBuiltInType(
  database: NotionDatabaseInfo
): TypeInferenceResult {
  const analysis = analyzeSchemaProperties(database.properties);
  const nameLower = database.name.toLowerCase();
  const propNames = database.properties.map((p) => p.name.toLowerCase());

  // Rule 1: Has status property with todo/done-like values → Task
  if (analysis.hasStatus) {
    // Check if status options look like task statuses
    const statusProp = database.properties.find(
      (p) =>
        p.type === 'status' ||
        (p.type === 'select' && p.name.toLowerCase() === 'status')
    );

    if (statusProp?.config?.options) {
      const optionNames = statusProp.config.options.map((o) =>
        o.name.toLowerCase()
      );
      const taskStatusWords = [
        'todo',
        'to do',
        'done',
        'complete',
        'in progress',
        'doing',
        'not started',
      ];

      const hasTaskStatus = optionNames.some((opt) =>
        taskStatusWords.some((word) => opt.includes(word))
      );

      if (hasTaskStatus) {
        return {
          typeId: BuiltInTypeIds.TASK,
          typeName: 'Task',
          confidence: 90,
          reason:
            'Has status property with task-like values (todo, done, etc.)',
        };
      }
    }

    // Status without clear task values, but with due date → likely Task
    if (analysis.hasDueDate) {
      return {
        typeId: BuiltInTypeIds.TASK,
        typeName: 'Task',
        confidence: 75,
        reason: 'Has status and due date properties',
      };
    }
  }

  // Rule 2: Has date + people → Meeting
  if (analysis.hasPeople) {
    const hasDateProp = database.properties.some((p) => {
      const pName = p.name.toLowerCase();
      return (
        p.type === 'date' &&
        (pName.includes('date') ||
          pName.includes('time') ||
          pName === 'when' ||
          pName === 'scheduled')
      );
    });

    const nameSuggestsMeeting =
      nameLower.includes('meeting') ||
      nameLower.includes('event') ||
      nameLower.includes('calendar') ||
      nameLower.includes('appointment');

    const hasAttendeeProp = propNames.some(
      (n) =>
        n.includes('attendee') ||
        n.includes('participant') ||
        n.includes('invitee')
    );

    if ((hasDateProp && hasAttendeeProp) || nameSuggestsMeeting) {
      return {
        typeId: BuiltInTypeIds.MEETING,
        typeName: 'Meeting',
        confidence: 85,
        reason: 'Has date and people properties, suggests meetings',
      };
    }
  }

  // Rule 3: Has URL as primary property or name suggests links → Link
  const urlProp = database.properties.find(
    (p) =>
      p.type === 'url' ||
      p.name.toLowerCase() === 'url' ||
      p.name.toLowerCase() === 'link'
  );

  const nameSuggestsLinks =
    nameLower.includes('bookmark') ||
    nameLower.includes('link') ||
    nameLower.includes('resource') ||
    nameLower.includes('reading list') ||
    nameLower.includes('saved');

  if (urlProp && nameSuggestsLinks) {
    return {
      typeId: BuiltInTypeIds.LINK,
      typeName: 'Link',
      confidence: 85,
      reason: 'Has URL property and database name suggests links/bookmarks',
    };
  }

  if (urlProp && !analysis.hasStatus && !analysis.hasPeople) {
    // URL is likely the main content, not an attachment
    const urlIsTitle =
      urlProp.name.toLowerCase() === 'url' ||
      urlProp.name.toLowerCase() === 'link';
    if (urlIsTitle) {
      return {
        typeId: BuiltInTypeIds.LINK,
        typeName: 'Link',
        confidence: 70,
        reason: 'Has prominent URL property',
      };
    }
  }

  // Rule 4: Has email/phone → Person/Contact
  if (analysis.hasEmail || analysis.hasPhone) {
    const nameSuggestsContact =
      nameLower.includes('contact') ||
      nameLower.includes('people') ||
      nameLower.includes('person') ||
      nameLower.includes('client') ||
      nameLower.includes('customer') ||
      nameLower.includes('team') ||
      nameLower.includes('member') ||
      nameLower.includes('directory');

    if (nameSuggestsContact || (analysis.hasEmail && analysis.hasPhone)) {
      return {
        typeId: BuiltInTypeIds.PERSON,
        typeName: 'Person',
        confidence: 85,
        reason: 'Has contact information (email/phone)',
      };
    }

    if (analysis.hasEmail || analysis.hasPhone) {
      return {
        typeId: BuiltInTypeIds.PERSON,
        typeName: 'Person',
        confidence: 60,
        reason: 'Has email or phone property',
      };
    }
  }

  // Rule 5: Name suggests project → Project
  const nameSuggestsProject =
    nameLower.includes('project') ||
    nameLower.includes('initiative') ||
    nameLower.includes('epic') ||
    nameLower.includes('goal');

  if (nameSuggestsProject && (analysis.hasStatus || analysis.hasDueDate)) {
    return {
      typeId: BuiltInTypeIds.PROJECT,
      typeName: 'Project',
      confidence: 70,
      reason: 'Database name suggests projects',
    };
  }

  // Rule 6: Name suggests area → Area
  const nameSuggestsArea =
    nameLower.includes('area') ||
    nameLower.includes('category') ||
    nameLower.includes('department') ||
    nameLower.includes('team') ||
    nameLower.includes('domain');

  if (nameSuggestsArea && !analysis.hasStatus && !analysis.hasDueDate) {
    return {
      typeId: BuiltInTypeIds.AREA,
      typeName: 'Area',
      confidence: 60,
      reason: 'Database name suggests areas/categories',
    };
  }

  // Default: Note (catch-all)
  return {
    typeId: BuiltInTypeIds.NOTE,
    typeName: 'Note',
    confidence: 50,
    reason: 'General content database',
  };
}

/**
 * Get all possible type mappings for a database (for user override)
 */
export function getPossibleTypeMappings(
  database: NotionDatabaseInfo
): TypeInferenceResult[] {
  const inferred = inferBuiltInType(database);
  const allTypes: TypeInferenceResult[] = [inferred];

  // Add other possibilities with lower confidence
  const typeIds = [
    BuiltInTypeIds.TASK,
    BuiltInTypeIds.NOTE,
    BuiltInTypeIds.PROJECT,
    BuiltInTypeIds.AREA,
    BuiltInTypeIds.MEETING,
    BuiltInTypeIds.LINK,
    BuiltInTypeIds.PERSON,
    BuiltInTypeIds.TAG,
  ];

  const typeNames: Record<string, string> = {
    [BuiltInTypeIds.TASK]: 'Task',
    [BuiltInTypeIds.NOTE]: 'Note',
    [BuiltInTypeIds.PROJECT]: 'Project',
    [BuiltInTypeIds.AREA]: 'Area',
    [BuiltInTypeIds.MEETING]: 'Meeting',
    [BuiltInTypeIds.LINK]: 'Link',
    [BuiltInTypeIds.PERSON]: 'Person',
    [BuiltInTypeIds.TAG]: 'Tag',
  };

  for (const typeId of typeIds) {
    if (typeId !== inferred.typeId) {
      allTypes.push({
        typeId,
        typeName: typeNames[typeId],
        confidence: 0,
        reason: 'Alternative type',
      });
    }
  }

  return allTypes;
}

/**
 * Format confidence as a visual indicator
 */
export function formatConfidence(confidence: number): string {
  if (confidence >= 80) return 'High';
  if (confidence >= 60) return 'Medium';
  if (confidence >= 40) return 'Low';
  return 'Uncertain';
}

/**
 * Get a badge color for confidence level
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'green';
  if (confidence >= 60) return 'yellow';
  if (confidence >= 40) return 'orange';
  return 'gray';
}
