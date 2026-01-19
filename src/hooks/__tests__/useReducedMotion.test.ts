/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion, getAccessibleTransition } from '..';

// Track mock return value
let mockReducedMotion: boolean | null = false;

// Mock framer-motion's useReducedMotion
// Mock framer-motion's useReducedMotion
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useReducedMotion: () => mockReducedMotion,
  };
});

describe('useReducedMotion', () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  it('should return false when motion is not reduced', () => {
    mockReducedMotion = false;

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it('should return true when motion is reduced', () => {
    mockReducedMotion = true;

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('should return false when framer-motion returns null', () => {
    mockReducedMotion = null;

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});

describe('getAccessibleTransition', () => {
  it('should return original transition when motion is allowed', () => {
    const transition = { duration: 0.3, ease: 'easeOut' as const };

    const result = getAccessibleTransition(transition, false);

    expect(result).toEqual(transition);
  });

  it('should return instant transition when motion is reduced', () => {
    const transition = { duration: 0.3, ease: 'easeOut' as const };

    const result = getAccessibleTransition(transition, true);

    expect(result).toEqual({ duration: 0 });
  });

  it('should handle complex transitions', () => {
    const transition = {
      duration: 0.5,
      type: 'spring' as const,
      stiffness: 100,
      damping: 10,
    };

    const resultAllowed = getAccessibleTransition(transition, false);
    expect(resultAllowed).toEqual(transition);

    const resultReduced = getAccessibleTransition(transition, true);
    expect(resultReduced).toEqual({ duration: 0 });
  });
});
