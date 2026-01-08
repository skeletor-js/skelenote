/**
 * HTML export
 *
 * Converts BlockNote content to standalone HTML files
 * with embedded CSS and optional base64 images.
 * No external dependencies required.
 */

import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import JSZip from 'jszip';
import type { SkelenoteObject, TypeDefinition, TypeRegistry } from '../types';
import type { BlockNoteBlock, BlockNoteInlineContent } from './types';
import { getThemeColors, type PDFTheme, type PDFColors } from './pdf-theme';
import { imageUrlToBase64 } from './image-utils';

/**
 * Progress callback for bulk export
 */
export interface BulkExportProgress {
  current: number;
  total: number;
  currentObject?: string;
  phase: 'preparing' | 'exporting' | 'compressing' | 'complete';
}

/**
 * HTML export options
 */
export interface HTMLExportOptions {
  /** Theme for styling (light or dark) */
  theme: PDFTheme;
  /** Include the object title at the top */
  includeTitle: boolean;
  /** Embed images as base64 data URIs */
  embedImages: boolean;
}

/**
 * Default HTML export options
 */
export const DEFAULT_HTML_OPTIONS: HTMLExportOptions = {
  theme: 'light',
  includeTitle: true,
  embedImages: true,
};

/**
 * HTML conversion result
 */
export interface HTMLConversionResult {
  /** The converted HTML string */
  html: string;
  /** Object IDs mentioned in content */
  mentionedObjectIds: string[];
  /** Image URLs found (for processing) */
  imageUrls: string[];
}

/**
 * Context for conversion
 */
interface ConversionContext {
  resolveObjectName: (objectId: string) => string | undefined;
  mentionedObjectIds: Set<string>;
  imageUrls: Set<string>;
  colors: PDFColors;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Apply inline styles and convert to HTML
 */
function applyStyles(
  text: string,
  styles?: Record<string, boolean | string>
): string {
  if (!styles || !text) return escapeHtml(text);

  let result = escapeHtml(text);

  if (styles.code) {
    result = `<code>${result}</code>`;
  }
  if (styles.bold) {
    result = `<strong>${result}</strong>`;
  }
  if (styles.italic) {
    result = `<em>${result}</em>`;
  }
  if (styles.strike) {
    result = `<del>${result}</del>`;
  }
  if (styles.underline) {
    result = `<u>${result}</u>`;
  }

  return result;
}

/**
 * Convert inline content to HTML
 */
function convertInlineContent(
  inline: BlockNoteInlineContent,
  context: ConversionContext
): string {
  switch (inline.type) {
    case 'text':
      return applyStyles(inline.text || '', inline.styles);

    case 'link': {
      const linkText =
        inline.content?.map((c) => convertInlineContent(c, context)).join('') ||
        escapeHtml(inline.text || '');
      const url = inline.props?.href || inline.props?.url || '';
      return `<a href="${escapeHtml(String(url))}">${linkText}</a>`;
    }

    case 'mention': {
      const objectId = inline.props?.objectId as string;
      const objectName = inline.props?.objectName as string;

      if (objectId) {
        context.mentionedObjectIds.add(objectId);
        const resolvedName =
          context.resolveObjectName(objectId) || objectName || 'Unknown';
        return `<span class="mention">@${escapeHtml(resolvedName)}</span>`;
      }
      return `<span class="mention">@${escapeHtml(objectName || 'Unknown')}</span>`;
    }

    default:
      if (inline.text) return escapeHtml(inline.text);
      if (inline.content) {
        return inline.content
          .map((c) => convertInlineContent(c, context))
          .join('');
      }
      return '';
  }
}

/**
 * Convert an array of inline content to HTML string
 */
function convertInlineArray(
  content: BlockNoteInlineContent[] | undefined,
  context: ConversionContext
): string {
  if (!content || !Array.isArray(content)) return '';
  return content.map((c) => convertInlineContent(c, context)).join('');
}

/**
 * Convert a paragraph block
 */
function convertParagraph(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  return content ? `<p>${content}</p>` : '<p></p>';
}

/**
 * Convert a heading block
 */
function convertHeading(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const level = Math.min((block.props?.level as number) || 1, 6);
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  return `<h${level}>${content}</h${level}>`;
}

/**
 * Convert a bullet list item (with children)
 */
function convertBulletListItem(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );

  let childrenHtml = '';
  if (block.children && block.children.length > 0) {
    const childItems = block.children
      .map((child) => convertBlock(child, context))
      .join('');
    childrenHtml = `<ul>${childItems}</ul>`;
  }

  return `<li>${content}${childrenHtml}</li>`;
}

/**
 * Convert a numbered list item (with children)
 */
function convertNumberedListItem(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );

  let childrenHtml = '';
  if (block.children && block.children.length > 0) {
    const childItems = block.children
      .map((child) => convertBlock(child, context))
      .join('');
    childrenHtml = `<ol>${childItems}</ol>`;
  }

  return `<li>${content}${childrenHtml}</li>`;
}

/**
 * Convert a checklist item
 */
function convertCheckListItem(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const checked = block.props?.checked;
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  const checkedAttr = checked ? 'checked' : '';
  const checkedClass = checked ? 'checked' : '';

  let childrenHtml = '';
  if (block.children && block.children.length > 0) {
    const childItems = block.children
      .map((child) => convertBlock(child, context))
      .join('');
    childrenHtml = `<ul class="checklist">${childItems}</ul>`;
  }

  return `<li class="checklist-item ${checkedClass}"><input type="checkbox" ${checkedAttr} disabled /><span>${content}</span>${childrenHtml}</li>`;
}

/**
 * Convert a code block
 */
function convertCodeBlock(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const language = (block.props?.language as string) || '';
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  const langClass = language ? ` class="language-${escapeHtml(language)}"` : '';
  return `<pre><code${langClass}>${content}</code></pre>`;
}

/**
 * Convert a blockquote
 */
function convertBlockquote(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );

  let childrenHtml = '';
  if (block.children && block.children.length > 0) {
    childrenHtml = block.children
      .map((child) => convertBlock(child, context))
      .join('');
  }

  return `<blockquote><p>${content}</p>${childrenHtml}</blockquote>`;
}

/**
 * Convert a table
 */
function convertTable(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const content = block.content as BlockNoteBlock[];
  if (!content || content.length === 0) return '';

  const rows: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const row = content[i];
    if (row.type === 'tableRow' && row.content) {
      const cells: string[] = [];
      const cellTag = i === 0 ? 'th' : 'td';

      for (const cell of row.content as BlockNoteBlock[]) {
        if (cell.type === 'tableCell' && cell.content) {
          const cellContent = convertInlineArray(
            cell.content as BlockNoteInlineContent[],
            context
          );
          cells.push(`<${cellTag}>${cellContent}</${cellTag}>`);
        }
      }
      rows.push(`<tr>${cells.join('')}</tr>`);
    }
  }

  if (rows.length === 0) return '';

  const thead = rows.length > 0 ? `<thead>${rows[0]}</thead>` : '';
  const tbody =
    rows.length > 1 ? `<tbody>${rows.slice(1).join('')}</tbody>` : '';

  return `<table>${thead}${tbody}</table>`;
}

/**
 * Convert an image block
 */
function convertImage(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const url = (block.props?.url as string) || '';
  const alt =
    (block.props?.caption as string) || (block.props?.name as string) || '';
  const width = block.props?.width as number | undefined;

  if (url) {
    context.imageUrls.add(url);
  }

  const widthAttr = width ? ` width="${width}"` : '';
  return `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${widthAttr} />${alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : ''}</figure>`;
}

/**
 * Convert a single block to HTML
 */
function convertBlock(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  switch (block.type) {
    case 'paragraph':
      return convertParagraph(block, context);

    case 'heading':
      return convertHeading(block, context);

    case 'bulletListItem':
      return convertBulletListItem(block, context);

    case 'numberedListItem':
      return convertNumberedListItem(block, context);

    case 'checkListItem':
      return convertCheckListItem(block, context);

    case 'codeBlock':
      return convertCodeBlock(block, context);

    case 'blockquote':
      return convertBlockquote(block, context);

    case 'table':
      return convertTable(block, context);

    case 'image':
      return convertImage(block, context);

    default:
      if (block.content && Array.isArray(block.content)) {
        const content = convertInlineArray(
          block.content as BlockNoteInlineContent[],
          context
        );
        return content ? `<p>${content}</p>` : '';
      }
      return '';
  }
}

/**
 * Group consecutive list items into proper list elements
 */
function wrapListItems(html: string): string {
  // Wrap consecutive <li> items that are bullet list items
  let result = html;

  // Wrap bullet list items
  result = result.replace(
    /(<li>(?:(?!<li class="|<li>).)*<\/li>\s*)+/g,
    (match) => {
      if (!match.includes('class="checklist-item"')) {
        return `<ul>${match}</ul>`;
      }
      return match;
    }
  );

  // Wrap checklist items
  result = result.replace(
    /(<li class="checklist-item[^"]*">(?:(?!<li class="checklist-item).)*<\/li>\s*)+/g,
    (match) => `<ul class="checklist">${match}</ul>`
  );

  return result;
}

/**
 * Generate CSS styles for the theme
 */
function generateStylesheet(colors: PDFColors): string {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 16px;
      line-height: 1.65;
      color: ${colors.text};
      background-color: ${colors.background};
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    article {
      width: 100%;
    }

    h1, h2, h3, h4, h5, h6 {
      margin: 1.5em 0 0.5em;
      font-weight: 600;
      line-height: 1.25;
    }

    h1 { font-size: 2em; margin-top: 0; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }
    h5 { font-size: 1em; }
    h6 { font-size: 0.9em; color: ${colors.textSecondary}; }

    p {
      margin: 1em 0;
    }

    a {
      color: ${colors.accent};
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    strong { font-weight: 600; }
    em { font-style: italic; }
    del { text-decoration: line-through; }
    u { text-decoration: underline; }

    code {
      font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', monospace;
      font-size: 0.9em;
      background-color: ${colors.codeBg};
      padding: 0.2em 0.4em;
      border-radius: 3px;
    }

    pre {
      background-color: ${colors.codeBg};
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1em 0;
    }

    pre code {
      background: none;
      padding: 0;
      font-size: 0.875em;
      line-height: 1.5;
    }

    blockquote {
      border-left: 4px solid ${colors.blockquoteBorder};
      padding-left: 1em;
      margin: 1em 0;
      color: ${colors.textSecondary};
    }

    blockquote p {
      margin: 0.5em 0;
    }

    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }

    li {
      margin: 0.25em 0;
    }

    ul.checklist {
      list-style: none;
      padding-left: 0;
    }

    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5em;
      margin: 0.25em 0;
    }

    .checklist-item input[type="checkbox"] {
      margin-top: 0.3em;
      accent-color: ${colors.checkboxChecked};
    }

    .checklist-item.checked span {
      text-decoration: line-through;
      color: ${colors.textSecondary};
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }

    th, td {
      border: 1px solid ${colors.border};
      padding: 0.5em 1em;
      text-align: left;
    }

    th {
      background-color: ${colors.codeBg};
      font-weight: 600;
    }

    figure {
      margin: 1em 0;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }

    figcaption {
      font-size: 0.875em;
      color: ${colors.textSecondary};
      margin-top: 0.5em;
      text-align: center;
    }

    .mention {
      color: ${colors.accent};
      font-weight: 500;
    }
  `;
}

/**
 * Convert BlockNote JSON content to HTML
 */
export function convertBlockNoteToHTML(
  contentJson: string | BlockNoteBlock[],
  resolveObjectName: (objectId: string) => string | undefined,
  options: HTMLExportOptions = DEFAULT_HTML_OPTIONS
): HTMLConversionResult {
  const colors = getThemeColors(options.theme);
  const context: ConversionContext = {
    resolveObjectName,
    mentionedObjectIds: new Set(),
    imageUrls: new Set(),
    colors,
  };

  let blocks: BlockNoteBlock[];
  try {
    blocks =
      typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
  } catch {
    return { html: '', mentionedObjectIds: [], imageUrls: [] };
  }

  if (!Array.isArray(blocks)) {
    return { html: '', mentionedObjectIds: [], imageUrls: [] };
  }

  const htmlParts: string[] = [];
  for (const block of blocks) {
    const html = convertBlock(block, context);
    if (html) {
      htmlParts.push(html);
    }
  }

  let html = htmlParts.join('\n');
  html = wrapListItems(html);

  return {
    html,
    mentionedObjectIds: Array.from(context.mentionedObjectIds),
    imageUrls: Array.from(context.imageUrls),
  };
}

/**
 * Process images in HTML, converting URLs to base64
 */
async function processImagesInHTML(
  html: string,
  imageUrls: string[]
): Promise<string> {
  let result = html;

  for (const url of imageUrls) {
    if (!url || url.startsWith('data:')) continue;

    try {
      const base64 = await imageUrlToBase64(url);
      if (base64) {
        result = result.replace(
          new RegExp(
            escapeHtml(url).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'g'
          ),
          base64
        );
      }
    } catch {
      // Keep original URL if conversion fails
    }
  }

  return result;
}

/**
 * Sanitize a title for use as a filename
 */
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
    .toLowerCase();
}

/**
 * Get the title from an object
 */
function getObjectTitle(object: SkelenoteObject): string {
  const title = object.properties.title ?? object.properties.name;
  return title ? String(title) : 'Untitled';
}

/**
 * Generate complete HTML document for an object
 */
export async function generateHTMLContent(
  object: SkelenoteObject,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: HTMLExportOptions = DEFAULT_HTML_OPTIONS
): Promise<string> {
  const colors = getThemeColors(options.theme);
  const title = getObjectTitle(object);

  const { html: bodyContent, imageUrls } = convertBlockNoteToHTML(
    content,
    resolveObjectName,
    options
  );

  let processedContent = bodyContent;
  if (options.embedImages && imageUrls.length > 0) {
    processedContent = await processImagesInHTML(bodyContent, imageUrls);
  }

  const titleHtml = options.includeTitle ? `<h1>${escapeHtml(title)}</h1>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${generateStylesheet(colors)}</style>
</head>
<body class="skelenote-export theme-${options.theme}">
  <article>
    ${titleHtml}
    ${processedContent}
  </article>
</body>
</html>`;
}

/**
 * Export a single object to an HTML file
 */
export async function exportObjectToHTML(
  object: SkelenoteObject,
  _typeDef: TypeDefinition,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: HTMLExportOptions = DEFAULT_HTML_OPTIONS
): Promise<string | null> {
  const html = await generateHTMLContent(
    object,
    content,
    resolveObjectName,
    options
  );

  const title = getObjectTitle(object);
  const defaultFilename = `${sanitizeFilename(title)}.html`;

  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: 'HTML', extensions: ['html'] }],
  });

  if (!filePath) return null;

  const finalPath = filePath.endsWith('.html') ? filePath : `${filePath}.html`;
  await writeTextFile(finalPath, html);

  return finalPath;
}

/**
 * Options for bulk HTML export
 */
export interface HTMLBulkExportOptions extends Partial<HTMLExportOptions> {
  typeIds?: string[];
  organizeByType?: boolean;
}

/**
 * Export all objects to a ZIP containing HTML files
 */
export async function exportAllToHTMLZip(
  objects: SkelenoteObject[],
  typeRegistry: TypeRegistry,
  getContent: (objectId: string) => string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: HTMLBulkExportOptions = {},
  onProgress?: (progress: BulkExportProgress) => void
): Promise<string | null> {
  const mergedOptions: HTMLExportOptions & HTMLBulkExportOptions = {
    ...DEFAULT_HTML_OPTIONS,
    organizeByType: true,
    ...options,
  };

  let filteredObjects = objects;
  if (mergedOptions.typeIds && mergedOptions.typeIds.length > 0) {
    filteredObjects = objects.filter((obj) =>
      mergedOptions.typeIds!.includes(obj.typeId)
    );
  }

  filteredObjects = filteredObjects.filter((obj) =>
    typeRegistry.get(obj.typeId)
  );

  if (filteredObjects.length === 0) {
    throw new Error('No objects to export');
  }

  const total = filteredObjects.length;
  onProgress?.({ current: 0, total, phase: 'preparing' });

  const zip = new JSZip();
  const usedFilenames = new Map<string, number>();

  for (let i = 0; i < filteredObjects.length; i++) {
    const obj = filteredObjects[i];
    const typeDef = typeRegistry.get(obj.typeId);
    if (!typeDef) continue;

    const title = getObjectTitle(obj);
    onProgress?.({
      current: i,
      total,
      currentObject: title,
      phase: 'exporting',
    });

    const content = getContent(obj.id);
    const html = await generateHTMLContent(obj, content, resolveObjectName, {
      theme: mergedOptions.theme ?? 'light',
      includeTitle: mergedOptions.includeTitle ?? true,
      embedImages: mergedOptions.embedImages ?? true,
    });

    const baseFilename = sanitizeFilename(title) || 'untitled';
    const count = usedFilenames.get(baseFilename) || 0;
    usedFilenames.set(baseFilename, count + 1);

    const filename =
      count > 0 ? `${baseFilename}-${count}.html` : `${baseFilename}.html`;

    let filePath = filename;
    if (mergedOptions.organizeByType) {
      const isDaily = obj.typeId === 'note' && obj.properties.isDailyNote;
      const folderName = isDaily
        ? 'daily-notes'
        : typeDef.name.toLowerCase() + 's';
      filePath = `${folderName}/${filename}`;
    }

    zip.file(filePath, html);
  }

  onProgress?.({ current: total, total, phase: 'compressing' });

  const zipBlob = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `skelenote-html-${date}.zip`;

  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });

  if (!filePath) return null;

  const finalPath = filePath.endsWith('.zip') ? filePath : `${filePath}.zip`;
  await writeFile(finalPath, zipBlob);

  onProgress?.({ current: total, total, phase: 'complete' });

  return finalPath;
}
