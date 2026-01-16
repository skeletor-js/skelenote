import { describe, it, expect } from 'vitest';
import {
  isPropertyValue,
  validatePropertyValue,
  type PropertyDefinition,
} from '../property';

// Helper to create property definitions for testing
function createPropertyDef(
  overrides: Partial<PropertyDefinition>
): PropertyDefinition {
  return {
    id: 'test-prop',
    name: 'Test Property',
    type: 'text',
    required: false,
    multiple: false,
    ...overrides,
  };
}

describe('isPropertyValue', () => {
  describe('valid values', () => {
    it('should accept null', () => {
      expect(isPropertyValue(null)).toBe(true);
    });

    it('should accept strings', () => {
      expect(isPropertyValue('')).toBe(true);
      expect(isPropertyValue('hello')).toBe(true);
      expect(isPropertyValue('multi\nline\nstring')).toBe(true);
    });

    it('should accept numbers', () => {
      expect(isPropertyValue(0)).toBe(true);
      expect(isPropertyValue(42)).toBe(true);
      expect(isPropertyValue(-100)).toBe(true);
      expect(isPropertyValue(3.14)).toBe(true);
      expect(isPropertyValue(Infinity)).toBe(true);
      expect(isPropertyValue(NaN)).toBe(true);
    });

    it('should accept booleans', () => {
      expect(isPropertyValue(true)).toBe(true);
      expect(isPropertyValue(false)).toBe(true);
    });

    it('should accept string arrays (for relations)', () => {
      expect(isPropertyValue([])).toBe(true);
      expect(isPropertyValue(['id-1'])).toBe(true);
      expect(isPropertyValue(['id-1', 'id-2', 'id-3'])).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('should reject undefined', () => {
      expect(isPropertyValue(undefined)).toBe(false);
    });

    it('should reject objects', () => {
      expect(isPropertyValue({})).toBe(false);
      expect(isPropertyValue({ key: 'value' })).toBe(false);
    });

    it('should reject mixed arrays', () => {
      expect(isPropertyValue([1, 2, 3])).toBe(false);
      expect(isPropertyValue(['string', 123])).toBe(false);
      expect(isPropertyValue([null, 'string'])).toBe(false);
    });

    it('should reject functions', () => {
      expect(isPropertyValue(() => { })).toBe(false);
    });

    it('should reject symbols', () => {
      expect(isPropertyValue(Symbol('test'))).toBe(false);
    });
  });
});

describe('validatePropertyValue', () => {
  describe('required validation', () => {
    it('should fail for null on required property', () => {
      const def = createPropertyDef({ required: true });
      const result = validatePropertyValue(null, def);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should pass for null on optional property', () => {
      const def = createPropertyDef({ required: false });
      const result = validatePropertyValue(null, def);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('text type', () => {
    const textDef = createPropertyDef({ type: 'text' });

    it('should accept strings', () => {
      expect(validatePropertyValue('hello', textDef).valid).toBe(true);
      expect(validatePropertyValue('', textDef).valid).toBe(true);
    });

    it('should reject non-strings', () => {
      expect(validatePropertyValue(123, textDef).valid).toBe(false);
      expect(validatePropertyValue(true, textDef).valid).toBe(false);
    });
  });

  describe('number type', () => {
    const numberDef = createPropertyDef({ type: 'number' });

    it('should accept numbers', () => {
      expect(validatePropertyValue(42, numberDef).valid).toBe(true);
      expect(validatePropertyValue(0, numberDef).valid).toBe(true);
      expect(validatePropertyValue(-100.5, numberDef).valid).toBe(true);
    });

    it('should reject non-numbers', () => {
      expect(validatePropertyValue('42', numberDef).valid).toBe(false);
      expect(validatePropertyValue(true, numberDef).valid).toBe(false);
    });
  });

  describe('date type', () => {
    const dateDef = createPropertyDef({ type: 'date' });

    it('should accept timestamps (numbers)', () => {
      expect(validatePropertyValue(Date.now(), dateDef).valid).toBe(true);
      expect(validatePropertyValue(0, dateDef).valid).toBe(true);
    });

    it('should reject non-numbers', () => {
      const result = validatePropertyValue('2024-01-01', dateDef);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('timestamp');
    });
  });

  describe('checkbox type', () => {
    const checkboxDef = createPropertyDef({ type: 'checkbox' });

    it('should accept booleans', () => {
      expect(validatePropertyValue(true, checkboxDef).valid).toBe(true);
      expect(validatePropertyValue(false, checkboxDef).valid).toBe(true);
    });

    it('should reject non-booleans', () => {
      expect(validatePropertyValue('true', checkboxDef).valid).toBe(false);
      expect(validatePropertyValue(1, checkboxDef).valid).toBe(false);
    });
  });

  describe('select type', () => {
    const selectDef = createPropertyDef({
      type: 'select',
      config: { options: ['todo', 'in-progress', 'done'] },
    });

    it('should accept valid options', () => {
      expect(validatePropertyValue('todo', selectDef).valid).toBe(true);
      expect(validatePropertyValue('in-progress', selectDef).valid).toBe(true);
      expect(validatePropertyValue('done', selectDef).valid).toBe(true);
    });

    it('should reject invalid options', () => {
      const result = validatePropertyValue('invalid', selectDef);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('one of');
    });

    it('should reject non-strings', () => {
      expect(validatePropertyValue(123, selectDef).valid).toBe(false);
    });

    it('should accept any string if no options configured', () => {
      const noOptionsDef = createPropertyDef({ type: 'select' });
      expect(validatePropertyValue('anything', noOptionsDef).valid).toBe(true);
    });
  });

  describe('relation type', () => {
    const singleRelationDef = createPropertyDef({
      type: 'relation',
      multiple: false,
    });
    const multiRelationDef = createPropertyDef({
      type: 'relation',
      multiple: true,
    });

    it('should accept empty array', () => {
      expect(validatePropertyValue([], singleRelationDef).valid).toBe(true);
      expect(validatePropertyValue([], multiRelationDef).valid).toBe(true);
    });

    it('should accept single ID for single relation', () => {
      expect(validatePropertyValue(['id-1'], singleRelationDef).valid).toBe(
        true
      );
    });

    it('should reject multiple IDs for single relation', () => {
      const result = validatePropertyValue(['id-1', 'id-2'], singleRelationDef);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('only have one');
    });

    it('should accept multiple IDs for multiple relation', () => {
      expect(
        validatePropertyValue(['id-1', 'id-2', 'id-3'], multiRelationDef).valid
      ).toBe(true);
    });

    it('should reject non-array', () => {
      expect(validatePropertyValue('id-1', singleRelationDef).valid).toBe(
        false
      );
    });

    it('should reject array with non-string values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validatePropertyValue([123] as any, singleRelationDef);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('string IDs');
    });
  });

  describe('url type', () => {
    const urlDef = createPropertyDef({ type: 'url' });

    it('should accept strings', () => {
      expect(validatePropertyValue('https://example.com', urlDef).valid).toBe(
        true
      );
    });

    it('should reject non-strings', () => {
      expect(validatePropertyValue(123, urlDef).valid).toBe(false);
    });
  });

  describe('email type', () => {
    const emailDef = createPropertyDef({ type: 'email' });

    it('should accept strings', () => {
      expect(validatePropertyValue('test@example.com', emailDef).valid).toBe(
        true
      );
    });

    it('should reject non-strings', () => {
      expect(validatePropertyValue(123, emailDef).valid).toBe(false);
    });
  });

  describe('phone type', () => {
    const phoneDef = createPropertyDef({ type: 'phone' });

    it('should accept strings', () => {
      expect(validatePropertyValue('+1-555-123-4567', phoneDef).valid).toBe(
        true
      );
    });

    it('should reject non-strings', () => {
      expect(validatePropertyValue(5551234567, phoneDef).valid).toBe(false);
    });
  });

  describe('recurrence type', () => {
    const recurrenceDef = createPropertyDef({ type: 'recurrence' });

    it('should accept JSON strings', () => {
      const json = JSON.stringify({ frequency: 'daily', interval: 1 });
      expect(validatePropertyValue(json, recurrenceDef).valid).toBe(true);
    });

    it('should reject non-strings', () => {
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validatePropertyValue({ frequency: 'daily' } as any, recurrenceDef).valid
      ).toBe(false);
    });
  });
});
