/**
 * Wiki-link parser for Markdown import
 *
 * Detects and extracts wiki-style links [[like this]] from Markdown content,
 * which can then be converted to BlockNote mentions.
 */

import type { WikiLink, BlockNoteBlock, BlockNoteInlineContent } from './types';

/**
 * Regular expression pattern for wiki-links
 * Matches:
 * - [[simple link]]
 * - [[target|display text]]
 * - Handles escaped brackets
 */
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Extract all wiki-links from Markdown content
 *
 * @param content - Markdown string to parse
 * @returns Array of wiki-link matches with positions
 */
export function extractWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];

  // Use matchAll for cleaner iteration
  const matches = content.matchAll(WIKI_LINK_PATTERN);

  for (const match of matches) {
    const target = match[1].trim();
    const displayText = match[2]?.trim();

    links.push({
      fullMatch: match[0],
      target,
      displayText,
      startIndex: match.index ?? 0,
      endIndex: (match.index ?? 0) + match[0].length,
    });
  }

  return links;
}

/**
 * Convert wiki-links in text to mention-style placeholders
 *
 * This preprocesses the markdown before BlockNote parsing,
 * replacing [[links]] with a special syntax that can be
 * post-processed into proper mentions.
 *
 * @param content - Markdown content with wiki-links
 * @returns Markdown with wiki-links converted to placeholders
 */
export function preprocessWikiLinks(content: string): string {
  // Replace wiki-links with a temporary marker that won't be
  // modified by the markdown parser
  return content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target, display) => {
      const text = display || target;
      // Use a special format that we can detect later
      const encodedTarget = encodeURIComponent(target.trim());
      return `@[${text.trim()}](skelenote:mention:${encodedTarget})`;
    }
  );
}

/**
 * Create a mention inline content block
 */
export function createMentionInline(
  objectId: string,
  objectName: string,
  objectTypeId?: string
): BlockNoteInlineContent {
  return {
    type: 'mention',
    props: {
      objectId,
      objectName,
      objectTypeId: objectTypeId || 'built-in:note',
    },
  };
}

/**
 * Process BlockNote blocks to convert wiki-link placeholders to mentions
 *
 * After BlockNote parses the markdown, this function walks through
 * the blocks and converts any placeholder links to proper mentions.
 *
 * @param blocks - BlockNote blocks to process
 * @param resolveTarget - Function to resolve wiki-link target to object ID
 * @returns Processed blocks with mentions
 */
export function convertWikiLinksToMentions(
  blocks: BlockNoteBlock[],
  resolveTarget: (target: string) => { id: string; typeId?: string } | null
): { blocks: BlockNoteBlock[]; unresolvedLinks: string[] } {
  const unresolvedLinks: string[] = [];

  function processInlineContent(
    content: BlockNoteInlineContent[]
  ): BlockNoteInlineContent[] {
    const result: BlockNoteInlineContent[] = [];

    for (const inline of content) {
      if (inline.type === 'link') {
        const href = inline.props?.href || inline.props?.url;
        if (typeof href === 'string' && href.startsWith('skelenote:mention:')) {
          // This is a wiki-link placeholder
          const target = decodeURIComponent(
            href.replace('skelenote:mention:', '')
          );
          const resolved = resolveTarget(target);

          if (resolved) {
            // Convert to mention
            result.push(
              createMentionInline(
                resolved.id,
                target, // Use original target as display name
                resolved.typeId
              )
            );
          } else {
            // Keep as text if unresolved
            unresolvedLinks.push(target);
            result.push({
              type: 'text',
              text: `[[${target}]]`,
              styles: {},
            });
          }
          continue;
        }
      }

      // Process nested content
      if (inline.content && Array.isArray(inline.content)) {
        result.push({
          ...inline,
          content: processInlineContent(inline.content),
        });
      } else {
        result.push(inline);
      }
    }

    return result;
  }

  function processBlock(block: BlockNoteBlock): BlockNoteBlock {
    const processed = { ...block };

    // Process inline content
    if (Array.isArray(processed.content)) {
      processed.content = processInlineContent(
        processed.content as BlockNoteInlineContent[]
      );
    }

    // Process children recursively
    if (processed.children && Array.isArray(processed.children)) {
      processed.children = processed.children.map(processBlock);
    }

    return processed;
  }

  return {
    blocks: blocks.map(processBlock),
    unresolvedLinks: [...new Set(unresolvedLinks)],
  };
}

/**
 * Detect if content likely contains wiki-links
 *
 * Useful for optimizing processing - skip wiki-link handling
 * if there are none.
 */
export function hasWikiLinks(content: string): boolean {
  return /\[\[.+?\]\]/.test(content);
}
