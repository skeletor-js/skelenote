/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionManager } from '../connection';

describe('ConnectionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with defaults', () => {
    const manager = new ConnectionManager();
    expect(manager.getRetryCount()).toBe(0);
    expect(manager.isReconnectScheduled()).toBe(false);
  });

  it('should calculate exponential backoff', () => {
    const manager = new ConnectionManager({
      initialDelay: 100,
      multiplier: 2,
      maxDelay: 1000,
    });

    // 1st retry: 100 * 2^0 = 100
    expect(manager.getNextDelay()).toBe(100);
    // 2nd retry: 100 * 2^1 = 200
    expect(manager.getNextDelay()).toBe(200);
    // 3rd retry: 100 * 2^2 = 400
    expect(manager.getNextDelay()).toBe(400);
    // 4th retry: 100 * 2^3 = 800
    expect(manager.getNextDelay()).toBe(800);
    // 5th retry: 100 * 2^4 = 1600 -> capped at 1000
    expect(manager.getNextDelay()).toBe(1000);
  });

  it('should schedule reconnection', () => {
    const manager = new ConnectionManager({ initialDelay: 100 });
    const callback = vi.fn();

    manager.scheduleReconnect(callback);

    expect(manager.isReconnectScheduled()).toBe(true);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalled();
  });

  it('should cancel reconnection', () => {
    const manager = new ConnectionManager({ initialDelay: 100 });
    const callback = vi.fn();

    manager.scheduleReconnect(callback);
    expect(manager.isReconnectScheduled()).toBe(true);

    manager.cancelReconnect();
    expect(manager.isReconnectScheduled()).toBe(false);

    vi.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should reset retries', () => {
    const manager = new ConnectionManager();
    manager.getNextDelay();
    manager.getNextDelay();
    expect(manager.getRetryCount()).toBe(2);

    manager.resetRetries();
    expect(manager.getRetryCount()).toBe(0);
    expect(manager.isReconnectScheduled()).toBe(false);
  });
});
