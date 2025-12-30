/**
 * Shared utilities for filter display and manipulation in saved views
 */

import type { FilterOperator } from '@/lib/loro';
import type { PropertyType } from '@/lib/types';

/** Extended field info including options for select types */
export interface FieldInfo {
  id: string;
  name: string;
  type: PropertyType | 'boolean';
  options?: string[];
}

/** Operator labels for display */
export const ALL_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less or equal' },
  { value: 'in', label: 'is one of' },
  { value: 'notIn', label: 'is not one of' },
  { value: 'isNull', label: 'is empty' },
  { value: 'isNotNull', label: 'is not empty' },
];

/** Operator labels as a lookup map */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'equals',
  neq: 'does not equal',
  gt: 'is after',
  gte: 'is on or after',
  lt: 'is before',
  lte: 'is on or before',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  in: 'is one of',
  notIn: 'is not one of',
  isNull: 'is empty',
  isNotNull: 'is not empty',
};

/** Built-in fields available on all objects */
export const BUILT_IN_FIELDS: FieldInfo[] = [
  { id: 'createdAt', name: 'Created Date', type: 'date' },
  { id: 'updatedAt', name: 'Updated Date', type: 'date' },
  { id: 'inboxed', name: 'In Inbox', type: 'boolean' },
];

/** Operators appropriate for different field types */
export const TEXT_OPERATORS: FilterOperator[] = ['eq', 'neq', 'contains', 'startsWith', 'endsWith', 'isNull', 'isNotNull'];
export const NUMBER_OPERATORS: FilterOperator[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isNull', 'isNotNull'];
export const DATE_OPERATORS: FilterOperator[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isNull', 'isNotNull'];
export const SELECT_OPERATORS: FilterOperator[] = ['eq', 'neq', 'isNull', 'isNotNull'];
export const BOOLEAN_OPERATORS: FilterOperator[] = ['eq', 'neq'];

/** Recurrence frequency options for filtering */
export const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

/** Get operators appropriate for a field type */
export function getOperatorsForType(type: PropertyType | 'boolean'): FilterOperator[] {
  switch (type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
    case 'file':
      return TEXT_OPERATORS;
    case 'number':
      return NUMBER_OPERATORS;
    case 'date':
      return DATE_OPERATORS;
    case 'select':
    case 'recurrence':
      return SELECT_OPERATORS;
    case 'checkbox':
    case 'boolean':
      return BOOLEAN_OPERATORS;
    case 'relation':
      return SELECT_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

/** Format a date value for display */
export function formatDateValue(value: unknown): string {
  if (typeof value === 'number') {
    return new Date(value).toLocaleDateString();
  }
  if (typeof value === 'string') {
    // Try parsing as date string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }
  return String(value ?? '');
}

/** Format a boolean value for display */
export function formatBooleanValue(value: unknown): string {
  if (value === true || value === 'true') return 'Yes';
  if (value === false || value === 'false') return 'No';
  return String(value ?? '');
}

/** Get field name, either from built-in fields or the provided field */
export function getFieldName(fieldId: string): string {
  const builtIn = BUILT_IN_FIELDS.find((f) => f.id === fieldId);
  if (builtIn) return builtIn.name;
  return fieldId;
}

/** Get operator label for display */
export function getOperatorLabel(operator: FilterOperator): string {
  return OPERATOR_LABELS[operator] || operator;
}
