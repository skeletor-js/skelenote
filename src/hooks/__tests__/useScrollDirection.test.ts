/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollDirection } from '../useScrollDirection';
import { useRef } from 'react';

describe('useScrollDirection', () => {
  let mockContainer: HTMLDivElement;
  let scrollListeners: Array<(e: Event) => void>;

  beforeEach(() => {
    scrollListeners = [];
    mockContainer = document.createElement('div');

    // Track scroll listeners
    vi.spyOn(mockContainer, 'addEventListener').mockImplementation(
      (type: string, handler: any) => {
        if (type === 'scroll') {
          scrollListeners.push(handler);
        }
      }
    );

    vi.spyOn(mockContainer, 'removeEventListener').mockImplementation(() => {});

    // Mock scrollTop
    Object.defineProperty(mockContainer, 'scrollTop', {
      writable: true,
      value: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(null);
      return useScrollDirection(ref);
    });

    expect(result.current.direction).toBeNull();
    expect(result.current.scrollY).toBe(0);
    expect(result.current.isVisible).toBe(true);
  });

  it('should detect downward scroll', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(mockContainer);
      return useScrollDirection(ref);
    });

    // Simulate scrolling down

    (mockContainer as any).scrollTop = 150;

    act(() => {
      scrollListeners.forEach((listener) => listener(new Event('scroll')));
    });

    expect(result.current.direction).toBe('down');
    expect(result.current.scrollY).toBe(150);
    expect(result.current.isVisible).toBe(false);
  });

  it('should detect upward scroll', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(mockContainer);
      return useScrollDirection(ref);
    });

    // First scroll down

    (mockContainer as any).scrollTop = 200;

    act(() => {
      scrollListeners.forEach((listener) => listener(new Event('scroll')));
    });

    // Then scroll up

    (mockContainer as any).scrollTop = 150;

    act(() => {
      scrollListeners.forEach((listener) => listener(new Event('scroll')));
    });

    expect(result.current.direction).toBe('up');
    expect(result.current.isVisible).toBe(true);
  });

  it('should respect threshold option', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(mockContainer);
      return useScrollDirection(ref, { threshold: 50 });
    });

    // Small scroll should not trigger

    (mockContainer as any).scrollTop = 20;

    act(() => {
      scrollListeners.forEach((listener) => listener(new Event('scroll')));
    });

    expect(result.current.direction).toBeNull();

    // Larger scroll should trigger

    (mockContainer as any).scrollTop = 100;

    act(() => {
      scrollListeners.forEach((listener) => listener(new Event('scroll')));
    });

    expect(result.current.direction).toBe('down');
  });

  it('should respect hideAfter option', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(mockContainer);
      return useScrollDirection(ref, { hideAfter: 200 });
    });

    // Scroll down but below hideAfter threshold

    (mockContainer as any).scrollTop = 50;

    act(() => {
      scrollListeners.forEach((listener) => listener(new Event('scroll')));
    });

    expect(result.current.direction).toBe('down');
    expect(result.current.isVisible).toBe(true); // Still visible because scrollY < hideAfter
  });

  it('should use initialDirection when provided', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(null);
      return useScrollDirection(ref, { initialDirection: 'up' });
    });

    expect(result.current.direction).toBe('up');
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(mockContainer);
      return useScrollDirection(ref);
    });

    unmount();

    expect(mockContainer.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );
  });

  it('should handle null container ref', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(null);
      return useScrollDirection(ref);
    });

    // Should not throw and return defaults
    expect(result.current.direction).toBeNull();
    expect(result.current.scrollY).toBe(0);
    expect(result.current.isVisible).toBe(true);
  });
});
