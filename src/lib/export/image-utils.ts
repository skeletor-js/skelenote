/**
 * Image Utilities for PDF Export
 *
 * Handles converting image URLs to base64 data URIs
 * for embedding in self-contained PDFs.
 */

import { readFile } from '@tauri-apps/plugin-fs';
import type { BlockNoteBlock } from './types';

/**
 * Convert an image URL to a base64 data URI
 *
 * Handles:
 * - http(s) URLs: Fetches and converts
 * - file:// URLs: Reads via Tauri filesystem
 * - data: URIs: Passes through unchanged
 * - blob: URLs: Fetches and converts
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  // Already a data URI, pass through
  if (url.startsWith('data:')) {
    return url;
  }

  // File URL - read via Tauri
  if (url.startsWith('file://')) {
    try {
      // Remove file:// prefix
      const filePath = url.replace('file://', '');
      const data = await readFile(filePath);

      // Detect MIME type from extension
      const mimeType = getMimeTypeFromPath(filePath);
      const base64 = arrayBufferToBase64(data);

      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Failed to read file:', url, error);
      return url; // Return original URL as fallback
    }
  }

  // HTTP(S) or blob URL - fetch and convert
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:')
  ) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      return await blobToDataUri(blob);
    } catch (error) {
      console.error('Failed to fetch image:', url, error);
      return url; // Return original URL as fallback
    }
  }

  // Unknown URL type, return as-is
  return url;
}

/**
 * Convert a Blob to a data URI
 */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert Uint8Array to base64 string
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * Get MIME type from file path extension
 */
function getMimeTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
  };
  return mimeTypes[ext || ''] || 'image/png';
}

/**
 * Process all images in BlockNote content, converting URLs to base64
 *
 * Returns a new content array with image URLs replaced by data URIs.
 */
export async function processImagesInContent(
  blocks: BlockNoteBlock[]
): Promise<BlockNoteBlock[]> {
  const processedBlocks: BlockNoteBlock[] = [];

  for (const block of blocks) {
    const processedBlock = await processBlock(block);
    processedBlocks.push(processedBlock);
  }

  return processedBlocks;
}

/**
 * Process a single block, converting image URLs to base64
 */
async function processBlock(block: BlockNoteBlock): Promise<BlockNoteBlock> {
  // If this is an image block, convert the URL
  if (block.type === 'image' && block.props?.url) {
    const base64Url = await imageUrlToBase64(block.props.url as string);
    return {
      ...block,
      props: {
        ...block.props,
        url: base64Url,
      },
    };
  }

  // Process children recursively
  if (block.children && block.children.length > 0) {
    const processedChildren: BlockNoteBlock[] = [];
    for (const child of block.children) {
      processedChildren.push(await processBlock(child));
    }
    return {
      ...block,
      children: processedChildren,
    };
  }

  return block;
}

/**
 * Check if a URL is a valid image URL that can be processed
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  return (
    url.startsWith('data:') ||
    url.startsWith('file://') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:')
  );
}
