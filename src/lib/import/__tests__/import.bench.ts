/**
 * Performance benchmarks for Markdown Import operations
 *
 * Run with: pnpm vitest bench src/lib/import/__tests__/import.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import { parseMarkdownToBlocks, importMarkdown } from '../markdown';

// Generate sample markdown content
function generateMarkdown(paragraphs: number): string {
    const sections = [];

    sections.push('---');
    sections.push('title: Sample Document');
    sections.push('tags: [test, benchmark]');
    sections.push('status: todo');
    sections.push('---');
    sections.push('');
    sections.push('# Sample Document');
    sections.push('');

    for (let i = 0; i < paragraphs; i++) {
        if (i % 5 === 0) {
            sections.push(`## Section ${Math.floor(i / 5) + 1}`);
            sections.push('');
        }

        if (i % 10 === 0) {
            // Code block
            sections.push('```javascript');
            sections.push('const x = 42;');
            sections.push('console.log(x);');
            sections.push('```');
        } else if (i % 7 === 0) {
            // List
            sections.push('- Item one');
            sections.push('- Item two');
            sections.push('- Item three [[WikiLink]]');
        } else if (i % 11 === 0) {
            // Table
            sections.push('| A | B | C |');
            sections.push('|---|---|---|');
            sections.push('| 1 | 2 | 3 |');
        } else {
            // Regular paragraph
            sections.push(
                `This is paragraph ${i + 1}. It contains **bold**, *italic*, and \`code\`. ` +
                `Also a [link](https://example.com) and a [[WikiLink${i}]].`
            );
        }
        sections.push('');
    }

    return sections.join('\n');
}

describe('Markdown Parsing Performance', () => {
    let smallDoc: string;
    let mediumDoc: string;
    let largeDoc: string;

    beforeAll(() => {
        smallDoc = generateMarkdown(10);
        mediumDoc = generateMarkdown(50);
        largeDoc = generateMarkdown(200);
    });

    bench('parse 10 paragraphs', () => {
        parseMarkdownToBlocks(smallDoc);
    });

    bench('parse 50 paragraphs', () => {
        parseMarkdownToBlocks(mediumDoc);
    });

    bench('parse 200 paragraphs', () => {
        parseMarkdownToBlocks(largeDoc);
    });
});

describe('Full Import Pipeline', () => {
    let smallDoc: string;
    let mediumDoc: string;
    let largeDoc: string;

    beforeAll(() => {
        smallDoc = generateMarkdown(10);
        mediumDoc = generateMarkdown(50);
        largeDoc = generateMarkdown(200);
    });

    bench('import small document', () => {
        importMarkdown(smallDoc, { filePath: '/test/small.md' });
    });

    bench('import medium document', () => {
        importMarkdown(mediumDoc, { filePath: '/test/medium.md' });
    });

    bench('import large document', () => {
        importMarkdown(largeDoc, { filePath: '/test/large.md' });
    });
});

describe('Batch File Import', () => {
    let files: Array<{ path: string; content: string }>;

    beforeAll(() => {
        files = [];
        for (let i = 0; i < 50; i++) {
            files.push({
                path: `/vault/note-${i}.md`,
                content: generateMarkdown(20),
            });
        }
    });

    bench('import 50 files', () => {
        for (const file of files) {
            importMarkdown(file.content, { filePath: file.path });
        }
    });
});
