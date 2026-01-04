/**
 * DiffContentPreview - Renders BlockNote content with diff highlighting
 * Shows which blocks were added, removed, or modified between versions
 */

import { useMemo } from 'react';
import { Box, ScrollArea, Text } from '@mantine/core';
import { computeContentDiff, type BlockDiff } from '@/lib/diff';
import classes from './DiffContentPreview.module.css';

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

export interface DiffContentPreviewProps {
  /** Historical BlockNote content */
  historicalContent: string | null;
  /** Current BlockNote content */
  currentContent: string | null;
  /** Which side this represents */
  side: 'historical' | 'current';
  /** Maximum height before scrolling */
  maxHeight?: number;
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
 * Render a single block with diff styling
 */
function renderDiffBlock(blockDiff: BlockDiff, key: string): React.ReactNode {
  const { block, status } = blockDiff;
  const content = renderInlineContent(block.content as InlineContent[] | undefined, key);

  // Determine the CSS class based on diff status
  const statusClass = classes[`diff${status.charAt(0).toUpperCase() + status.slice(1)}`];

  // Wrap in diff container
  const renderWithDiff = (children: React.ReactNode) => (
    <div key={key} className={`${classes.diffBlock} ${statusClass || ''}`} data-status={status}>
      {children}
    </div>
  );

  switch (block.type) {
    case 'paragraph':
      return renderWithDiff(
        <p className={classes.paragraph}>{content || '\u00A0'}</p>
      );

    case 'heading': {
      const level = (block.props?.level as number) || 1;
      const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      return renderWithDiff(
        <HeadingTag className={classes.heading} data-level={level}>
          {content}
        </HeadingTag>
      );
    }

    case 'bulletListItem':
      return renderWithDiff(
        <div className={classes.listItem}>
          <span className={classes.bullet}>•</span>
          <span>{content}</span>
        </div>
      );

    case 'numberedListItem':
      return renderWithDiff(
        <div className={classes.listItem}>
          <span className={classes.number}>#</span>
          <span>{content}</span>
        </div>
      );

    case 'checkListItem': {
      const checked = (block.props?.checked as boolean) || false;
      return renderWithDiff(
        <div className={classes.listItem}>
          <span className={classes.checkbox}>{checked ? '☑' : '☐'}</span>
          <span className={checked ? classes.checkedText : undefined}>{content}</span>
        </div>
      );
    }

    case 'quote':
      return renderWithDiff(
        <blockquote className={classes.quote}>{content}</blockquote>
      );

    case 'codeBlock': {
      const code = (block.props?.code as string) || '';
      return renderWithDiff(
        <pre className={classes.codeBlock}>
          <code>{code}</code>
        </pre>
      );
    }

    default:
      // For unknown block types, try to render content if available
      if (content) {
        return renderWithDiff(
          <div className={classes.paragraph}>{content}</div>
        );
      }
      return null;
  }
}

export function DiffContentPreview({
  historicalContent,
  currentContent,
  side,
  maxHeight = 400,
}: DiffContentPreviewProps) {
  // Compute the diff
  const diff = useMemo(() => {
    return computeContentDiff(historicalContent, currentContent);
  }, [historicalContent, currentContent]);

  // Get the blocks for this side
  const blocksToRender = side === 'historical' ? diff.historical : diff.current;

  if (blocksToRender.length === 0) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        No content
      </Text>
    );
  }

  return (
    <ScrollArea.Autosize mah={maxHeight} type="auto">
      <Box className={classes.diffPreview}>
        {blocksToRender.map((blockDiff, index) =>
          renderDiffBlock(blockDiff, `block-${index}`)
        )}

        {/* Diff summary */}
        {(diff.summary.added > 0 || diff.summary.removed > 0 || diff.summary.modified > 0) && (
          <Box className={classes.diffSummary}>
            {diff.summary.added > 0 && (
              <Text component="span" size="xs" className={classes.summaryAdded}>
                +{diff.summary.added} added
              </Text>
            )}
            {diff.summary.removed > 0 && (
              <Text component="span" size="xs" className={classes.summaryRemoved}>
                -{diff.summary.removed} removed
              </Text>
            )}
            {diff.summary.modified > 0 && (
              <Text component="span" size="xs" className={classes.summaryModified}>
                ~{diff.summary.modified} modified
              </Text>
            )}
          </Box>
        )}
      </Box>
    </ScrollArea.Autosize>
  );
}
