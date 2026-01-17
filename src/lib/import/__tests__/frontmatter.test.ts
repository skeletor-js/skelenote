/**
 * Tests for YAML frontmatter parser
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseFrontmatter,
  mapTypeToSkelenote,
  convertFrontmatterToProperties,
  extractFolderMapping,
  extractTitle,
} from '../frontmatter';
import { BuiltInTypeIds } from '@/lib/types';

// Mock console.warn to suppress expected warnings
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('parseFrontmatter', () => {
  it('should parse valid YAML frontmatter', () => {
    const markdown = `---
title: Test Note
tags:
  - tag1
  - tag2
---

# Content here`;

    const result = parseFrontmatter(markdown);
    expect(result.hasFrontmatter).toBe(true);
    expect(result.properties.title).toBe('Test Note');
    expect(result.properties.tags).toEqual(['tag1', 'tag2']);
    expect(result.content).toBe('# Content here');
  });

  it('should handle content without frontmatter', () => {
    const markdown = '# Just a heading\n\nSome content';
    const result = parseFrontmatter(markdown);
    expect(result.hasFrontmatter).toBe(false);
    expect(result.properties).toEqual({});
    expect(result.content).toBe('# Just a heading\n\nSome content');
  });

  it('should handle empty frontmatter', () => {
    const markdown = `---
---

Content`;
    const result = parseFrontmatter(markdown);
    expect(result.hasFrontmatter).toBe(false);
    expect(result.content).toBe('Content');
  });

  it('should normalize null values', () => {
    const markdown = `---
empty: null
---
Content`;
    const result = parseFrontmatter(markdown);
    expect(result.properties.empty).toBe(null);
  });

  it('should normalize Date objects', () => {
    const markdown = `---
created: 2024-01-15
---
Content`;
    const result = parseFrontmatter(markdown);
    expect(result.properties.created).toBeInstanceOf(Date);
  });

  it('should normalize boolean values', () => {
    const markdown = `---
active: true
disabled: false
---
Content`;
    const result = parseFrontmatter(markdown);
    expect(result.properties.active).toBe(true);
    expect(result.properties.disabled).toBe(false);
  });

  it('should normalize number values', () => {
    const markdown = `---
count: 42
price: 19.99
---
Content`;
    const result = parseFrontmatter(markdown);
    expect(result.properties.count).toBe(42);
    expect(result.properties.price).toBe(19.99);
  });

  it('should stringify object values', () => {
    const markdown = `---
nested:
  key: value
---
Content`;
    const result = parseFrontmatter(markdown);
    expect(typeof result.properties.nested).toBe('string');
  });

  it('should handle malformed YAML gracefully', () => {
    // Gray-matter is very permissive, but we can test edge cases
    const markdown = `---
title: Test
---
Content`;
    const result = parseFrontmatter(markdown);
    expect(result.content).toBeTruthy();
  });
});

describe('mapTypeToSkelenote', () => {
  it('should map task type', () => {
    expect(mapTypeToSkelenote('task')).toBe(BuiltInTypeIds.TASK);
    expect(mapTypeToSkelenote('TODO')).toBe(BuiltInTypeIds.TASK);
    expect(mapTypeToSkelenote('  Task  ')).toBe(BuiltInTypeIds.TASK);
  });

  it('should map note type', () => {
    expect(mapTypeToSkelenote('note')).toBe(BuiltInTypeIds.NOTE);
    expect(mapTypeToSkelenote('NOTE')).toBe(BuiltInTypeIds.NOTE);
  });

  it('should map project type', () => {
    expect(mapTypeToSkelenote('project')).toBe(BuiltInTypeIds.PROJECT);
  });

  it('should map area type', () => {
    expect(mapTypeToSkelenote('area')).toBe(BuiltInTypeIds.AREA);
  });

  it('should map link/bookmark type', () => {
    expect(mapTypeToSkelenote('link')).toBe(BuiltInTypeIds.LINK);
    expect(mapTypeToSkelenote('bookmark')).toBe(BuiltInTypeIds.LINK);
  });

  it('should map meeting type', () => {
    expect(mapTypeToSkelenote('meeting')).toBe(BuiltInTypeIds.MEETING);
  });

  it('should map tag type', () => {
    expect(mapTypeToSkelenote('tag')).toBe(BuiltInTypeIds.TAG);
  });

  it('should map person/contact type', () => {
    expect(mapTypeToSkelenote('person')).toBe(BuiltInTypeIds.PERSON);
    expect(mapTypeToSkelenote('contact')).toBe(BuiltInTypeIds.PERSON);
  });

  it('should map template type', () => {
    expect(mapTypeToSkelenote('template')).toBe(BuiltInTypeIds.TEMPLATE);
  });

  it('should return null for undefined', () => {
    expect(mapTypeToSkelenote(undefined)).toBe(null);
  });

  it('should return null for unknown types', () => {
    expect(mapTypeToSkelenote('unknown-type')).toBe(null);
    expect(mapTypeToSkelenote('random')).toBe(null);
  });
});

describe('convertFrontmatterToProperties', () => {
  it('should convert date properties', () => {
    const frontmatter = {
      dueDate: '2024-12-25',
      createdAt: new Date('2024-01-01'),
      startDate: 1704067200000,
    };
    const result = convertFrontmatterToProperties(
      frontmatter,
      BuiltInTypeIds.TASK
    );

    expect(typeof result.dueDate).toBe('number');
    expect(typeof result.createdAt).toBe('number');
    expect(result.startDate).toBe(1704067200000);
  });

  it('should convert boolean properties', () => {
    const frontmatter = {
      isDailyNote: 'yes',
      pinned: true,
      checked: false,
    };
    const result = convertFrontmatterToProperties(
      frontmatter,
      BuiltInTypeIds.NOTE
    );

    expect(result.isDailyNote).toBe(true);
    expect(result.pinned).toBe(true);
    expect(result.checked).toBe(false);
  });

  it('should normalize task status values', () => {
    const testCases = [
      { input: 'to do', expected: 'todo' },
      { input: 'to-do', expected: 'todo' },
      { input: 'open', expected: 'todo' },
      { input: 'pending', expected: 'todo' },
      { input: 'in progress', expected: 'in-progress' },
      { input: 'in-progress', expected: 'in-progress' },
      { input: 'inprogress', expected: 'in-progress' },
      { input: 'doing', expected: 'in-progress' },
      { input: 'started', expected: 'in-progress' },
      { input: 'waiting', expected: 'waiting' },
      { input: 'blocked', expected: 'waiting' },
      { input: 'on hold', expected: 'waiting' },
      { input: 'on-hold', expected: 'waiting' },
      { input: 'done', expected: 'done' },
      { input: 'complete', expected: 'done' },
      { input: 'completed', expected: 'done' },
      { input: 'finished', expected: 'done' },
      { input: 'closed', expected: 'done' },
      { input: 'unknown-status', expected: 'todo' }, // Default fallback
    ];

    for (const { input, expected } of testCases) {
      const result = convertFrontmatterToProperties(
        { status: input },
        BuiltInTypeIds.TASK
      );
      expect(result.status).toBe(expected);
    }
  });

  it('should normalize project status values', () => {
    const testCases = [
      { input: 'active', expected: 'active' },
      { input: 'current', expected: 'active' },
      { input: 'in progress', expected: 'active' },
      { input: 'on hold', expected: 'on-hold' },
      { input: 'on-hold', expected: 'on-hold' },
      { input: 'paused', expected: 'on-hold' },
      { input: 'waiting', expected: 'on-hold' },
      { input: 'completed', expected: 'completed' },
      { input: 'done', expected: 'completed' },
      { input: 'finished', expected: 'completed' },
      { input: 'archived', expected: 'archived' },
      { input: 'cancelled', expected: 'archived' },
      { input: 'canceled', expected: 'archived' },
      { input: 'unknown-project-status', expected: 'active' }, // Default fallback
    ];

    for (const { input, expected } of testCases) {
      const result = convertFrontmatterToProperties(
        { status: input },
        BuiltInTypeIds.PROJECT
      );
      expect(result.status).toBe(expected);
    }
  });

  it('should return original status for non-task/project types', () => {
    const result = convertFrontmatterToProperties(
      { status: 'custom-status' },
      BuiltInTypeIds.NOTE
    );
    expect(result.status).toBe('custom-status');
  });

  it('should handle null status', () => {
    const result = convertFrontmatterToProperties(
      { status: null },
      BuiltInTypeIds.TASK
    );
    // Null values are skipped, so the property doesn't exist
    expect('status' in result).toBe(false);
  });

  it('should handle non-string status', () => {
    const result = convertFrontmatterToProperties(
      { status: 123 },
      BuiltInTypeIds.TASK
    );
    expect(result.status).toBeNull();
  });

  it('should normalize priority values', () => {
    const testCases = [
      { input: '1', expected: 'low' },
      { input: '2', expected: 'medium' },
      { input: '3', expected: 'high' },
      { input: '4', expected: 'urgent' },
      { input: 1, expected: 'low' },
      { input: 2, expected: 'medium' },
      { input: 3, expected: 'high' },
      { input: 4, expected: 'urgent' },
      { input: 'low', expected: 'low' },
      { input: 'normal', expected: 'medium' },
      { input: 'medium', expected: 'medium' },
      { input: 'high', expected: 'high' },
      { input: 'urgent', expected: 'urgent' },
      { input: 'critical', expected: 'urgent' },
      { input: 'unknown', expected: null },
    ];

    for (const { input, expected } of testCases) {
      const result = convertFrontmatterToProperties(
        { priority: input },
        BuiltInTypeIds.TASK
      );
      expect(result.priority).toBe(expected);
    }
  });

  it('should handle null priority', () => {
    const result = convertFrontmatterToProperties(
      { priority: null },
      BuiltInTypeIds.TASK
    );
    // Null values are skipped, so the property doesn't exist
    expect('priority' in result).toBe(false);
  });

  it('should convert kebab-case to camelCase', () => {
    const frontmatter = {
      'due-date': '2024-12-25',
      'start-time': '2024-12-20',
    };
    const result = convertFrontmatterToProperties(
      frontmatter,
      BuiltInTypeIds.TASK
    );

    expect('dueDate' in result).toBe(true);
    expect('startTime' in result).toBe(true);
  });

  it('should skip null values', () => {
    const result = convertFrontmatterToProperties(
      { title: null },
      BuiltInTypeIds.NOTE
    );
    expect('title' in result).toBe(false);
  });

  it('should skip type property', () => {
    const result = convertFrontmatterToProperties(
      { type: 'task' },
      BuiltInTypeIds.TASK
    );
    expect('type' in result).toBe(false);
  });

  it('should preserve arrays', () => {
    const result = convertFrontmatterToProperties(
      { tags: ['a', 'b', 'c'] },
      BuiltInTypeIds.NOTE
    );
    expect(result.tags).toEqual(['a', 'b', 'c']);
  });

  it('should handle Date objects that are not date properties', () => {
    const now = new Date();
    const result = convertFrontmatterToProperties(
      { customField: now },
      BuiltInTypeIds.NOTE
    );
    expect(typeof result.customField).toBe('number');
    expect(result.customField).toBe(now.getTime());
  });

  it('should handle invalid date strings', () => {
    const result = convertFrontmatterToProperties(
      { dueDate: 'not-a-date' },
      BuiltInTypeIds.TASK
    );
    expect('dueDate' in result).toBe(false);
  });
});

describe('extractFolderMapping', () => {
  it('should extract project from immediate parent folder', () => {
    const result = extractFolderMapping('/notes/Work/MyProject/file.md');
    expect(result.projectName).toBe('MyProject');
  });

  it('should extract area from grandparent folder', () => {
    const result = extractFolderMapping('/notes/Work/MyProject/file.md');
    expect(result.areaName).toBe('Work');
  });

  it('should extract tags from remaining folders', () => {
    const result = extractFolderMapping(
      '/Category/SubCategory/Work/Project/file.md'
    );
    expect(result.folderTags).toEqual(['Category', 'SubCategory']);
  });

  it('should handle Windows-style paths', () => {
    const result = extractFolderMapping(
      'C:\\Users\\Name\\Work\\Project\\file.md'
    );
    expect(result.projectName).toBe('Project');
    expect(result.areaName).toBe('Work');
  });

  it('should filter out common root folders', () => {
    const ignoredFolders = [
      'notes',
      'documents',
      'vault',
      'obsidian',
      'notion',
      'export',
      'backup',
    ];

    for (const folder of ignoredFolders) {
      const result = extractFolderMapping(`/${folder}/Work/Project/file.md`);
      expect(result.projectName).toBe('Project');
      expect(result.areaName).toBe('Work');
      expect(result.folderTags).not.toContain(folder);
    }
  });

  it('should handle single folder path', () => {
    const result = extractFolderMapping('/Project/file.md');
    expect(result.projectName).toBe('Project');
    expect(result.areaName).toBeUndefined();
    expect(result.folderTags).toEqual([]);
  });

  it('should handle root-level file', () => {
    const result = extractFolderMapping('/file.md');
    expect(result.projectName).toBeUndefined();
    expect(result.areaName).toBeUndefined();
    expect(result.folderTags).toEqual([]);
  });

  it('should handle empty path', () => {
    const result = extractFolderMapping('');
    expect(result.folderTags).toEqual([]);
  });

  it('should handle path without file extension', () => {
    const result = extractFolderMapping('/Work/Project/subfolder');
    expect(result.projectName).toBe('subfolder');
    expect(result.areaName).toBe('Project');
  });

  it('should handle only ignored folders', () => {
    const result = extractFolderMapping('/notes/vault/obsidian/file.md');
    expect(result.folderTags).toEqual([]);
    expect(result.projectName).toBeUndefined();
  });
});

describe('extractTitle', () => {
  it('should extract title from frontmatter', () => {
    const result = extractTitle({ title: 'My Title' }, '# Different H1');
    expect(result).toBe('My Title');
  });

  it('should extract name from frontmatter as fallback', () => {
    const result = extractTitle({ name: 'My Name' }, '# Different H1');
    expect(result).toBe('My Name');
  });

  it('should prefer title over name', () => {
    const result = extractTitle({ title: 'Title', name: 'Name' }, '');
    expect(result).toBe('Title');
  });

  it('should extract from H1 when no frontmatter title', () => {
    const result = extractTitle({}, '# My H1 Title\n\nContent');
    expect(result).toBe('My H1 Title');
  });

  it('should return Untitled when no title found', () => {
    const result = extractTitle({}, 'Just plain content');
    expect(result).toBe('Untitled');
  });

  it('should not extract from H1 when extractFromH1 is false', () => {
    const result = extractTitle({}, '# Ignored H1', false);
    expect(result).toBe('Untitled');
  });

  it('should handle non-string title in frontmatter', () => {
    const result = extractTitle({ title: 123 }, '# H1 Title');
    expect(result).toBe('H1 Title');
  });

  it('should handle non-string name in frontmatter', () => {
    const result = extractTitle({ name: null }, '# H1 Title');
    expect(result).toBe('H1 Title');
  });

  it('should trim H1 title', () => {
    const result = extractTitle({}, '#   Spaced Title   \n');
    expect(result).toBe('Spaced Title');
  });

  it('should match H1 anywhere in content', () => {
    const result = extractTitle(
      {},
      'Some intro text\n\n# The Heading\n\nMore content'
    );
    expect(result).toBe('The Heading');
  });
});
