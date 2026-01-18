/**
 * Offline Queue
 *
 * Queues updates when the device is offline and flushes them when reconnected.
 *
 * @deprecated Use PersistentOfflineQueue instead for durability across app restarts.
 * This in-memory queue loses all pending updates if the app crashes while offline.
 */

import type { QueuedUpdate } from './types';

/**
 * @deprecated Use PersistentOfflineQueue for persistence across app restarts.
 */
export class OfflineQueue {
  private queue: QueuedUpdate[] = [];
  private nextId = 1;

  /**
   * Add an update to the queue
   * @returns The ID of the queued update
   */
  enqueue(data: Uint8Array): number {
    const id = this.nextId++;
    this.queue.push({
      id,
      data,
      timestamp: Date.now(),
    });
    return id;
  }

  /**
   * Remove and return the oldest update from the queue
   */
  dequeue(): QueuedUpdate | undefined {
    return this.queue.shift();
  }

  /**
   * Look at the oldest update without removing it
   */
  peek(): QueuedUpdate | undefined {
    return this.queue[0];
  }

  /**
   * Get the number of queued updates
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is empty
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear all queued updates
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get a copy of all queued updates
   */
  getAll(): QueuedUpdate[] {
    return [...this.queue];
  }
}
