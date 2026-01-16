import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineQueue } from '../queue';

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    queue = new OfflineQueue();
  });

  it('should start empty', () => {
    expect(queue.length).toBe(0);
    expect(queue.isEmpty).toBe(true);
    expect(queue.peek()).toBeUndefined();
  });

  it('should enqueue items', () => {
    const data = new Uint8Array([1, 2, 3]);
    const id = queue.enqueue(data);

    expect(id).toBe(1);
    expect(queue.length).toBe(1);
    expect(queue.isEmpty).toBe(false);
  });

  it('should dequeue items in order', () => {
    queue.enqueue(new Uint8Array([1]));
    queue.enqueue(new Uint8Array([2]));

    const item1 = queue.dequeue();
    expect(item1?.data).toEqual(new Uint8Array([1]));
    expect(queue.length).toBe(1);

    const item2 = queue.dequeue();
    expect(item2?.data).toEqual(new Uint8Array([2]));
    expect(queue.length).toBe(0);
  });

  it('should peek without removing', () => {
    queue.enqueue(new Uint8Array([1]));

    const item = queue.peek();
    expect(item?.data).toEqual(new Uint8Array([1]));
    expect(queue.length).toBe(1);
  });

  it('should clear queue', () => {
    queue.enqueue(new Uint8Array([1]));
    queue.enqueue(new Uint8Array([2]));

    queue.clear();
    expect(queue.length).toBe(0);
    expect(queue.isEmpty).toBe(true);
  });

  it('should return all items', () => {
    queue.enqueue(new Uint8Array([1]));
    queue.enqueue(new Uint8Array([2]));

    const items = queue.getAll();
    expect(items).toHaveLength(2);
    expect(items[0].data).toEqual(new Uint8Array([1]));

    // Check it's a copy
    items.pop();
    expect(queue.length).toBe(2);
  });
});
