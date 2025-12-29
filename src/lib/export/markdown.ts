/**
 * BlockNote to Markdown converter
 *
 * Converts BlockNote JSON content to clean Markdown syntax
 * with wiki-link style mentions for Obsidian/LogSeq compatibility.
 */

import type {
  BlockNoteBlock,
  BlockNoteInlineContent,
  MarkdownConversionResult,
} from './types';

/**
 * Context for markdown conversion
 */
interface ConversionContext {
  /** Function to resolve object ID to name */
  resolveObjectName: (objectId: string) => string | undefined;
  /** Collected mention IDs during conversion */
  mentionedObjectIds: Set<string>;
  /** Current list item counter for numbered lists */
  numberedListCounter: number;
}

/**
 * Convert inline content styles to Markdown
 */
function applyStyles(text: string, styles?: Record<string, boolean | string>): string {
  if (!styles || !text) return text;

  let result = text;

  // Apply styles in order: code first (innermost), then others
  if (styles.code) {
    result = `\`${result}\``;
  }
  if (styles.bold) {
    result = `**${result}**`;
  }
  if (styles.italic) {
    result = `*${result}*`;
  }
  if (styles.strike) {
    result = `~~${result}~~`;
  }
  if (styles.underline) {
    // Markdown doesn't have native underline, use HTML
    result = `<u>${result}</u>`;
  }

  return result;
}

/**
 * Convert a single inline content element to Markdown
 */
function convertInlineContent(
  inline: BlockNoteInlineContent,
  context: ConversionContext
): string {
  switch (inline.type) {
    case 'text':
      return applyStyles(inline.text || '', inline.styles);

    case 'link': {
      const linkText = inline.content
        ?.map((c) => convertInlineContent(c, context))
        .join('') || inline.text || '';
      const url = inline.props?.href || inline.props?.url || '';
      return `[${linkText}](${url})`;
    }

    case 'mention': {
      const objectId = inline.props?.objectId as string;
      const objectName = inline.props?.objectName as string;

      if (objectId) {
        context.mentionedObjectIds.add(objectId);
        // Try to resolve current name, fall back to stored name
        const resolvedName = context.resolveObjectName(objectId) || objectName || 'Unknown';
        return `[[${resolvedName}]]`;
      }
      return `[[${objectName || 'Unknown'}]]`;
    }

    default:
      // For unknown inline types, try to extract text
      if (inline.text) return inline.text;
      if (inline.content) {
        return inline.content.map((c) => convertInlineContent(c, context)).join('');
      }
      return '';
  }
}

/**
 * Convert an array of inline content to Markdown string
 */
function convertInlineArray(
  content: BlockNoteInlineContent[] | undefined,
  context: ConversionContext
): string {
  if (!content || !Array.isArray(content)) return '';
  return content.map((c) => convertInlineContent(c, context)).join('');
}

/**
 * Convert a heading block to Markdown
 */
function convertHeading(block: BlockNoteBlock, context: ConversionContext): string {
  const level = (block.props?.level as number) || 1;
  const prefix = '#'.repeat(Math.min(level, 6));
  const content = convertInlineArray(block.content as BlockNoteInlineContent[], context);
  return `${prefix} ${content}`;
}

/**
 * Convert a paragraph block to Markdown
 */
function convertParagraph(block: BlockNoteBlock, context: ConversionContext): string {
  return convertInlineArray(block.content as BlockNoteInlineContent[], context);
}

/**
 * Convert a bullet list item to Markdown
 */
function convertBulletListItem(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number
): string {
  const indent = '  '.repeat(depth);
  const content = convertInlineArray(block.content as BlockNoteInlineContent[], context);
  const lines = [`${indent}- ${content}`];

  // Process nested children
  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      lines.push(convertBlock(child, context, depth + 1));
    }
  }

  return lines.join('\n');
}

/**
 * Convert a numbered list item to Markdown
 */
function convertNumberedListItem(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number
): string {
  const indent = '  '.repeat(depth);
  const content = convertInlineArray(block.content as BlockNoteInlineContent[], context);

  // Use 1. for all items (Markdown renderers will auto-number)
  const lines = [`${indent}1. ${content}`];

  // Process nested children
  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      lines.push(convertBlock(child, context, depth + 1));
    }
  }

  return lines.join('\n');
}

/**
 * Convert a checklist item to Markdown
 */
function convertCheckListItem(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number
): string {
  const indent = '  '.repeat(depth);
  const checked = block.props?.checked ? 'x' : ' ';
  const content = convertInlineArray(block.content as BlockNoteInlineContent[], context);
  const lines = [`${indent}- [${checked}] ${content}`];

  // Process nested children
  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      lines.push(convertBlock(child, context, depth + 1));
    }
  }

  return lines.join('\n');
}

/**
 * Convert a code block to Markdown
 */
function convertCodeBlock(block: BlockNoteBlock, context: ConversionContext): string {
  const language = (block.props?.language as string) || '';
  const content = convertInlineArray(block.content as BlockNoteInlineContent[], context);
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

/**
 * Convert a blockquote to Markdown
 */
function convertBlockquote(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number
): string {
  const content = convertInlineArray(block.content as BlockNoteInlineContent[], context);
  const lines = [`> ${content}`];

  // Process nested children (also quoted)
  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      const childMd = convertBlock(child, context, depth);
      // Prefix each line with >
      lines.push(
        childMd
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')
      );
    }
  }

  return lines.join('\n');
}

/**
 * Convert a table to GitHub Flavored Markdown
 */
function convertTable(block: BlockNoteBlock, context: ConversionContext): string {
  const content = block.content as BlockNoteBlock[];
  if (!content || content.length === 0) return '';

  const rows: string[][] = [];

  // Extract table rows
  for (const row of content) {
    if (row.type === 'tableRow' && row.content) {
      const cells: string[] = [];
      for (const cell of row.content as BlockNoteBlock[]) {
        if (cell.type === 'tableCell' && cell.content) {
          cells.push(convertInlineArray(cell.content as BlockNoteInlineContent[], context));
        }
      }
      rows.push(cells);
    }
  }

  if (rows.length === 0) return '';

  const lines: string[] = [];

  // First row is header
  const header = rows[0];
  lines.push(`| ${header.join(' | ')} |`);

  // Separator row
  lines.push(`| ${header.map(() => '---').join(' | ')} |`);

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    lines.push(`| ${rows[i].join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Convert an image block to Markdown
 */
function convertImage(block: BlockNoteBlock): string {
  const url = (block.props?.url as string) || '';
  const alt = (block.props?.caption as string) || (block.props?.name as string) || '';
  return `![${alt}](${url})`;
}

/**
 * Convert a single block to Markdown
 */
function convertBlock(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number = 0
): string {
  switch (block.type) {
    case 'paragraph':
      return convertParagraph(block, context);

    case 'heading':
      return convertHeading(block, context);

    case 'bulletListItem':
      return convertBulletListItem(block, context, depth);

    case 'numberedListItem':
      return convertNumberedListItem(block, context, depth);

    case 'checkListItem':
      return convertCheckListItem(block, context, depth);

    case 'codeBlock':
      return convertCodeBlock(block, context);

    case 'blockquote':
      return convertBlockquote(block, context, depth);

    case 'table':
      return convertTable(block, context);

    case 'image':
      return convertImage(block);

    default:
      // For unknown block types, try to extract content
      if (block.content && Array.isArray(block.content)) {
        return convertInlineArray(block.content as BlockNoteInlineContent[], context);
      }
      return '';
  }
}

/**
 * Convert BlockNote JSON content to Markdown
 *
 * @param contentJson - The BlockNote JSON string or parsed blocks array
 * @param resolveObjectName - Function to resolve object IDs to names for mentions
 * @returns Conversion result with Markdown string and mentioned object IDs
 */
export function convertBlockNoteToMarkdown(
  contentJson: string | BlockNoteBlock[],
  resolveObjectName: (objectId: string) => string | undefined
): MarkdownConversionResult {
  const context: ConversionContext = {
    resolveObjectName,
    mentionedObjectIds: new Set(),
    numberedListCounter: 1,
  };

  // Parse JSON if string
  let blocks: BlockNoteBlock[];
  try {
    blocks = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
  } catch {
    return {
      markdown: '',
      mentionedObjectIds: [],
    };
  }

  if (!Array.isArray(blocks)) {
    return {
      markdown: '',
      mentionedObjectIds: [],
    };
  }

  // Convert each block
  const markdownLines: string[] = [];
  for (const block of blocks) {
    const md = convertBlock(block, context);
    if (md) {
      markdownLines.push(md);
    }
  }

  // Join with double newlines for paragraph separation
  const markdown = markdownLines.join('\n\n');

  return {
    markdown,
    mentionedObjectIds: Array.from(context.mentionedObjectIds),
  };
}
