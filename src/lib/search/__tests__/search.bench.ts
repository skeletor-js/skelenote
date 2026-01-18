/**
 * Performance benchmarks for Search operations
 *
 * Run with: pnpm vitest bench src/lib/search/__tests__/search.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import Fuse from 'fuse.js';

// Mock search data
function generateSearchData(count: number) {
  const data = [];
  const types = ['note', 'task', 'project', 'area'];
  const words = [
    'meeting',
    'project',
    'idea',
    'review',
    'planning',
    'design',
    'code',
    'bug',
    'feature',
    'documentation',
    'sprint',
    'deadline',
    'client',
    'team',
    'update',
  ];

  for (let i = 0; i < count; i++) {
    const wordCount = 3 + Math.floor(Math.random() * 5);
    const title = Array.from(
      { length: wordCount },
      () => words[Math.floor(Math.random() * words.length)]
    ).join(' ');

    data.push({
      id: `obj-${i}`,
      typeId: types[Math.floor(Math.random() * types.length)],
      title,
      description: `Description for ${title} - item ${i}`,
      createdAt: Date.now() - Math.random() * 86400000 * 30,
    });
  }
  return data;
}

describe('Fuse.js Search Performance', () => {
  let smallDataset: ReturnType<typeof generateSearchData>;
  let mediumDataset: ReturnType<typeof generateSearchData>;
  let largeDataset: ReturnType<typeof generateSearchData>;

  let smallFuse: Fuse<(typeof smallDataset)[0]>;
  let mediumFuse: Fuse<(typeof mediumDataset)[0]>;
  let largeFuse: Fuse<(typeof largeDataset)[0]>;

  beforeAll(() => {
    smallDataset = generateSearchData(100);
    mediumDataset = generateSearchData(1000);
    largeDataset = generateSearchData(5000);

    const options = {
      keys: ['title', 'description'],
      threshold: 0.3,
      includeScore: true,
    };

    smallFuse = new Fuse(smallDataset, options);
    mediumFuse = new Fuse(mediumDataset, options);
    largeFuse = new Fuse(largeDataset, options);
  });

  bench('search 100 items', () => {
    smallFuse.search('meeting');
  });

  bench('search 1000 items', () => {
    mediumFuse.search('meeting');
  });

  bench('search 5000 items', () => {
    largeFuse.search('meeting');
  });

  bench('search 5000 items - multi-word query', () => {
    largeFuse.search('project meeting review');
  });
});

describe('Fuse.js Index Creation', () => {
  bench(
    'create index for 100 items',
    () => {
      const data = generateSearchData(100);
      new Fuse(data, {
        keys: ['title', 'description'],
        threshold: 0.3,
      });
    },
    { iterations: 20 }
  );

  bench(
    'create index for 1000 items',
    () => {
      const data = generateSearchData(1000);
      new Fuse(data, {
        keys: ['title', 'description'],
        threshold: 0.3,
      });
    },
    { iterations: 10 }
  );

  bench(
    'create index for 5000 items',
    () => {
      const data = generateSearchData(5000);
      new Fuse(data, {
        keys: ['title', 'description'],
        threshold: 0.3,
      });
    },
    { iterations: 3 }
  );
});
