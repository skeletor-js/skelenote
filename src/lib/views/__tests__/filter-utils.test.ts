import { describe, it, expect } from 'vitest';
import {
  getOperatorsForType,
  formatDateValue,
  formatBooleanValue,
  getFieldName,
  getOperatorLabel,
  ALL_OPERATORS,
  OPERATOR_LABELS,
  BUILT_IN_FIELDS,
  TEXT_OPERATORS,
  NUMBER_OPERATORS,
  DATE_OPERATORS,
  SELECT_OPERATORS,
  BOOLEAN_OPERATORS,
  RECURRENCE_OPTIONS,
} from '../filter-utils';

describe('filter-utils', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // getOperatorsForType
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOperatorsForType', () => {
    it('should return text operators for text type', () => {
      expect(getOperatorsForType('text')).toEqual(TEXT_OPERATORS);
    });

    it('should return text operators for url type', () => {
      expect(getOperatorsForType('url')).toEqual(TEXT_OPERATORS);
    });

    it('should return text operators for email type', () => {
      expect(getOperatorsForType('email')).toEqual(TEXT_OPERATORS);
    });

    it('should return text operators for phone type', () => {
      expect(getOperatorsForType('phone')).toEqual(TEXT_OPERATORS);
    });

    it('should return text operators for file type', () => {
      expect(getOperatorsForType('file')).toEqual(TEXT_OPERATORS);
    });

    it('should return number operators for number type', () => {
      expect(getOperatorsForType('number')).toEqual(NUMBER_OPERATORS);
    });

    it('should return date operators for date type', () => {
      expect(getOperatorsForType('date')).toEqual(DATE_OPERATORS);
    });

    it('should return select operators for select type', () => {
      expect(getOperatorsForType('select')).toEqual(SELECT_OPERATORS);
    });

    it('should return select operators for recurrence type', () => {
      expect(getOperatorsForType('recurrence')).toEqual(SELECT_OPERATORS);
    });

    it('should return boolean operators for checkbox type', () => {
      expect(getOperatorsForType('checkbox')).toEqual(BOOLEAN_OPERATORS);
    });

    it('should return boolean operators for boolean type', () => {
      expect(getOperatorsForType('boolean')).toEqual(BOOLEAN_OPERATORS);
    });

    it('should return select operators for relation type', () => {
      expect(getOperatorsForType('relation')).toEqual(SELECT_OPERATORS);
    });

    it('should return text operators for unknown types', () => {
      expect(getOperatorsForType('unknown' as any)).toEqual(TEXT_OPERATORS);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // formatDateValue
  // ─────────────────────────────────────────────────────────────────────────

  describe('formatDateValue', () => {
    it('should format timestamp to locale date string', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const result = formatDateValue(timestamp);
      expect(result).toContain('2024');
    });

    it('should format date string', () => {
      const result = formatDateValue('2024-01-15');
      expect(result).toContain('2024');
    });

    it('should return empty string for null', () => {
      expect(formatDateValue(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDateValue(undefined)).toBe('');
    });

    it('should return string for invalid date string', () => {
      expect(formatDateValue('not a date')).toBe('not a date');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // formatBooleanValue
  // ─────────────────────────────────────────────────────────────────────────

  describe('formatBooleanValue', () => {
    it('should return Yes for true', () => {
      expect(formatBooleanValue(true)).toBe('Yes');
    });

    it('should return Yes for string true', () => {
      expect(formatBooleanValue('true')).toBe('Yes');
    });

    it('should return No for false', () => {
      expect(formatBooleanValue(false)).toBe('No');
    });

    it('should return No for string false', () => {
      expect(formatBooleanValue('false')).toBe('No');
    });

    it('should return empty string for null', () => {
      expect(formatBooleanValue(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatBooleanValue(undefined)).toBe('');
    });

    it('should return string for other values', () => {
      expect(formatBooleanValue('maybe')).toBe('maybe');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getFieldName
  // ─────────────────────────────────────────────────────────────────────────

  describe('getFieldName', () => {
    it('should return built-in field name for createdAt', () => {
      expect(getFieldName('createdAt')).toBe('Created Date');
    });

    it('should return built-in field name for updatedAt', () => {
      expect(getFieldName('updatedAt')).toBe('Updated Date');
    });

    it('should return built-in field name for inboxed', () => {
      expect(getFieldName('inboxed')).toBe('In Inbox');
    });

    it('should return fieldId for unknown fields', () => {
      expect(getFieldName('customField')).toBe('customField');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOperatorLabel
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOperatorLabel', () => {
    it('should return label for eq operator', () => {
      expect(getOperatorLabel('eq')).toBe('equals');
    });

    it('should return label for neq operator', () => {
      expect(getOperatorLabel('neq')).toBe('does not equal');
    });

    it('should return label for gt operator', () => {
      expect(getOperatorLabel('gt')).toBe('is after');
    });

    it('should return label for gte operator', () => {
      expect(getOperatorLabel('gte')).toBe('is on or after');
    });

    it('should return label for lt operator', () => {
      expect(getOperatorLabel('lt')).toBe('is before');
    });

    it('should return label for lte operator', () => {
      expect(getOperatorLabel('lte')).toBe('is on or before');
    });

    it('should return label for contains operator', () => {
      expect(getOperatorLabel('contains')).toBe('contains');
    });

    it('should return label for isNull operator', () => {
      expect(getOperatorLabel('isNull')).toBe('is empty');
    });

    it('should return label for isNotNull operator', () => {
      expect(getOperatorLabel('isNotNull')).toBe('is not empty');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Constants
  // ─────────────────────────────────────────────────────────────────────────

  describe('constants', () => {
    it('should have all operators defined', () => {
      expect(ALL_OPERATORS.length).toBeGreaterThan(0);
      expect(ALL_OPERATORS.every((op) => op.value && op.label)).toBe(true);
    });

    it('should have operator labels for all operators', () => {
      const operators = [
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'contains',
        'startsWith',
        'endsWith',
        'in',
        'notIn',
        'isNull',
        'isNotNull',
      ];
      operators.forEach((op) => {
        expect(
          OPERATOR_LABELS[op as keyof typeof OPERATOR_LABELS]
        ).toBeDefined();
      });
    });

    it('should have built-in fields', () => {
      expect(BUILT_IN_FIELDS.length).toBe(3);
      expect(BUILT_IN_FIELDS.map((f) => f.id)).toContain('createdAt');
      expect(BUILT_IN_FIELDS.map((f) => f.id)).toContain('updatedAt');
      expect(BUILT_IN_FIELDS.map((f) => f.id)).toContain('inboxed');
    });

    it('should have recurrence options', () => {
      expect(RECURRENCE_OPTIONS).toContain('none');
      expect(RECURRENCE_OPTIONS).toContain('daily');
      expect(RECURRENCE_OPTIONS).toContain('weekly');
      expect(RECURRENCE_OPTIONS).toContain('monthly');
    });

    it('should have text operators including contains', () => {
      expect(TEXT_OPERATORS).toContain('contains');
      expect(TEXT_OPERATORS).toContain('startsWith');
      expect(TEXT_OPERATORS).toContain('endsWith');
    });

    it('should have number operators with comparisons', () => {
      expect(NUMBER_OPERATORS).toContain('gt');
      expect(NUMBER_OPERATORS).toContain('gte');
      expect(NUMBER_OPERATORS).toContain('lt');
      expect(NUMBER_OPERATORS).toContain('lte');
    });
  });
});
