/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  springs,
  tweens,
  fadeIn,
  scaleIn,
  slideUp,
  slideInRight,
  fadeOnly,
  checkboxCheck,
  listItem,
  fabVisibility,
  tabIndicator,
  getTransition,
  durations,
} from '../animations';

describe('lib/animations', () => {
  describe('springs', () => {
    it('should have snappy spring preset', () => {
      expect(springs.snappy).toEqual({
        type: 'spring',
        stiffness: 500,
        damping: 30,
      });
    });

    it('should have default spring preset', () => {
      expect(springs.default).toEqual({
        type: 'spring',
        stiffness: 400,
        damping: 25,
      });
    });

    it('should have gentle spring preset', () => {
      expect(springs.gentle).toEqual({
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
    });

    it('should have bouncy spring preset', () => {
      expect(springs.bouncy).toEqual({
        type: 'spring',
        stiffness: 400,
        damping: 20,
      });
    });

    it('should have stiff spring preset', () => {
      expect(springs.stiff).toEqual({
        type: 'spring',
        stiffness: 600,
        damping: 40,
      });
    });
  });

  describe('tweens', () => {
    it('should have fast tween preset', () => {
      expect(tweens.fast).toEqual({
        type: 'tween',
        duration: 0.15,
        ease: 'easeOut',
      });
    });

    it('should have normal tween preset', () => {
      expect(tweens.normal).toEqual({
        type: 'tween',
        duration: 0.2,
        ease: 'easeOut',
      });
    });

    it('should have slow tween preset', () => {
      expect(tweens.slow).toEqual({
        type: 'tween',
        duration: 0.3,
        ease: 'easeOut',
      });
    });

    it('should have exit tween preset', () => {
      expect(tweens.exit).toEqual({
        type: 'tween',
        duration: 0.2,
        ease: 'easeIn',
      });
    });
  });

  describe('animation variants', () => {
    it('should have fadeIn variant', () => {
      expect(fadeIn.initial).toEqual({ opacity: 0, y: 8 });
      expect(fadeIn.animate).toEqual({ opacity: 1, y: 0 });
      expect(fadeIn.exit).toEqual({ opacity: 0, y: -8 });
    });

    it('should have scaleIn variant', () => {
      expect(scaleIn.initial).toEqual({ scale: 0, opacity: 0 });
      expect(scaleIn.animate).toEqual({ scale: 1, opacity: 1 });
    });

    it('should have slideUp variant', () => {
      expect(slideUp.initial).toEqual({ y: '100%' });
      expect(slideUp.animate).toEqual({ y: 0 });
    });

    it('should have slideInRight variant', () => {
      expect(slideInRight.initial).toEqual({ x: '100%' });
      expect(slideInRight.animate).toEqual({ x: 0 });
    });

    it('should have fadeOnly variant', () => {
      expect(fadeOnly.initial).toEqual({ opacity: 0 });
      expect(fadeOnly.animate).toEqual({ opacity: 1 });
    });

    it('should have checkboxCheck variant', () => {
      expect(checkboxCheck.unchecked).toBeDefined();
      expect(checkboxCheck.checked).toBeDefined();
    });

    it('should have listItem variant', () => {
      expect(listItem.initial).toBeDefined();
      expect(listItem.animate).toBeDefined();
      expect(listItem.exit).toBeDefined();
    });

    it('should have fabVisibility variant', () => {
      expect(fabVisibility.visible).toBeDefined();
      expect(fabVisibility.hidden).toBeDefined();
    });

    it('should have tabIndicator with transition', () => {
      expect(tabIndicator.transition).toBeDefined();
      expect(tabIndicator.transition.type).toBe('spring');
    });
  });

  describe('getTransition', () => {
    it('should return original transition when motion allowed', () => {
      const transition = { type: 'spring' as const, stiffness: 100 };
      const result = getTransition(transition, false);
      expect(result).toEqual(transition);
    });

    it('should return instant transition when motion reduced', () => {
      const transition = { type: 'spring' as const, stiffness: 100 };
      const result = getTransition(transition, true);
      expect(result).toEqual({ duration: 0 });
    });
  });

  describe('durations', () => {
    it('should have correct duration values', () => {
      expect(durations.instant).toBe(100);
      expect(durations.fast).toBe(150);
      expect(durations.normal).toBe(200);
      expect(durations.slow).toBe(300);
    });
  });
});
