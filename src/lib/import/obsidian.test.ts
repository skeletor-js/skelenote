/**
 * Tests for Obsidian vault import functionality
 */

import { describe, it, expect } from 'vitest';
import {
  extractHashtags,
  parseVaultFiles,
  inferTypeFromVaultFile,
} from './obsidian';
import type { VaultFile, ParsedVaultFile } from './obsidian';
import { BuiltInTypeIds } from '../types';

describe('extractHashtags', () => {
  it('extracts simple hashtags', () => {
    const content = 'This is a note with #tag1 and #tag2';
    const tags = extractHashtags(content);
    expect(tags).toContain('tag1');
    expect(tags).toContain('tag2');
    expect(tags).toHaveLength(2);
  });

  it('extracts hashtags with hyphens and underscores', () => {
    const content = 'Tags: #my-tag #another_tag #mixed-tag_name';
    const tags = extractHashtags(content);
    expect(tags).toContain('my-tag');
    expect(tags).toContain('another_tag');
    expect(tags).toContain('mixed-tag_name');
  });

  it('extracts nested tags with forward slashes', () => {
    const content = 'Obsidian nested tag: #project/subproject';
    const tags = extractHashtags(content);
    expect(tags).toContain('project/subproject');
  });

  it('ignores headings (##)', () => {
    const content = '## This is a heading\n#realtag';
    const tags = extractHashtags(content);
    expect(tags).toContain('realtag');
    expect(tags).not.toContain('#');
    expect(tags).not.toContain('This');
    expect(tags).toHaveLength(1);
  });

  it('normalizes tags to lowercase', () => {
    const content = '#MyTag #UPPERCASE #MixedCase';
    const tags = extractHashtags(content);
    expect(tags).toContain('mytag');
    expect(tags).toContain('uppercase');
    expect(tags).toContain('mixedcase');
  });

  it('deduplicates tags', () => {
    const content = '#duplicate #duplicate #Duplicate';
    const tags = extractHashtags(content);
    expect(tags).toHaveLength(1);
    expect(tags).toContain('duplicate');
  });

  it('extracts tags at start of line', () => {
    const content = '#starttag some text\n#anothertag';
    const tags = extractHashtags(content);
    expect(tags).toContain('starttag');
    expect(tags).toContain('anothertag');
  });

  it('returns empty array for content without tags', () => {
    const content = 'This is plain text without any tags';
    const tags = extractHashtags(content);
    expect(tags).toHaveLength(0);
  });

  it('ignores tags that start with numbers', () => {
    const content = '#123invalid #valid123';
    const tags = extractHashtags(content);
    expect(tags).toContain('valid123');
    expect(tags).not.toContain('123invalid');
  });
});

describe('parseVaultFiles', () => {
  it('parses a simple markdown file', () => {
    const files: VaultFile[] = [
      {
        path: 'notes/my-note.md',
        content: '# My Note\n\nSome content here.',
      },
    ];

    const parsed = parseVaultFiles(files);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('my-note');
    expect(parsed[0].path).toBe('notes/my-note.md');
    expect(parsed[0].parsed.title).toBe('My Note');
  });

  it('extracts frontmatter and content', () => {
    const files: VaultFile[] = [
      {
        path: 'tasks/todo.md',
        content: `---
type: task
status: todo
priority: high
---

# Buy groceries

Need to get milk and eggs.`,
      },
    ];

    const parsed = parseVaultFiles(files);
    expect(parsed[0].parsed.typeId).toBe(BuiltInTypeIds.TASK);
    expect(parsed[0].parsed.properties.status).toBe('todo');
    expect(parsed[0].parsed.properties.priority).toBe('high');
  });

  it('extracts hashtags from content', () => {
    const files: VaultFile[] = [
      {
        path: 'notes/tagged.md',
        content: '# Tagged Note\n\nThis has #project and #important tags.',
      },
    ];

    const parsed = parseVaultFiles(files);
    expect(parsed[0].hashtags).toContain('project');
    expect(parsed[0].hashtags).toContain('important');
  });

  it('handles files with wiki-links', () => {
    const files: VaultFile[] = [
      {
        path: 'notes/linked.md',
        content:
          '# Linked Note\n\nSee also [[Other Note]] and [[Project/Details|details]].',
      },
    ];

    const parsed = parseVaultFiles(files);
    expect(parsed[0].parsed.wikiLinks).toHaveLength(2);
    expect(parsed[0].parsed.wikiLinks[0].target).toBe('Other Note');
    expect(parsed[0].parsed.wikiLinks[1].target).toBe('Project/Details');
  });

  it('sets selected to true by default', () => {
    const files: VaultFile[] = [{ path: 'note.md', content: '# Note' }];

    const parsed = parseVaultFiles(files);
    expect(parsed[0].selected).toBe(true);
  });
});

describe('inferTypeFromVaultFile', () => {
  function createParsedFile(
    overrides: Partial<ParsedVaultFile>
  ): ParsedVaultFile {
    return {
      path: 'note.md',
      name: 'note',
      parsed: {
        title: 'Note',
        typeId: null,
        properties: {},
        blocks: [],
        wikiLinks: [],
        rawContent: '',
        errors: [],
      },
      hashtags: [],
      selected: true,
      ...overrides,
    };
  }

  it('returns type from frontmatter with high confidence', () => {
    const file = createParsedFile({
      parsed: {
        title: 'Task',
        typeId: BuiltInTypeIds.TASK,
        properties: {},
        blocks: [],
        wikiLinks: [],
        rawContent: '',
        errors: [],
      },
    });

    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.TASK);
    expect(result.confidence).toBe(0.9);
  });

  it('infers Task from /tasks/ folder path', () => {
    const file = createParsedFile({ path: 'vault/tasks/todo.md' });
    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.TASK);
    expect(result.confidence).toBe(0.7);
  });

  it('infers Project from /projects/ folder path', () => {
    const file = createParsedFile({ path: 'vault/projects/my-project.md' });
    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.PROJECT);
    expect(result.confidence).toBe(0.7);
  });

  it('infers Meeting from /meetings/ folder path', () => {
    const file = createParsedFile({ path: 'work/meetings/standup.md' });
    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.MEETING);
    expect(result.confidence).toBe(0.7);
  });

  it('infers Person from /people/ folder path', () => {
    const file = createParsedFile({ path: 'contacts/people/john-doe.md' });
    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.PERSON);
    expect(result.confidence).toBe(0.7);
  });

  it('infers Task from status property', () => {
    const file = createParsedFile({
      parsed: {
        title: 'Note',
        typeId: null,
        properties: { status: 'todo' },
        blocks: [],
        wikiLinks: [],
        rawContent: '',
        errors: [],
      },
    });

    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.TASK);
    expect(result.confidence).toBe(0.6);
  });

  it('infers Task from dueDate property', () => {
    const file = createParsedFile({
      parsed: {
        title: 'Note',
        typeId: null,
        properties: { dueDate: Date.now() },
        blocks: [],
        wikiLinks: [],
        rawContent: '',
        errors: [],
      },
    });

    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.TASK);
    expect(result.confidence).toBe(0.6);
  });

  it('defaults to Note with low confidence', () => {
    const file = createParsedFile({});
    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.NOTE);
    expect(result.confidence).toBe(0.5);
  });

  it('is case-insensitive for folder paths', () => {
    const file = createParsedFile({ path: 'Vault/TASKS/Important.md' });
    const result = inferTypeFromVaultFile(file);
    expect(result.typeId).toBe(BuiltInTypeIds.TASK);
  });
});
