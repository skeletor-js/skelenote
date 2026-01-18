/**
 * Performance benchmarks for Markdown Export operations
 *
 * Run with: pnpm vitest bench src/lib/export/__tests__/export.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import { convertBlockNoteToMarkdown } from '../markdown';
import type { BlockNoteBlock } from '../types';

// Extended block type for benchmarks that allows flexible inline content
type BenchmarkBlock = BlockNoteBlock & { content?: unknown[] };

// Generate sample BlockNote content
function generateBlocks(count: number): BenchmarkBlock[] {
  const blocks: BenchmarkBlock[] = [];

  for (let i = 0; i < count; i++) {
    if (i % 10 === 0) {
      // Heading
      blocks.push({
        id: `block-${i}`,
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: `Section ${Math.floor(i / 10) + 1}` }],
        children: [],
      });
    } else if (i % 7 === 0) {
      // Code block
      blocks.push({
        id: `block-${i}`,
        type: 'codeBlock',
        props: { language: 'javascript' },
        content: [{ type: 'text', text: 'const x = 42;\nconsole.log(x);' }],
        children: [],
      });
    } else if (i % 5 === 0) {
      // Bullet list
      blocks.push({
        id: `block-${i}`,
        type: 'bulletListItem',
        props: {},
        content: [{ type: 'text', text: `List item ${i}` }],
        children: [],
      });
    } else {
      // Paragraph with inline styles
      blocks.push({
        id: `block-${i}`,
        type: 'paragraph',
        props: {},
        content: [
          { type: 'text', text: 'This is paragraph ' },
          { type: 'text', text: `${i}`, styles: { bold: true } },
          { type: 'text', text: ' with ' },
          { type: 'text', text: 'italic', styles: { italic: true } },
          { type: 'text', text: ' and ' },
          {
            type: 'link',
            content: [{ type: 'text', text: 'a link' }],
            href: 'https://example.com',
          },
          { type: 'text', text: '. ' },
          {
            type: 'mention',
            props: {
              objectId: `obj-${i % 10}`,
              objectName: `Object ${i % 10}`,
            },
          },
        ],
        children: [],
      });
    }
  }

  return blocks;
}

// Object name resolver
function resolveObjectName(objectId: string): string | undefined {
  return `Object (${objectId})`;
}

describe('Markdown Export Performance', () => {
  let smallBlocks: BlockNoteBlock[];
  let mediumBlocks: BlockNoteBlock[];
  let largeBlocks: BlockNoteBlock[];

  beforeAll(() => {
    smallBlocks = generateBlocks(20);
    mediumBlocks = generateBlocks(100);
    largeBlocks = generateBlocks(500);
  });

  bench('export 20 blocks', () => {
    convertBlockNoteToMarkdown(smallBlocks, resolveObjectName);
  });

  bench('export 100 blocks', () => {
    convertBlockNoteToMarkdown(mediumBlocks, resolveObjectName);
  });

  bench('export 500 blocks', () => {
    convertBlockNoteToMarkdown(largeBlocks, resolveObjectName);
  });
});

describe('Batch Export', () => {
  let documents: BlockNoteBlock[][];

  beforeAll(() => {
    documents = [];
    for (let i = 0; i < 50; i++) {
      documents.push(generateBlocks(50));
    }
  });

  bench('export 50 documents', () => {
    for (const doc of documents) {
      convertBlockNoteToMarkdown(doc, resolveObjectName);
    }
  });
});
