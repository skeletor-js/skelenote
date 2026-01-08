/**
 * Markdown to BlockNote converter
 *
 * Transforms Markdown content (including YAML frontmatter) into BlockNote format.
 * This is the foundation for all import wizards (Obsidian, Notion, Apple Notes, etc.).
 */

import type {
  MarkdownImportResult,
  MarkdownImportOptions,
  MarkdownToBlockNoteResult,
  BlockNoteBlock,
  BlockNoteInlineContent,
  WikiLink,
} from './types';
import { DEFAULT_IMPORT_OPTIONS } from './types';
import {
  parseFrontmatter,
  mapTypeToSkelenote,
  convertFrontmatterToProperties,
  extractTitle,
  extractFolderMapping,
} from './frontmatter';
import {
  extractWikiLinks,
  preprocessWikiLinks,
  convertWikiLinksToMentions,
  hasWikiLinks,
} from './wiki-links';

/**
 * Parse Markdown content into BlockNote blocks
 *
 * This is a standalone parser that doesn't require a BlockNote editor instance.
 * It handles standard Markdown syntax and converts to BlockNote format.
 *
 * @param markdown - Markdown string to convert
 * @returns BlockNote blocks and wiki-links found
 */
export function parseMarkdownToBlocks(
  markdown: string
): MarkdownToBlockNoteResult {
  const blocks: BlockNoteBlock[] = [];
  const wikiLinks: WikiLink[] = [];
  const errors: string[] = [];

  // Extract wiki-links before processing
  if (hasWikiLinks(markdown)) {
    wikiLinks.push(...extractWikiLinks(markdown));
    markdown = preprocessWikiLinks(markdown);
  }

  // Split into lines for processing
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const { block, endIndex } = parseCodeBlock(lines, i);
      blocks.push(block);
      i = endIndex + 1;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push(createHeading(headingMatch[2], headingMatch[1].length));
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const { block, endIndex } = parseBlockquote(lines, i);
      blocks.push(block);
      i = endIndex + 1;
      continue;
    }

    // Checklist (must check before regular list)
    if (/^(\s*)[-*+]\s+\[[ xX]\]\s/.test(line)) {
      const { block, endIndex } = parseChecklist(lines, i);
      blocks.push(block);
      i = endIndex + 1;
      continue;
    }

    // Unordered list
    if (/^(\s*)[-*+]\s/.test(line)) {
      const { block, endIndex } = parseList(lines, i, 'bullet');
      blocks.push(block);
      i = endIndex + 1;
      continue;
    }

    // Ordered list
    if (/^(\s*)\d+\.\s/.test(line)) {
      const { block, endIndex } = parseList(lines, i, 'numbered');
      blocks.push(block);
      i = endIndex + 1;
      continue;
    }

    // Table
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1].includes('---')
    ) {
      const { block, endIndex } = parseTable(lines, i);
      if (block) {
        blocks.push(block);
      }
      i = endIndex + 1;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      // BlockNote doesn't have horizontal rules, skip or convert to empty paragraph
      i++;
      continue;
    }

    // Default: paragraph
    blocks.push(createParagraph(line));
    i++;
  }

  return { blocks, wikiLinks, errors };
}

/**
 * Create a heading block
 */
function createHeading(text: string, level: number): BlockNoteBlock {
  return {
    type: 'heading',
    props: { level: Math.min(level, 3) }, // BlockNote supports h1-h3
    content: parseInlineContent(text),
    children: [],
  };
}

/**
 * Create a paragraph block
 */
function createParagraph(text: string): BlockNoteBlock {
  return {
    type: 'paragraph',
    props: {},
    content: parseInlineContent(text),
    children: [],
  };
}

/**
 * Parse a code block
 */
function parseCodeBlock(
  lines: string[],
  startIndex: number
): { block: BlockNoteBlock; endIndex: number } {
  const firstLine = lines[startIndex];
  const language = firstLine.replace(/^```/, '').trim();
  const codeLines: string[] = [];

  let i = startIndex + 1;
  while (i < lines.length && !lines[i].startsWith('```')) {
    codeLines.push(lines[i]);
    i++;
  }

  return {
    block: {
      type: 'codeBlock',
      props: { language: language || 'plaintext' },
      content: [{ type: 'text', text: codeLines.join('\n'), styles: {} }],
      children: [],
    },
    endIndex: i,
  };
}

/**
 * Parse a blockquote
 */
function parseBlockquote(
  lines: string[],
  startIndex: number
): { block: BlockNoteBlock; endIndex: number } {
  const quoteLines: string[] = [];
  let i = startIndex;

  while (i < lines.length && lines[i].startsWith('>')) {
    quoteLines.push(lines[i].replace(/^>\s?/, ''));
    i++;
  }

  return {
    block: {
      type: 'blockquote',
      props: {},
      content: parseInlineContent(quoteLines.join('\n')),
      children: [],
    },
    endIndex: i - 1,
  };
}

/**
 * Parse a list (bullet or numbered)
 */
function parseList(
  lines: string[],
  startIndex: number,
  listType: 'bullet' | 'numbered'
): { block: BlockNoteBlock; endIndex: number } {
  const line = lines[startIndex];
  const match =
    listType === 'bullet'
      ? line.match(/^(\s*)[-*+]\s+(.+)$/)
      : line.match(/^(\s*)\d+\.\s+(.+)$/);

  if (!match) {
    return {
      block: createParagraph(line),
      endIndex: startIndex,
    };
  }

  const content = match[2];
  const blockType =
    listType === 'bullet' ? 'bulletListItem' : 'numberedListItem';

  return {
    block: {
      type: blockType,
      props: {},
      content: parseInlineContent(content),
      children: [],
    },
    endIndex: startIndex,
  };
}

/**
 * Parse a checklist item
 */
function parseChecklist(
  lines: string[],
  startIndex: number
): { block: BlockNoteBlock; endIndex: number } {
  const line = lines[startIndex];
  const match = line.match(/^(\s*)[-*+]\s+\[([xX ])\]\s+(.+)$/);

  if (!match) {
    return {
      block: createParagraph(line),
      endIndex: startIndex,
    };
  }

  const checked = match[2].toLowerCase() === 'x';
  const content = match[3];

  return {
    block: {
      type: 'checkListItem',
      props: { checked },
      content: parseInlineContent(content),
      children: [],
    },
    endIndex: startIndex,
  };
}

/**
 * Parse a table
 */
function parseTable(
  lines: string[],
  startIndex: number
): { block: BlockNoteBlock | null; endIndex: number } {
  const tableLines: string[] = [];
  let i = startIndex;

  // Collect all table lines
  while (i < lines.length && lines[i].includes('|')) {
    tableLines.push(lines[i]);
    i++;
  }

  if (tableLines.length < 2) {
    return { block: null, endIndex: i - 1 };
  }

  // Parse header row
  const headerRow = parseTableRow(tableLines[0]);

  // Skip separator row (index 1)
  // Parse data rows
  const dataRows = tableLines.slice(2).map(parseTableRow);

  // Build BlockNote table structure
  const rows = [
    {
      cells: headerRow.map((cell) => ({
        type: 'tableCell' as const,
        content: parseInlineContent(cell),
      })),
    },
    ...dataRows.map((row) => ({
      cells: row.map((cell) => ({
        type: 'tableCell' as const,
        content: parseInlineContent(cell),
      })),
    })),
  ];

  return {
    block: {
      type: 'table',
      props: {},
      content: {
        type: 'tableContent',
        rows,
      },
      children: [],
    },
    endIndex: i - 1,
  };
}

/**
 * Parse a single table row
 */
function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell !== '');
}

/**
 * Parse inline content (bold, italic, code, links, etc.)
 */
function parseInlineContent(text: string): BlockNoteInlineContent[] {
  const result: BlockNoteInlineContent[] = [];

  // Regex patterns for inline formatting
  const patterns = [
    // Our mention placeholder: @[text](skelenote:mention:target)
    {
      regex: /@\[([^\]]+)\]\(skelenote:mention:([^)]+)\)/g,
      handler: (m: RegExpExecArray): BlockNoteInlineContent => ({
        type: 'link',
        props: { href: `skelenote:mention:${m[2]}` },
        content: [{ type: 'text', text: m[1], styles: {} }],
      }),
    },
    // Standard links: [text](url)
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/g,
      handler: (m: RegExpExecArray): BlockNoteInlineContent => ({
        type: 'link',
        props: { href: m[2] },
        content: [{ type: 'text', text: m[1], styles: {} }],
      }),
    },
    // Bold: **text** or __text__
    {
      regex: /\*\*([^*]+)\*\*|__([^_]+)__/g,
      handler: (m: RegExpExecArray): BlockNoteInlineContent => ({
        type: 'text',
        text: m[1] || m[2],
        styles: { bold: true },
      }),
    },
    // Italic: *text* or _text_
    {
      regex: /(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g,
      handler: (m: RegExpExecArray): BlockNoteInlineContent => ({
        type: 'text',
        text: m[1] || m[2],
        styles: { italic: true },
      }),
    },
    // Inline code: `text`
    {
      regex: /`([^`]+)`/g,
      handler: (m: RegExpExecArray): BlockNoteInlineContent => ({
        type: 'text',
        text: m[1],
        styles: { code: true },
      }),
    },
    // Strikethrough: ~~text~~
    {
      regex: /~~([^~]+)~~/g,
      handler: (m: RegExpExecArray): BlockNoteInlineContent => ({
        type: 'text',
        text: m[1],
        styles: { strike: true },
      }),
    },
  ];

  // Build a combined regex and process matches in order
  let lastIndex = 0;
  const allMatches: Array<{
    index: number;
    length: number;
    content: BlockNoteInlineContent;
  }> = [];

  for (const { regex, handler } of patterns) {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        content: handler(match),
      });
    }
  }

  // Sort by position
  allMatches.sort((a, b) => a.index - b.index);

  // Remove overlapping matches (keep first)
  const filteredMatches: typeof allMatches = [];
  for (const match of allMatches) {
    const lastMatch = filteredMatches[filteredMatches.length - 1];
    if (!lastMatch || match.index >= lastMatch.index + lastMatch.length) {
      filteredMatches.push(match);
    }
  }

  // Build result with plain text between matches
  for (const match of filteredMatches) {
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        text: text.slice(lastIndex, match.index),
        styles: {},
      });
    }
    result.push(match.content);
    lastIndex = match.index + match.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push({
      type: 'text',
      text: text.slice(lastIndex),
      styles: {},
    });
  }

  // Return plain text if no formatting found
  if (result.length === 0) {
    return [{ type: 'text', text, styles: {} }];
  }

  return result;
}

/**
 * Full Markdown import pipeline
 *
 * Parses a complete Markdown file including frontmatter,
 * converts content to BlockNote blocks, and extracts metadata.
 *
 * @param markdown - Raw Markdown content
 * @param options - Import options
 * @returns Complete import result
 */
export function importMarkdown(
  markdown: string,
  options: MarkdownImportOptions = {}
): MarkdownImportResult {
  const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const errors: string[] = [];

  // Parse frontmatter
  const {
    properties: frontmatter,
    content,
    hasFrontmatter,
  } = parseFrontmatter(markdown);

  // Determine type
  const typeFromFrontmatter = mapTypeToSkelenote(frontmatter.type as string);
  const typeId = typeFromFrontmatter || opts.defaultTypeId;

  // Convert frontmatter to properties
  const properties = convertFrontmatterToProperties(frontmatter, typeId);

  // Extract title
  const title = extractTitle(frontmatter, content, opts.extractTitleFromH1);

  // Handle folder mapping if file path provided
  if (opts.filePath) {
    const folderMapping = extractFolderMapping(opts.filePath);

    // These will be used by the importer to create/link projects and areas
    if (folderMapping.projectName && !properties.project) {
      // Store as hint for importer (not a direct relation)
      properties._suggestedProject = folderMapping.projectName;
    }
    if (folderMapping.areaName && !properties.area) {
      properties._suggestedArea = folderMapping.areaName;
    }
    if (folderMapping.folderTags.length > 0) {
      properties._suggestedTags = folderMapping.folderTags;
    }
  }

  // Parse content to blocks
  const parsed = parseMarkdownToBlocks(content);
  let blocks = parsed.blocks;
  const wikiLinks = parsed.wikiLinks;

  // Convert wiki-links to mentions if resolver provided
  if (opts.resolveWikiLink && wikiLinks.length > 0) {
    const { blocks: processedBlocks, unresolvedLinks } =
      convertWikiLinksToMentions(blocks, (target) => {
        const id = opts.resolveWikiLink!(target);
        return id ? { id } : null;
      });
    blocks = processedBlocks;

    if (unresolvedLinks.length > 0) {
      errors.push(`Unresolved links: ${unresolvedLinks.join(', ')}`);
    }
  }

  // Remove title from content if it was extracted from H1
  if (
    opts.extractTitleFromH1 &&
    !hasFrontmatter &&
    blocks.length > 0 &&
    blocks[0].type === 'heading'
  ) {
    const headingContent = blocks[0].content as
      | BlockNoteInlineContent[]
      | undefined;
    if (
      Array.isArray(headingContent) &&
      headingContent.length > 0 &&
      headingContent[0].type === 'text' &&
      headingContent[0].text === title
    ) {
      blocks = blocks.slice(1);
    }
  }

  return {
    title,
    typeId,
    properties,
    blocks,
    wikiLinks,
    rawContent: content,
    errors,
  };
}

/**
 * Import multiple Markdown files
 *
 * @param files - Array of { path, content } objects
 * @param options - Import options (applied to all files)
 * @returns Array of import results
 */
export function importMarkdownFiles(
  files: Array<{ path: string; content: string }>,
  options: Omit<MarkdownImportOptions, 'filePath'> = {}
): MarkdownImportResult[] {
  return files.map(({ path, content }) =>
    importMarkdown(content, { ...options, filePath: path })
  );
}
