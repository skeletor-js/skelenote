import { describe, it, expect } from 'vitest';
import {
  IOS_CHEVRON,
  IOS_TOUCH_TARGET,
  IOS_TIMING,
  IOS_TAB_BAR_HEIGHT,
} from '../ios-styles';

describe('iOS Constants', () => {
  it('should have correct chevron specs', () => {
    expect(IOS_CHEVRON.disclosure).toEqual({
      size: 14,
      color: '#A1A1AA',
      strokeWidth: 2.5,
    });
    expect(IOS_CHEVRON.back).toEqual({
      size: 14,
      color: 'var(--mantine-color-ember-6)',
      strokeWidth: 2.5,
    });
  });

  it('should have correct touch target size', () => {
    expect(IOS_TOUCH_TARGET).toBe(44);
  });

  it('should have correct timing values', () => {
    expect(IOS_TIMING).toEqual({
      longPress: 500,
      animation: 300,
      animationFast: 150,
    });
  });

  it('should have correct tab bar height', () => {
    expect(IOS_TAB_BAR_HEIGHT).toBe(49);
  });
});
