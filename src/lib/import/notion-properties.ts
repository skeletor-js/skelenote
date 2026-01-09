/**
 * Notion Property to Skelenote Property Mapper
 *
 * Converts Notion property values to Skelenote property format.
 * Supports user-configurable property mappings with auto-inference.
 */

import type {
  NotionPropertyValue,
  NotionDatabaseInfo,
  DatabasePropertySchema,
} from './notion-api';
import type { PropertyValue } from '../types';
import { BuiltInTypeIds } from '../types';
import { getBuiltInType } from '../types/built-in-types';

/**
 * A mapping from a Notion property to a Skelenote property
 */
export interface PropertyMapping {
  /** Notion property name */
  notionProperty: string;
  /** Notion property type */
  notionType: string;
  /** Target Skelenote property ID, or 'skip' to ignore */
  skelenoteProperty: string | 'skip';
  /** How the mapping was determined */
  confidence: 'auto' | 'suggested' | 'manual';
  /** Human-readable reason for the mapping */
  reason: string;
}

/**
 * Get the schema properties for a Skelenote type that can be mapped to
 */
export function getMappableProperties(typeId: string): Array<{
  id: string;
  name: string;
  type: string;
}> {
  const typeDef = getBuiltInType(typeId);
  if (!typeDef) return [];

  // Filter out hidden and relation properties (relations are handled separately)
  return typeDef.schema
    .filter((prop) => !prop.hidden && prop.type !== 'relation')
    .map((prop) => ({
      id: prop.id,
      name: prop.name,
      type: prop.type,
    }));
}

/**
 * Infer property mappings from a Notion database schema to a Skelenote type
 */
export function inferPropertyMappings(
  database: NotionDatabaseInfo,
  targetTypeId: string
): PropertyMapping[] {
  const mappings: PropertyMapping[] = [];
  const targetProps = getMappableProperties(targetTypeId);
  const usedTargetProps = new Set<string>();

  for (const notionProp of database.properties) {
    const mapping = inferSinglePropertyMapping(
      notionProp,
      targetTypeId,
      targetProps,
      usedTargetProps
    );
    mappings.push(mapping);

    if (mapping.skelenoteProperty !== 'skip') {
      usedTargetProps.add(mapping.skelenoteProperty);
    }
  }

  return mappings;
}

/**
 * Infer mapping for a single property
 */
function inferSinglePropertyMapping(
  notionProp: DatabasePropertySchema,
  targetTypeId: string,
  targetProps: Array<{ id: string; name: string; type: string }>,
  usedTargetProps: Set<string>
): PropertyMapping {
  const nameLower = notionProp.name.toLowerCase();
  const notionType = notionProp.type;

  // Title property -> title or name
  if (notionType === 'title') {
    const titleProp =
      targetTypeId === BuiltInTypeIds.PROJECT ||
      targetTypeId === BuiltInTypeIds.AREA ||
      targetTypeId === BuiltInTypeIds.TAG ||
      targetTypeId === BuiltInTypeIds.PERSON
        ? 'name'
        : 'title';

    if (!usedTargetProps.has(titleProp)) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: titleProp,
        confidence: 'auto',
        reason: 'Title property maps to object name/title',
      };
    }
  }

  // Exact name matches
  for (const targetProp of targetProps) {
    if (usedTargetProps.has(targetProp.id)) continue;

    if (nameLower === targetProp.id.toLowerCase()) {
      if (areTypesCompatible(notionType, targetProp.type)) {
        return {
          notionProperty: notionProp.name,
          notionType,
          skelenoteProperty: targetProp.id,
          confidence: 'auto',
          reason: `Exact name match: "${notionProp.name}" → "${targetProp.name}"`,
        };
      }
    }
  }

  // Semantic matches
  const semanticMatch = findSemanticMatch(
    notionProp,
    targetTypeId,
    targetProps,
    usedTargetProps
  );
  if (semanticMatch) {
    return semanticMatch;
  }

  // No match found - skip
  return {
    notionProperty: notionProp.name,
    notionType,
    skelenoteProperty: 'skip',
    confidence: 'suggested',
    reason: 'No compatible target property found',
  };
}

/**
 * Find semantic matches based on property name patterns
 */
function findSemanticMatch(
  notionProp: DatabasePropertySchema,
  targetTypeId: string,
  targetProps: Array<{ id: string; name: string; type: string }>,
  usedTargetProps: Set<string>
): PropertyMapping | null {
  const nameLower = notionProp.name.toLowerCase();
  const notionType = notionProp.type;

  // Status patterns
  if (
    (notionType === 'status' || notionType === 'select') &&
    (nameLower === 'status' || nameLower === 'state')
  ) {
    if (
      targetTypeId === BuiltInTypeIds.TASK &&
      !usedTargetProps.has('status')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'status',
        confidence: 'auto',
        reason: 'Status property detected',
      };
    }
  }

  // Priority patterns
  if (
    (notionType === 'select' || notionType === 'status') &&
    nameLower.includes('priority')
  ) {
    if (
      targetTypeId === BuiltInTypeIds.TASK &&
      !usedTargetProps.has('priority')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'priority',
        confidence: 'auto',
        reason: 'Priority property detected',
      };
    }
  }

  // Due date patterns
  if (
    notionType === 'date' &&
    (nameLower.includes('due') || nameLower === 'deadline')
  ) {
    if (
      targetTypeId === BuiltInTypeIds.TASK &&
      !usedTargetProps.has('dueDate')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'dueDate',
        confidence: 'auto',
        reason: 'Due date property detected',
      };
    }
  }

  // Start date patterns
  if (
    notionType === 'date' &&
    (nameLower.includes('start') || nameLower === 'begin')
  ) {
    if (
      targetTypeId === BuiltInTypeIds.PROJECT &&
      !usedTargetProps.has('startDate')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'startDate',
        confidence: 'auto',
        reason: 'Start date property detected',
      };
    }
    if (
      targetTypeId === BuiltInTypeIds.MEETING &&
      !usedTargetProps.has('startTime')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'startTime',
        confidence: 'auto',
        reason: 'Meeting start time detected',
      };
    }
  }

  // End date patterns
  if (notionType === 'date' && nameLower.includes('end')) {
    if (
      targetTypeId === BuiltInTypeIds.PROJECT &&
      !usedTargetProps.has('endDate')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'endDate',
        confidence: 'auto',
        reason: 'End date property detected',
      };
    }
  }

  // URL patterns
  if (
    notionType === 'url' ||
    (notionType === 'rich_text' &&
      (nameLower === 'url' || nameLower === 'link' || nameLower === 'website'))
  ) {
    if (targetTypeId === BuiltInTypeIds.LINK && !usedTargetProps.has('url')) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'url',
        confidence: 'auto',
        reason: 'URL property detected',
      };
    }
    if (
      targetTypeId === BuiltInTypeIds.PERSON &&
      !usedTargetProps.has('website')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'website',
        confidence: 'suggested',
        reason: 'URL could be website',
      };
    }
  }

  // Email patterns
  if (
    notionType === 'email' ||
    (notionType === 'rich_text' && nameLower.includes('email'))
  ) {
    if (
      targetTypeId === BuiltInTypeIds.PERSON &&
      !usedTargetProps.has('email')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'email',
        confidence: 'auto',
        reason: 'Email property detected',
      };
    }
  }

  // Phone patterns
  if (
    notionType === 'phone_number' ||
    (notionType === 'rich_text' && nameLower.includes('phone'))
  ) {
    if (
      targetTypeId === BuiltInTypeIds.PERSON &&
      !usedTargetProps.has('phone')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'phone',
        confidence: 'auto',
        reason: 'Phone property detected',
      };
    }
  }

  // Company patterns
  if (
    notionType === 'rich_text' &&
    (nameLower === 'company' || nameLower === 'organization')
  ) {
    if (
      targetTypeId === BuiltInTypeIds.PERSON &&
      !usedTargetProps.has('company')
    ) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'company',
        confidence: 'auto',
        reason: 'Company property detected',
      };
    }
  }

  // Description patterns
  if (
    notionType === 'rich_text' &&
    (nameLower === 'description' ||
      nameLower === 'notes' ||
      nameLower === 'summary')
  ) {
    const descProp = targetProps.find((p) => p.id === 'description');
    if (descProp && !usedTargetProps.has('description')) {
      return {
        notionProperty: notionProp.name,
        notionType,
        skelenoteProperty: 'description',
        confidence: 'auto',
        reason: 'Description property detected',
      };
    }
  }

  return null;
}

/**
 * Check if Notion property type is compatible with Skelenote property type
 */
function areTypesCompatible(
  notionType: string,
  skelenoteType: string
): boolean {
  const compatMap: Record<string, string[]> = {
    title: ['text'],
    rich_text: ['text'],
    number: ['number'],
    select: ['select', 'text'],
    multi_select: ['text'], // Will be converted
    status: ['select'],
    date: ['date'],
    checkbox: ['checkbox'],
    url: ['url', 'text'],
    email: ['email', 'text'],
    phone_number: ['phone', 'text'],
    formula: ['text', 'number'],
    rollup: ['text', 'number'],
    files: ['text', 'url'],
  };

  const compatible = compatMap[notionType] || [];
  return compatible.includes(skelenoteType);
}

/**
 * Status value mapping from Notion to Skelenote task status
 */
const STATUS_MAP: Record<string, string> = {
  // Not started group
  'not started': 'todo',
  'to do': 'todo',
  todo: 'todo',
  backlog: 'todo',
  planned: 'todo',
  // In progress group
  'in progress': 'in-progress',
  'in-progress': 'in-progress',
  doing: 'in-progress',
  started: 'in-progress',
  active: 'in-progress',
  // Waiting/blocked
  waiting: 'waiting',
  blocked: 'waiting',
  'on hold': 'waiting',
  pending: 'waiting',
  // Done group
  done: 'done',
  complete: 'done',
  completed: 'done',
  finished: 'done',
  closed: 'done',
  archived: 'done',
};

/**
 * Priority mapping from Notion to Skelenote
 */
const PRIORITY_MAP: Record<string, string> = {
  low: 'low',
  medium: 'medium',
  normal: 'medium',
  high: 'high',
  urgent: 'urgent',
  critical: 'urgent',
  '1': 'low',
  '2': 'medium',
  '3': 'high',
  '4': 'urgent',
  p0: 'urgent',
  p1: 'high',
  p2: 'medium',
  p3: 'low',
  p4: 'low',
};

/**
 * Result of converting Notion properties
 */
export interface ConvertedProperties {
  /** Properties that map directly to Skelenote built-in properties */
  properties: Record<string, PropertyValue>;
  /** Tag names that need to be created/resolved */
  pendingTags: string[];
  /** Person names that need to be created/resolved */
  pendingPeople: string[];
  /** Page IDs for relation properties that need resolution */
  pendingRelations: Map<string, string[]>; // propertyName -> page IDs
}

/**
 * Convert all properties from a Notion page to Skelenote format
 */
export function convertNotionProperties(
  notionProps: Record<string, NotionPropertyValue>,
  targetTypeId: string
): ConvertedProperties {
  const result: ConvertedProperties = {
    properties: {},
    pendingTags: [],
    pendingPeople: [],
    pendingRelations: new Map(),
  };

  for (const [name, prop] of Object.entries(notionProps)) {
    convertProperty(name, prop, targetTypeId, result);
  }

  return result;
}

/**
 * Convert a single property
 */
function convertProperty(
  name: string,
  prop: NotionPropertyValue,
  targetTypeId: string,
  result: ConvertedProperties
): void {
  const nameLower = name.toLowerCase();
  const { type, value } = prop;

  if (value === null || value === undefined) return;

  // Title property -> title or name based on target type
  if (type === 'title') {
    if (
      targetTypeId === BuiltInTypeIds.PROJECT ||
      targetTypeId === BuiltInTypeIds.AREA
    ) {
      result.properties.name = value as string;
    } else {
      result.properties.title = value as string;
    }
    return;
  }

  // Status property -> map to task status
  if (
    type === 'status' ||
    (type === 'select' && (nameLower === 'status' || nameLower === 'state'))
  ) {
    if (typeof value === 'string' && targetTypeId === BuiltInTypeIds.TASK) {
      const normalized = value.toLowerCase().trim();
      result.properties.status = STATUS_MAP[normalized] || 'todo';
    }
    return;
  }

  // Priority property
  if (nameLower === 'priority' && (type === 'select' || type === 'status')) {
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      const mapped = PRIORITY_MAP[normalized];
      if (mapped) {
        result.properties.priority = mapped;
      }
    }
    return;
  }

  // Multi-select with tag-like names -> Tags
  if (type === 'multi_select' && isTagProperty(nameLower)) {
    if (Array.isArray(value)) {
      result.pendingTags.push(...(value as string[]));
    }
    return;
  }

  // Date properties
  if (type === 'date' && value) {
    const dateValue = value as { start: string; end?: string };
    const startDate = new Date(dateValue.start);

    if (!isNaN(startDate.getTime())) {
      if (nameLower === 'due' || nameLower.includes('due')) {
        result.properties.dueDate = startDate.getTime();
      } else if (nameLower.includes('start')) {
        result.properties.startDate = startDate.getTime();
      } else if (nameLower.includes('end') && dateValue.end) {
        const endDate = new Date(dateValue.end);
        if (!isNaN(endDate.getTime())) {
          result.properties.endDate = endDate.getTime();
        }
      } else if (
        nameLower === 'date' ||
        nameLower === 'created' ||
        nameLower === 'meeting date'
      ) {
        result.properties.date = startDate.getTime();
        // For meetings, also set startTime
        if (targetTypeId === BuiltInTypeIds.MEETING) {
          result.properties.startTime = startDate.getTime();
        }
      }
    }
    return;
  }

  // People property -> pending people for creation
  if (type === 'people' && Array.isArray(value)) {
    result.pendingPeople.push(...(value as string[]));
    return;
  }

  // Relation property -> pending relations
  if (type === 'relation' && Array.isArray(value)) {
    const pageIds = value as string[];
    if (pageIds.length > 0) {
      result.pendingRelations.set(name, pageIds);
    }
    return;
  }

  // URL property
  if (type === 'url' && typeof value === 'string') {
    result.properties.url = value;
    return;
  }

  // Email property
  if (type === 'email' && typeof value === 'string') {
    result.properties.email = value;
    return;
  }

  // Phone property
  if (type === 'phone_number' && typeof value === 'string') {
    result.properties.phone = value;
    return;
  }

  // Checkbox property
  if (type === 'checkbox' && typeof value === 'boolean') {
    result.properties[toCamelCase(name)] = value;
    return;
  }

  // Number property
  if (type === 'number' && typeof value === 'number') {
    result.properties[toCamelCase(name)] = value;
    return;
  }

  // Rich text property
  if (type === 'rich_text' && typeof value === 'string' && value.trim()) {
    // Map common property names
    if (
      nameLower === 'description' ||
      nameLower === 'notes' ||
      nameLower === 'summary'
    ) {
      result.properties.description = value;
    } else if (nameLower === 'company' || nameLower === 'organization') {
      result.properties.company = value;
    } else {
      result.properties[toCamelCase(name)] = value;
    }
    return;
  }

  // Select property (not status/priority)
  if (type === 'select' && typeof value === 'string') {
    result.properties[toCamelCase(name)] = value;
    return;
  }

  // Formula and rollup are read-only computed values
  if ((type === 'formula' || type === 'rollup') && value !== null) {
    // Store as generic property for reference
    if (typeof value === 'string' || typeof value === 'number') {
      result.properties[toCamelCase(name)] = value;
    }
    return;
  }

  // Files property -> store URLs
  if (type === 'files' && Array.isArray(value)) {
    const urls = (value as string[]).filter(Boolean);
    if (urls.length > 0) {
      if (nameLower === 'website' || nameLower === 'link') {
        result.properties.url = urls[0];
      } else {
        result.properties[toCamelCase(name)] = urls.join(', ');
      }
    }
    return;
  }
}

/**
 * Check if a property name indicates tags
 */
function isTagProperty(name: string): boolean {
  return (
    name === 'tags' ||
    name === 'labels' ||
    name === 'categories' ||
    name === 'topics' ||
    name === 'keywords'
  );
}

/**
 * Convert property name to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
}

/**
 * Map a Notion database schema to Skelenote property definitions
 * Used to understand what properties are available in a database
 */
export function analyzeSchemaProperties(properties: DatabasePropertySchema[]): {
  hasStatus: boolean;
  hasPriority: boolean;
  hasDueDate: boolean;
  hasTags: boolean;
  hasPeople: boolean;
  hasUrl: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasRelations: boolean;
} {
  let hasStatus = false;
  let hasPriority = false;
  let hasDueDate = false;
  let hasTags = false;
  let hasPeople = false;
  let hasUrl = false;
  let hasEmail = false;
  let hasPhone = false;
  let hasRelations = false;

  for (const prop of properties) {
    const nameLower = prop.name.toLowerCase();

    if (
      prop.type === 'status' ||
      (prop.type === 'select' &&
        (nameLower === 'status' || nameLower === 'state'))
    ) {
      hasStatus = true;
    }
    if (
      nameLower === 'priority' &&
      (prop.type === 'select' || prop.type === 'status')
    ) {
      hasPriority = true;
    }
    if (
      prop.type === 'date' &&
      (nameLower.includes('due') || nameLower === 'deadline')
    ) {
      hasDueDate = true;
    }
    if (prop.type === 'multi_select' && isTagProperty(nameLower)) {
      hasTags = true;
    }
    if (prop.type === 'people') {
      hasPeople = true;
    }
    if (
      prop.type === 'url' ||
      nameLower === 'url' ||
      nameLower === 'link' ||
      nameLower === 'website'
    ) {
      hasUrl = true;
    }
    if (prop.type === 'email' || nameLower === 'email') {
      hasEmail = true;
    }
    if (prop.type === 'phone_number' || nameLower === 'phone') {
      hasPhone = true;
    }
    if (prop.type === 'relation') {
      hasRelations = true;
    }
  }

  return {
    hasStatus,
    hasPriority,
    hasDueDate,
    hasTags,
    hasPeople,
    hasUrl,
    hasEmail,
    hasPhone,
    hasRelations,
  };
}

/**
 * Get a user-friendly summary of what a Notion database contains
 */
export function summarizeDatabaseSchema(db: NotionDatabaseInfo): string {
  const analysis = analyzeSchemaProperties(db.properties);
  const features: string[] = [];

  if (analysis.hasStatus) features.push('status');
  if (analysis.hasPriority) features.push('priority');
  if (analysis.hasDueDate) features.push('due dates');
  if (analysis.hasTags) features.push('tags');
  if (analysis.hasPeople) features.push('people');
  if (analysis.hasRelations) features.push('relations');

  if (features.length === 0) {
    return `${db.properties.length} properties`;
  }

  return features.join(', ');
}
