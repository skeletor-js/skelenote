/**
 * Tests for Markdown to BlockNote converter
 */

import { describe, it, expect } from 'vitest';
import {
  importMarkdown,
  parseMarkdownToBlocks,
  parseFrontmatter,
  mapTypeToSkelenote,
  extractWikiLinks,
  extractFolderMapping,
  hasWikiLinks,
} from './index';
import { BuiltInTypeIds } from '../types';

describe('parseFrontmatter', () => {
  it('parses YAML frontmatter correctly', () => {
    const markdown = `---
title: Test Note
type: note
tags:
  - tag1
  - tag2
created: 2024-01-15T10:30:00Z
---

# Content here`;

    const result = parseFrontmatter(markdown);

    expect(result.hasFrontmatter).toBe(true);
    expect(result.properties.title).toBe('Test Note');
    expect(result.properties.type).toBe('note');
    expect(result.properties.tags).toEqual(['tag1', 'tag2']);
    expect(result.content).toBe('# Content here');
  });

  it('returns content without frontmatter unchanged', () => {
    const markdown = '# Just a heading\n\nSome content';
    const result = parseFrontmatter(markdown);

    expect(result.hasFrontmatter).toBe(false);
    expect(result.properties).toEqual({});
    expect(result.content).toBe(markdown);
  });

  it('handles empty frontmatter', () => {
    const markdown = `---
---

Content`;

    const result = parseFrontmatter(markdown);

    expect(result.hasFrontmatter).toBe(false);
    expect(result.content).toBe('Content');
  });
});

describe('mapTypeToSkelenote', () => {
  it('maps standard type names', () => {
    expect(mapTypeToSkelenote('task')).toBe(BuiltInTypeIds.TASK);
    expect(mapTypeToSkelenote('note')).toBe(BuiltInTypeIds.NOTE);
    expect(mapTypeToSkelenote('project')).toBe(BuiltInTypeIds.PROJECT);
  });

  it('maps aliases', () => {
    expect(mapTypeToSkelenote('todo')).toBe(BuiltInTypeIds.TASK);
    expect(mapTypeToSkelenote('bookmark')).toBe(BuiltInTypeIds.LINK);
    expect(mapTypeToSkelenote('contact')).toBe(BuiltInTypeIds.PERSON);
  });

  it('is case insensitive', () => {
    expect(mapTypeToSkelenote('TASK')).toBe(BuiltInTypeIds.TASK);
    expect(mapTypeToSkelenote('Note')).toBe(BuiltInTypeIds.NOTE);
  });

  it('returns null for unknown types', () => {
    expect(mapTypeToSkelenote('unknown')).toBeNull();
    expect(mapTypeToSkelenote(undefined)).toBeNull();
  });
});

describe('extractWikiLinks', () => {
  it('extracts simple wiki-links', () => {
    const content = 'See [[My Note]] for details';
    const links = extractWikiLinks(content);

    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('My Note');
    expect(links[0].fullMatch).toBe('[[My Note]]');
  });

  it('extracts wiki-links with display text', () => {
    const content = 'Check [[Project Name|this project]]';
    const links = extractWikiLinks(content);

    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('Project Name');
    expect(links[0].displayText).toBe('this project');
  });

  it('extracts multiple wiki-links', () => {
    const content = '[[Note A]] links to [[Note B]] and [[Note C]]';
    const links = extractWikiLinks(content);

    expect(links).toHaveLength(3);
    expect(links.map((l) => l.target)).toEqual(['Note A', 'Note B', 'Note C']);
  });

  it('returns empty array for no wiki-links', () => {
    const content = 'No wiki links here';
    const links = extractWikiLinks(content);

    expect(links).toHaveLength(0);
  });
});

describe('hasWikiLinks', () => {
  it('detects wiki-links', () => {
    expect(hasWikiLinks('See [[My Note]]')).toBe(true);
    expect(hasWikiLinks('No links here')).toBe(false);
  });
});

describe('extractFolderMapping', () => {
  it('maps immediate folder to project', () => {
    const result = extractFolderMapping('/Users/me/Documents/Work/MyProject/notes.md');

    expect(result.projectName).toBe('MyProject');
  });

  it('maps grandparent folder to area', () => {
    const result = extractFolderMapping('/vault/Work/MyProject/notes.md');

    expect(result.projectName).toBe('MyProject');
    expect(result.areaName).toBe('Work');
  });

  it('extracts intermediate folders as tags', () => {
    const result = extractFolderMapping('/vault/Archive/2023/Q4/Project/file.md');

    expect(result.projectName).toBe('Project');
    expect(result.areaName).toBe('Q4');
    expect(result.folderTags).toEqual(['Archive', '2023']);
  });

  it('ignores common root folders', () => {
    const result = extractFolderMapping('/vault/notes/documents/Project/file.md');

    expect(result.projectName).toBe('Project');
    expect(result.areaName).toBeUndefined();
  });

  it('handles Windows paths', () => {
    const result = extractFolderMapping('C:\\Users\\me\\Work\\Project\\file.md');

    expect(result.projectName).toBe('Project');
    expect(result.areaName).toBe('Work');
  });
});

describe('parseMarkdownToBlocks', () => {
  it('parses headings', () => {
    const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].props?.level).toBe(1);
    expect(blocks[1].props?.level).toBe(2);
    expect(blocks[2].props?.level).toBe(3);
  });

  it('parses paragraphs', () => {
    const markdown = 'First paragraph\n\nSecond paragraph';
    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === 'paragraph')).toBe(true);
  });

  it('parses bullet lists', () => {
    const markdown = '- Item 1\n- Item 2\n- Item 3';
    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.type === 'bulletListItem')).toBe(true);
  });

  it('parses numbered lists', () => {
    const markdown = '1. First\n2. Second\n3. Third';
    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.type === 'numberedListItem')).toBe(true);
  });

  it('parses checklists', () => {
    const markdown = '- [ ] Todo\n- [x] Done\n- [X] Also done';
    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.type === 'checkListItem')).toBe(true);
    expect(blocks[0].props?.checked).toBe(false);
    expect(blocks[1].props?.checked).toBe(true);
    expect(blocks[2].props?.checked).toBe(true);
  });

  it('parses code blocks with language', () => {
    const markdown = '```typescript\nconst x = 1;\n```';
    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('codeBlock');
    expect(blocks[0].props?.language).toBe('typescript');
  });

  it('parses blockquotes', () => {
    const markdown = '> This is a quote\n> With multiple lines';
    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('blockquote');
  });

  it('parses tables', () => {
    const markdown = `| Col 1 | Col 2 |
| --- | --- |
| A | B |
| C | D |`;

    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');
    expect(blocks[0].content).toHaveProperty('rows');
  });

  it('parses inline formatting', () => {
    const markdown = '**bold** and *italic* and `code`';
    const { blocks } = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    const content = blocks[0].content as Array<{ type: string; styles?: Record<string, boolean> }>;

    expect(content.some((c) => c.styles?.bold)).toBe(true);
    expect(content.some((c) => c.styles?.italic)).toBe(true);
    expect(content.some((c) => c.styles?.code)).toBe(true);
  });

  it('parses links', () => {
    const markdown = '[Click here](https://example.com)';
    const { blocks } = parseMarkdownToBlocks(markdown);

    const content = blocks[0].content as Array<{ type: string; props?: Record<string, unknown> }>;
    const link = content.find((c) => c.type === 'link');

    expect(link).toBeDefined();
    expect(link?.props?.href).toBe('https://example.com');
  });

  it('preprocesses wiki-links to placeholders', () => {
    const markdown = 'Link to [[My Note]]';
    const { blocks, wikiLinks } = parseMarkdownToBlocks(markdown);

    expect(wikiLinks).toHaveLength(1);
    expect(wikiLinks[0].target).toBe('My Note');

    // The wiki-link should be converted to a placeholder link
    const content = blocks[0].content as Array<{ type: string; props?: Record<string, unknown> }>;
    const link = content.find((c) => c.type === 'link');

    expect(link?.props?.href).toContain('skelenote:mention:');
  });
});

describe('importMarkdown', () => {
  it('extracts title from frontmatter', () => {
    const markdown = `---
title: My Note Title
---

Content here`;

    const result = importMarkdown(markdown);

    expect(result.title).toBe('My Note Title');
  });

  it('extracts title from first H1 when no frontmatter', () => {
    const markdown = '# My Heading Title\n\nContent here';
    const result = importMarkdown(markdown);

    expect(result.title).toBe('My Heading Title');
    // H1 should be removed from blocks since it's used as title
    expect(result.blocks[0]?.type).not.toBe('heading');
  });

  it('maps type from frontmatter', () => {
    const markdown = `---
type: task
status: todo
---

Task content`;

    const result = importMarkdown(markdown);

    expect(result.typeId).toBe(BuiltInTypeIds.TASK);
  });

  it('uses default type when not specified', () => {
    const markdown = 'Just some content';
    const result = importMarkdown(markdown, { defaultTypeId: 'built-in:note' });

    expect(result.typeId).toBe('built-in:note');
  });

  it('converts frontmatter properties', () => {
    const markdown = `---
title: Test Task
type: task
status: in-progress
priority: high
due-date: 2024-06-15
---

Content`;

    const result = importMarkdown(markdown);

    expect(result.properties.status).toBe('in-progress');
    expect(result.properties.priority).toBe('high');
    expect(result.properties.dueDate).toBeDefined();
  });

  it('adds folder mapping suggestions', () => {
    const markdown = '# Note content';
    const result = importMarkdown(markdown, {
      filePath: '/docs/Work/ProjectX/meeting.md',
    });

    // Last folder is Project, parent folder is Area
    expect(result.properties._suggestedProject).toBe('ProjectX');
    expect(result.properties._suggestedArea).toBe('Work');
  });

  it('resolves wiki-links when resolver provided', () => {
    const markdown = 'See [[My Project]] for details';

    const result = importMarkdown(markdown, {
      resolveWikiLink: (target) => {
        if (target === 'My Project') return 'project-123';
        return null;
      },
    });

    // Check that the mention was created
    const content = result.blocks[0]?.content as Array<{
      type: string;
      props?: Record<string, unknown>;
    }>;
    const mention = content?.find((c) => c.type === 'mention');

    expect(mention).toBeDefined();
    expect(mention?.props?.objectId).toBe('project-123');
  });

  it('preserves unresolved wiki-links as text', () => {
    const markdown = 'See [[Unknown Note]] for details';

    const result = importMarkdown(markdown, {
      resolveWikiLink: () => null,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Unresolved links');
  });

  it('handles complex markdown document', () => {
    const markdown = `---
title: Project Overview
type: note
tags:
  - important
  - work
---

# Introduction

This is a **bold** statement with *italic* text.

## Tasks

- [ ] Complete documentation
- [x] Review code
- [ ] Deploy to production

## Links

See [[Related Project]] and [[Meeting Notes|the meeting notes]] for context.

\`\`\`typescript
const config = {
  enabled: true
};
\`\`\`

> Important note: This is a blockquote.

| Feature | Status |
| --- | --- |
| Auth | Done |
| API | WIP |
`;

    const result = importMarkdown(markdown);

    expect(result.title).toBe('Project Overview');
    expect(result.typeId).toBe(BuiltInTypeIds.NOTE);
    expect(result.blocks.length).toBeGreaterThan(5);
    expect(result.wikiLinks).toHaveLength(2);

    // Check that various block types are present
    const blockTypes = result.blocks.map((b) => b.type);
    expect(blockTypes).toContain('heading');
    expect(blockTypes).toContain('paragraph');
    expect(blockTypes).toContain('checkListItem');
    expect(blockTypes).toContain('codeBlock');
    expect(blockTypes).toContain('blockquote');
    expect(blockTypes).toContain('table');
  });
});
