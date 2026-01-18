import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionManager } from '../connection';

describe('ConnectionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default config', () => {
    const manager = new ConnectionManager();
    expect(manager.getRetryCount()).toBe(0);
    expect(manager.isReconnectScheduled()).toBe(false);
  });

  it('should calculate exponential backoff delay', () => {
    const manager = new ConnectionManager({
      initialDelay: 100,
      multiplier: 2,
      maxDelay: 1000,
    });

    expect(manager.getNextDelay()).toBe(100);
    expect(manager.getNextDelay()).toBe(200);
    expect(manager.getNextDelay()).toBe(400);
    expect(manager.getNextDelay()).toBe(800);
    expect(manager.getNextDelay()).toBe(1000); // Max capped
    expect(manager.getNextDelay()).toBe(1000);
  });

  it('should schedule and execute reconnect callback', () => {
    const manager = new ConnectionManager({ initialDelay: 100 });
    const callback = vi.fn();

    manager.scheduleReconnect(callback);
    expect(manager.isReconnectScheduled()).toBe(true);

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalled();
  });

  it('should cancel pending reconnect', () => {
    const manager = new ConnectionManager({ initialDelay: 100 });
    const callback = vi.fn();

    manager.scheduleReconnect(callback);
    manager.cancelReconnect();
    expect(manager.isReconnectScheduled()).toBe(false);

    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should reset retries', () => {
    const manager = new ConnectionManager();
    manager.getNextDelay();
    manager.getNextDelay();
    expect(manager.getRetryCount()).toBe(2);

    manager.scheduleReconnect(vi.fn());
    manager.resetRetries();

    expect(manager.getRetryCount()).toBe(0);
    expect(manager.isReconnectScheduled()).toBe(false);
  });
});
