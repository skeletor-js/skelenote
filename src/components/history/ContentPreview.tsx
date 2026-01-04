/**
 * ContentPreview - Lightweight read-only BlockNote content renderer
 * Renders block content as HTML without requiring a full editor instance
 */

import { useMemo } from 'react';
import { Box, ScrollArea, Text } from '@mantine/core';
import { deserializeBlockNoteDocument } from '@/lib/editor';
import classes from './ContentPreview.module.css';

/**
 * BlockNote inline content types
 */
interface TextInline {
  type: 'text';
  text: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
}

interface MentionInline {
  type: 'mention';
  props: {
    objectId: string;
    objectName: string;
    objectTypeId: string;
  };
}

interface LinkInline {
  type: 'link';
  content: InlineContent[];
  href: string;
}

type InlineContent = TextInline | MentionInline | LinkInline | { type: string };

/**
 * BlockNote block structure
 */
interface Block {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: InlineContent[];
  children?: Block[];
}

export interface ContentPreviewProps {
  /** BlockNote JSON content string */
  content: string | null;
  /** Maximum height before scrolling (default: 200) */
  maxHeight?: number;
  /** Show placeholder when content is empty */
  showEmptyPlaceholder?: boolean;
}

/**
 * Render inline content to React elements
 */
function renderInlineContent(content: InlineContent[] | undefined, key: string): React.ReactNode {
  if (!content || !Array.isArray(content)) {
    return null;
  }

  return content.map((item, index) => {
    const itemKey = `${key}-${index}`;

    if (item.type === 'text') {
      const textItem = item as TextInline;
      let text: React.ReactNode = textItem.text;

      // Apply styles
      if (textItem.styles?.bold) {
        text = <strong key={`${itemKey}-bold`}>{text}</strong>;
      }
      if (textItem.styles?.italic) {
        text = <em key={`${itemKey}-italic`}>{text}</em>;
      }
      if (textItem.styles?.underline) {
        text = <u key={`${itemKey}-underline`}>{text}</u>;
      }
      if (textItem.styles?.strikethrough) {
        text = <s key={`${itemKey}-strike`}>{text}</s>;
      }
      if (textItem.styles?.code) {
        text = <code key={`${itemKey}-code`} className={classes.inlineCode}>{text}</code>;
      }

      return <span key={itemKey}>{text}</span>;
    }

    if (item.type === 'mention') {
      const mention = item as MentionInline;
      return (
        <span key={itemKey} className={classes.mention}>
          @{mention.props.objectName || 'Unknown'}
        </span>
      );
    }

    if (item.type === 'link') {
      const link = item as LinkInline;
      return (
        <a
          key={itemKey}
          href={link.href}
          className={classes.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {renderInlineContent(link.content, `${itemKey}-link`)}
        </a>
      );
    }

    return null;
  });
}

/**
 * Render a single block to React element
 */
function renderBlock(block: Block, key: string): React.ReactNode {
  const content = renderInlineContent(block.content, key);

  switch (block.type) {
    case 'paragraph':
      return (
        <p key={key} className={classes.paragraph}>
          {content || '\u00A0'}
        </p>
      );

    case 'heading': {
      const level = (block.props?.level as number) || 1;
      const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag key={key} className={classes.heading} data-level={level}>
          {content}
        </HeadingTag>
      );
    }

    case 'bulletListItem':
      return (
        <li key={key} className={classes.bulletItem}>
          {content}
          {block.children?.length ? (
            <ul className={classes.nestedList}>
              {block.children.map((child, i) => renderBlock(child, `${key}-child-${i}`))}
            </ul>
          ) : null}
        </li>
      );

    case 'numberedListItem':
      return (
        <li key={key} className={classes.numberedItem}>
          {content}
          {block.children?.length ? (
            <ol className={classes.nestedList}>
              {block.children.map((child, i) => renderBlock(child, `${key}-child-${i}`))}
            </ol>
          ) : null}
        </li>
      );

    case 'checkListItem': {
      const checked = (block.props?.checked as boolean) || false;
      return (
        <li key={key} className={classes.checkItem} data-checked={checked}>
          <span className={classes.checkbox}>{checked ? '☑' : '☐'}</span>
          <span className={checked ? classes.checkedText : undefined}>{content}</span>
        </li>
      );
    }

    case 'quote':
      return (
        <blockquote key={key} className={classes.quote}>
          {content}
        </blockquote>
      );

    case 'codeBlock': {
      const code = (block.props?.code as string) || '';
      const language = (block.props?.language as string) || '';
      return (
        <pre key={key} className={classes.codeBlock} data-language={language}>
          <code>{code}</code>
        </pre>
      );
    }

    case 'table':
      // Tables are complex, render simplified version
      return (
        <div key={key} className={classes.tablePlaceholder}>
          [Table]
        </div>
      );

    case 'image': {
      const url = (block.props?.url as string) || '';
      const caption = (block.props?.caption as string) || '';
      return (
        <figure key={key} className={classes.image}>
          {url && <img src={url} alt={caption} />}
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    }

    default:
      // Unknown block type - skip
      return null;
  }
}

/**
 * Group consecutive list items into proper list elements
 */
function groupBlocks(blocks: Block[]): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol' | 'checklist'; items: React.ReactNode[] } | null = null;

  blocks.forEach((block, index) => {
    const key = `block-${index}`;

    if (block.type === 'bulletListItem') {
      if (currentList?.type !== 'ul') {
        if (currentList) {
          result.push(createListElement(currentList, `list-${result.length}`));
        }
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(renderBlock(block, key));
    } else if (block.type === 'numberedListItem') {
      if (currentList?.type !== 'ol') {
        if (currentList) {
          result.push(createListElement(currentList, `list-${result.length}`));
        }
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(renderBlock(block, key));
    } else if (block.type === 'checkListItem') {
      if (currentList?.type !== 'checklist') {
        if (currentList) {
          result.push(createListElement(currentList, `list-${result.length}`));
        }
        currentList = { type: 'checklist', items: [] };
      }
      currentList.items.push(renderBlock(block, key));
    } else {
      // Non-list item - flush current list and add this block
      if (currentList) {
        result.push(createListElement(currentList, `list-${result.length}`));
        currentList = null;
      }
      const rendered = renderBlock(block, key);
      if (rendered) {
        result.push(rendered);
      }
    }
  });

  // Flush any remaining list
  if (currentList) {
    result.push(createListElement(currentList, `list-${result.length}`));
  }

  return result;
}

function createListElement(
  list: { type: 'ul' | 'ol' | 'checklist'; items: React.ReactNode[] },
  key: string
): React.ReactNode {
  if (list.type === 'ul') {
    return <ul key={key} className={classes.bulletList}>{list.items}</ul>;
  }
  if (list.type === 'ol') {
    return <ol key={key} className={classes.numberedList}>{list.items}</ol>;
  }
  return <ul key={key} className={classes.checkList}>{list.items}</ul>;
}

export function ContentPreview({
  content,
  maxHeight = 200,
  showEmptyPlaceholder = true,
}: ContentPreviewProps) {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    const blocks = deserializeBlockNoteDocument(content) as Block[] | undefined;
    if (!blocks || blocks.length === 0) return null;

    return groupBlocks(blocks);
  }, [content]);

  if (!renderedContent || renderedContent.length === 0) {
    if (showEmptyPlaceholder) {
      return (
        <Text size="sm" c="dimmed" fs="italic">
          No content
        </Text>
      );
    }
    return null;
  }

  return (
    <ScrollArea.Autosize mah={maxHeight} type="auto">
      <Box className={classes.contentPreview}>
        {renderedContent}
      </Box>
    </ScrollArea.Autosize>
  );
}
