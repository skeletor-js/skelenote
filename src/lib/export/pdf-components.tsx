/**
 * React-PDF Components for PDF Export
 *
 * Components that render BlockNote content as react-pdf elements.
 */

import { Text, View, Image, Link, StyleSheet } from '@react-pdf/renderer';

// Using built-in PDF fonts (Helvetica, Courier) for reliable rendering
// These fonts are embedded in PDF viewers and don't require loading
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Style = Record<string, any>;
import type {
  BlockNoteBlock,
  BlockNoteInlineContent,
  FrontmatterProperty,
} from './types';
import {
  type PDFColors,
  type PDFTheme,
  getThemeColors,
  typography,
  spacing,
} from './pdf-theme';

/**
 * Context for rendering - passed to all components
 */
interface RenderContext {
  colors: PDFColors;
  theme: PDFTheme;
  resolveObjectName: (objectId: string) => string | undefined;
}

/**
 * Create base styles for a theme
 */
function createStyles(colors: PDFColors) {
  return StyleSheet.create({
    // Text styles
    paragraph: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.base,
      lineHeight: typography.lineHeight.normal,
      color: colors.text,
      marginBottom: spacing.md,
    },
    bold: {
      fontWeight: typography.fontWeight.bold,
    },
    italic: {
      fontStyle: 'italic',
    },
    underline: {
      textDecoration: 'underline',
    },
    strikethrough: {
      textDecoration: 'line-through',
    },
    code: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.sm,
      backgroundColor: colors.codeBg,
      padding: 2,
    },
    link: {
      color: colors.accent,
      textDecoration: 'underline',
    },
    mention: {
      color: colors.accent,
      fontWeight: typography.fontWeight.bold,
    },

    // Headings
    h1: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.h1,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.lg,
      marginTop: spacing.xl,
    },
    h2: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.h2,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
      marginTop: spacing.lg,
    },
    h3: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.h3,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
      marginTop: spacing.lg,
    },
    h4: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.h4,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    h5: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.h5,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    h6: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.h6,
      fontWeight: typography.fontWeight.bold,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },

    // Lists
    listItem: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    listBullet: {
      width: 16,
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
    },
    listContent: {
      flex: 1,
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.base,
      lineHeight: typography.lineHeight.normal,
      color: colors.text,
    },

    // Checkbox
    checkbox: {
      width: 10,
      height: 10,
      borderWidth: 1,
      borderRadius: 2,
      marginRight: spacing.sm,
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.checkboxChecked,
      borderColor: colors.checkboxChecked,
    },
    checkboxUnchecked: {
      backgroundColor: 'transparent',
      borderColor: colors.checkboxUnchecked,
    },
    checkmark: {
      fontSize: 7,
      color: '#FFFFFF',
      textAlign: 'center',
    },

    // Code block
    codeBlock: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.sm,
      backgroundColor: colors.codeBg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 4,
    },
    codeBlockText: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.sm,
      color: colors.text,
      lineHeight: typography.lineHeight.relaxed,
    },

    // Blockquote
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.blockquoteBorder,
      paddingLeft: spacing.md,
      marginLeft: spacing.sm,
      marginBottom: spacing.md,
    },
    blockquoteText: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.base,
      fontStyle: 'italic',
      color: colors.textSecondary,
      lineHeight: typography.lineHeight.normal,
    },

    // Table
    table: {
      marginBottom: spacing.md,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
      backgroundColor: colors.codeBg,
    },
    tableCell: {
      flex: 1,
      padding: spacing.sm,
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.sm,
      color: colors.text,
    },
    tableHeaderCell: {
      flex: 1,
      padding: spacing.sm,
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
    },

    // Image
    imageContainer: {
      marginBottom: spacing.md,
    },
    image: {
      maxWidth: '100%',
    },
    imageCaption: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },

    // Title
    title: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.h1,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.lg,
    },
  });
}

/**
 * Render inline content with styles applied
 */
function renderInlineContent(
  content: BlockNoteInlineContent[] | undefined,
  context: RenderContext,
  styles: ReturnType<typeof createStyles>
): React.ReactNode[] {
  if (!content || !Array.isArray(content)) return [];

  return content.map((inline, index) => {
    const key = `inline-${index}`;

    switch (inline.type) {
      case 'text': {
        const textStyles: Style[] = [];

        if (inline.styles?.bold) {
          textStyles.push(styles.bold);
        }
        if (inline.styles?.italic) {
          textStyles.push(styles.italic);
        }
        if (inline.styles?.underline) {
          textStyles.push(styles.underline);
        }
        if (inline.styles?.strike) {
          textStyles.push(styles.strikethrough);
        }
        if (inline.styles?.code) {
          textStyles.push(styles.code);
        }

        return (
          <Text
            key={key}
            style={textStyles.length > 0 ? textStyles : undefined}
          >
            {inline.text || ''}
          </Text>
        );
      }

      case 'link': {
        const linkText =
          inline.content
            ?.map((c) => (c.type === 'text' ? c.text : ''))
            .join('') ||
          inline.text ||
          '';
        const href = (inline.props?.href || inline.props?.url || '') as string;

        return (
          <Link key={key} src={href} style={styles.link}>
            {linkText}
          </Link>
        );
      }

      case 'mention': {
        const objectId = inline.props?.objectId as string;
        const objectName = inline.props?.objectName as string;
        const resolvedName =
          context.resolveObjectName(objectId) || objectName || 'Unknown';

        return (
          <Text key={key} style={styles.mention}>
            @{resolvedName}
          </Text>
        );
      }

      default:
        // For unknown inline types, try to extract text
        if (inline.text) {
          return <Text key={key}>{inline.text}</Text>;
        }
        if (inline.content) {
          return (
            <Text key={key}>
              {renderInlineContent(inline.content, context, styles)}
            </Text>
          );
        }
        return null;
    }
  });
}

/**
 * Render a heading block
 */
function PDFHeading({
  block,
  context,
  styles,
}: {
  block: BlockNoteBlock;
  context: RenderContext;
  styles: ReturnType<typeof createStyles>;
}) {
  const level = (block.props?.level as number) || 1;
  const headingStyles: Record<number, Style> = {
    1: styles.h1,
    2: styles.h2,
    3: styles.h3,
    4: styles.h4,
    5: styles.h5,
    6: styles.h6,
  };

  return (
    <Text style={headingStyles[Math.min(level, 6)] || styles.h1}>
      {renderInlineContent(
        block.content as BlockNoteInlineContent[],
        context,
        styles
      )}
    </Text>
  );
}

/**
 * Render a paragraph block
 */
function PDFParagraph({
  block,
  context,
  styles,
}: {
  block: BlockNoteBlock;
  context: RenderContext;
  styles: ReturnType<typeof createStyles>;
}) {
  const content = renderInlineContent(
    block.content as BlockNoteInlineContent[],
    context,
    styles
  );

  // Don't render empty paragraphs
  if (!content || content.length === 0) {
    return <View style={{ height: spacing.md }} />;
  }

  return <Text style={styles.paragraph}>{content}</Text>;
}

/**
 * Render a bullet list item
 */
function PDFBulletListItem({
  block,
  context,
  styles,
  depth = 0,
}: {
  block: BlockNoteBlock;
  context: RenderContext;
  styles: ReturnType<typeof createStyles>;
  depth?: number;
}) {
  const bullets = ['•', '◦', '▪', '▫'];
  const bullet = bullets[depth % bullets.length];

  return (
    <View style={{ marginLeft: depth * 16 }}>
      <View style={styles.listItem}>
        <Text style={styles.listBullet}>{bullet}</Text>
        <Text style={styles.listContent}>
          {renderInlineContent(
            block.content as BlockNoteInlineContent[],
            context,
            styles
          )}
        </Text>
      </View>
      {block.children?.map((child, index) => (
        <PDFBlock
          key={`child-${index}`}
          block={child}
          context={context}
          styles={styles}
          depth={depth + 1}
        />
      ))}
    </View>
  );
}

/**
 * Render a numbered list item
 */
function PDFNumberedListItem({
  block,
  context,
  styles,
  depth = 0,
  index = 1,
}: {
  block: BlockNoteBlock;
  context: RenderContext;
  styles: ReturnType<typeof createStyles>;
  depth?: number;
  index?: number;
}) {
  return (
    <View style={{ marginLeft: depth * 16 }}>
      <View style={styles.listItem}>
        <Text style={styles.listBullet}>{index}.</Text>
        <Text style={styles.listContent}>
          {renderInlineContent(
            block.content as BlockNoteInlineContent[],
            context,
            styles
          )}
        </Text>
      </View>
      {block.children?.map((child, childIndex) => (
        <PDFBlock
          key={`child-${childIndex}`}
          block={child}
          context={context}
          styles={styles}
          depth={depth + 1}
          listIndex={childIndex + 1}
        />
      ))}
    </View>
  );
}

/**
 * Render a checklist item
 */
function PDFCheckListItem({
  block,
  context,
  styles,
  depth = 0,
}: {
  block: BlockNoteBlock;
  context: RenderContext;
  styles: ReturnType<typeof createStyles>;
  depth?: number;
}) {
  const checked = block.props?.checked === true;

  return (
    <View style={{ marginLeft: depth * 16 }}>
      <View style={styles.listItem}>
        <View
          style={[
            styles.checkbox,
            checked ? styles.checkboxChecked : styles.checkboxUnchecked,
          ]}
        >
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text
          style={[
            styles.listContent,
            ...(checked ? [styles.strikethrough] : []),
          ]}
        >
          {renderInlineContent(
            block.content as BlockNoteInlineContent[],
            context,
            styles
          )}
        </Text>
      </View>
      {block.children?.map((child, index) => (
        <PDFBlock
          key={`child-${index}`}
          block={child}
          context={context}
          styles={styles}
          depth={depth + 1}
        />
      ))}
    </View>
  );
}

/**
 * Render a code block
 */
function PDFCodeBlock({
  block,
  styles,
}: {
  block: BlockNoteBlock;
  styles: ReturnType<typeof createStyles>;
}) {
  // Extract text content from code block
  const content = block.content as BlockNoteInlineContent[];
  const codeText =
    content?.map((c) => (c.type === 'text' ? c.text : '')).join('') || '';

  return (
    <View style={styles.codeBlock}>
      <Text style={styles.codeBlockText}>{codeText}</Text>
    </View>
  );
}

/**
 * Render a blockquote
 */
function PDFBlockquote({
  block,
  context,
  styles,
}: {
  block: BlockNoteBlock;
  context: RenderContext;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.blockquote}>
      <Text style={styles.blockquoteText}>
        {renderInlineContent(
          block.content as BlockNoteInlineContent[],
          context,
          styles
        )}
      </Text>
      {block.children?.map((child, index) => (
        <PDFBlock
          key={`child-${index}`}
          block={child}
          context={context}
          styles={styles}
        />
      ))}
    </View>
  );
}

/**
 * Render a table
 *
 * BlockNote v0.45.0 table structure:
 * {
 *   type: "table",
 *   content: {
 *     type: "tableContent",
 *     columnWidths: [...],
 *     rows: [{ cells: [{ type: "tableCell", content: [...] }] }]
 *   }
 * }
 */
function PDFTable({
  block,
  context,
  styles,
}: {
  block: BlockNoteBlock;
  context: RenderContext;
  styles: ReturnType<typeof createStyles>;
}) {
  // BlockNote tables have content as an object with a rows property
  const tableContent = block.content as {
    rows?: Array<{ cells?: BlockNoteBlock[] }>;
  };
  const rows = tableContent?.rows;
  if (!rows || rows.length === 0) return null;

  return (
    <View style={styles.table}>
      {rows.map((row, rowIndex) => {
        const cells = row.cells || [];
        const isHeader = rowIndex === 0;

        return (
          <View
            key={`row-${rowIndex}`}
            style={isHeader ? styles.tableHeaderRow : styles.tableRow}
          >
            {cells.map((cell, cellIndex) => (
              <Text
                key={`cell-${cellIndex}`}
                style={isHeader ? styles.tableHeaderCell : styles.tableCell}
              >
                {renderInlineContent(
                  cell.content as BlockNoteInlineContent[],
                  context,
                  styles
                )}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Render an image
 */
function PDFImage({
  block,
  styles,
}: {
  block: BlockNoteBlock;
  styles: ReturnType<typeof createStyles>;
}) {
  const url = block.props?.url as string;
  const caption =
    (block.props?.caption as string) || (block.props?.name as string);

  if (!url) return null;

  return (
    <View style={styles.imageContainer}>
      <Image src={url} style={styles.image} />
      {caption && <Text style={styles.imageCaption}>{caption}</Text>}
    </View>
  );
}

/**
 * Render a single block
 */
function PDFBlock({
  block,
  context,
  styles,
  depth = 0,
  listIndex = 1,
}: {
  block: BlockNoteBlock;
  context: RenderContext;
  styles: ReturnType<typeof createStyles>;
  depth?: number;
  listIndex?: number;
}) {
  switch (block.type) {
    case 'paragraph':
      return <PDFParagraph block={block} context={context} styles={styles} />;

    case 'heading':
      return <PDFHeading block={block} context={context} styles={styles} />;

    case 'bulletListItem':
      return (
        <PDFBulletListItem
          block={block}
          context={context}
          styles={styles}
          depth={depth}
        />
      );

    case 'numberedListItem':
      return (
        <PDFNumberedListItem
          block={block}
          context={context}
          styles={styles}
          depth={depth}
          index={listIndex}
        />
      );

    case 'checkListItem':
      return (
        <PDFCheckListItem
          block={block}
          context={context}
          styles={styles}
          depth={depth}
        />
      );

    case 'codeBlock':
      return <PDFCodeBlock block={block} styles={styles} />;

    case 'blockquote':
      return <PDFBlockquote block={block} context={context} styles={styles} />;

    case 'table':
      return <PDFTable block={block} context={context} styles={styles} />;

    case 'image':
      return <PDFImage block={block} styles={styles} />;

    default:
      // For unknown block types, try to render content as paragraph
      if (block.content && Array.isArray(block.content)) {
        return (
          <Text style={styles.paragraph}>
            {renderInlineContent(
              block.content as BlockNoteInlineContent[],
              context,
              styles
            )}
          </Text>
        );
      }
      return null;
  }
}

/**
 * Props for PDFContent component
 */
export interface PDFContentProps {
  /** BlockNote blocks to render */
  blocks: BlockNoteBlock[];
  /** Theme to use */
  theme: PDFTheme;
  /** Function to resolve object IDs to names (for mentions) */
  resolveObjectName: (objectId: string) => string | undefined;
  /** Optional title to display at the top */
  title?: string;
  /** Optional metadata to display below the title */
  metadata?: FrontmatterProperty[];
}

/**
 * Render metadata section for PDF
 */
function PDFMetadata({
  metadata,
  styles,
  colors,
}: {
  metadata: FrontmatterProperty[];
  styles: ReturnType<typeof createStyles>;
  colors: PDFColors;
}) {
  // Filter out title (already shown separately) and empty values
  const filteredMetadata = metadata.filter(
    (prop) => prop.key !== 'title' && prop.value !== null
  );

  if (filteredMetadata.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: colors.codeBg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderRadius: 4,
      }}
    >
      {filteredMetadata.map((prop, index) => (
        <View
          key={`meta-${index}`}
          style={{
            flexDirection: 'row',
            marginBottom: index < filteredMetadata.length - 1 ? spacing.xs : 0,
          }}
        >
          <Text
            style={{
              ...styles.paragraph,
              fontWeight: typography.fontWeight.bold,
              marginBottom: 0,
              width: 100,
              color: colors.textSecondary,
            }}
          >
            {prop.key}:
          </Text>
          <Text
            style={{
              ...styles.paragraph,
              marginBottom: 0,
              flex: 1,
            }}
          >
            {Array.isArray(prop.value)
              ? prop.value.join(', ')
              : String(prop.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Main component that renders BlockNote content as PDF elements
 */
export function PDFContent({
  blocks,
  theme,
  resolveObjectName,
  title,
  metadata,
}: PDFContentProps) {
  const colors = getThemeColors(theme);
  const styles = createStyles(colors);
  const context: RenderContext = { colors, theme, resolveObjectName };

  // Track numbered list indices
  let numberedListIndex = 0;

  return (
    <View>
      {title && <Text style={styles.title}>{title}</Text>}
      {metadata && metadata.length > 0 && (
        <PDFMetadata metadata={metadata} styles={styles} colors={colors} />
      )}
      {blocks.map((block, index) => {
        // Track numbered list indices
        if (block.type === 'numberedListItem') {
          numberedListIndex++;
        } else {
          numberedListIndex = 0;
        }

        return (
          <PDFBlock
            key={`block-${index}`}
            block={block}
            context={context}
            styles={styles}
            listIndex={
              block.type === 'numberedListItem' ? numberedListIndex : 1
            }
          />
        );
      })}
    </View>
  );
}
