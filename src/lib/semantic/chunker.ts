/**
 * Text Chunking for Semantic Search
 *
 * Splits long content into overlapping chunks suitable for embedding models.
 * Preserves sentence boundaries when possible for better semantic coherence.
 */

import { TextChunk, ChunkingOptions, DEFAULT_CHUNKING_OPTIONS } from './types';

/**
 * Sentence boundary regex - matches common sentence endings.
 * Handles: periods, question marks, exclamation marks, followed by space or end.
 */
const SENTENCE_BOUNDARY = /[.!?]+\s+|\n\n+/g;

/**
 * Split text into sentences.
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let lastIndex = 0;

  // Find all sentence boundaries
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_BOUNDARY.exec(text)) !== null) {
    const sentence = text
      .slice(lastIndex, match.index + match[0].length)
      .trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text as final sentence
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    sentences.push(remaining);
  }

  return sentences;
}

/**
 * Chunk text while preserving sentence boundaries.
 */
function chunkWithSentences(
  text: string,
  maxChunkSize: number,
  overlap: number
): TextChunk[] {
  const sentences = splitIntoSentences(text);
  const chunks: TextChunk[] = [];

  if (sentences.length === 0) {
    return [];
  }

  let currentChunk: string[] = [];
  let currentLength = 0;
  let chunkStartIndex = 0;
  let currentIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceLength = sentence.length;

    // If single sentence exceeds max, we need to split it
    if (sentenceLength > maxChunkSize) {
      // Flush current chunk first
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ');
        chunks.push({
          text: chunkText,
          startIndex: chunkStartIndex,
          endIndex: chunkStartIndex + chunkText.length,
          chunkIndex: chunks.length,
        });
        currentChunk = [];
        currentLength = 0;
      }

      // Split long sentence by words
      const words = sentence.split(/\s+/);
      let wordChunk: string[] = [];
      let wordLength = 0;
      const sentenceStartInText = text.indexOf(sentence, currentIndex);

      for (const word of words) {
        if (
          wordLength + word.length + 1 > maxChunkSize &&
          wordChunk.length > 0
        ) {
          const chunkText = wordChunk.join(' ');
          chunks.push({
            text: chunkText,
            startIndex: sentenceStartInText,
            endIndex: sentenceStartInText + chunkText.length,
            chunkIndex: chunks.length,
          });
          // Keep some words for overlap
          const overlapWords = Math.ceil(overlap / 10); // Rough estimate
          wordChunk = wordChunk.slice(-overlapWords);
          wordLength = wordChunk.join(' ').length;
        }
        wordChunk.push(word);
        wordLength += word.length + 1;
      }

      if (wordChunk.length > 0) {
        currentChunk = wordChunk;
        currentLength = wordLength;
        chunkStartIndex = sentenceStartInText;
      }

      currentIndex = sentenceStartInText + sentence.length;
      continue;
    }

    // Check if adding this sentence exceeds max
    const newLength =
      currentLength + (currentLength > 0 ? 1 : 0) + sentenceLength;

    if (newLength > maxChunkSize && currentChunk.length > 0) {
      // Create chunk from current sentences
      const chunkText = currentChunk.join(' ');
      chunks.push({
        text: chunkText,
        startIndex: chunkStartIndex,
        endIndex: chunkStartIndex + chunkText.length,
        chunkIndex: chunks.length,
      });

      // Start new chunk with overlap (keep last few sentences)
      let overlapLength = 0;
      const overlapSentences: string[] = [];

      for (
        let j = currentChunk.length - 1;
        j >= 0 && overlapLength < overlap;
        j--
      ) {
        overlapSentences.unshift(currentChunk[j]);
        overlapLength += currentChunk[j].length + 1;
      }

      currentChunk = overlapSentences;
      currentLength = overlapLength;

      // Find start index for new chunk
      const overlapText = currentChunk.join(' ');
      const newStartIndex = text.indexOf(overlapText, chunkStartIndex);
      chunkStartIndex =
        newStartIndex >= 0
          ? newStartIndex
          : chunkStartIndex + chunkText.length - overlapLength;
    }

    // Add sentence to current chunk
    const sentenceStartInText = text.indexOf(sentence, currentIndex);
    if (currentChunk.length === 0) {
      chunkStartIndex = sentenceStartInText;
    }
    currentChunk.push(sentence);
    currentLength = currentChunk.join(' ').length;
    currentIndex = sentenceStartInText + sentence.length;
  }

  // Flush remaining chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ');
    chunks.push({
      text: chunkText,
      startIndex: chunkStartIndex,
      endIndex: chunkStartIndex + chunkText.length,
      chunkIndex: chunks.length,
    });
  }

  return chunks;
}

/**
 * Simple chunking by character count with overlap.
 */
function chunkBySize(
  text: string,
  maxChunkSize: number,
  overlap: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + maxChunkSize, text.length);
    const chunkText = text.slice(startIndex, endIndex).trim();

    if (chunkText) {
      chunks.push({
        text: chunkText,
        startIndex,
        endIndex,
        chunkIndex: chunks.length,
      });
    }

    // Move start by (maxChunkSize - overlap) to create overlap
    startIndex += maxChunkSize - overlap;

    // Prevent infinite loop
    if (startIndex >= text.length - overlap) {
      break;
    }
  }

  return chunks;
}

/**
 * Chunk text into overlapping segments for embedding.
 *
 * @param text - The text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  // Handle empty or very short text
  if (!text || text.trim().length === 0) {
    return [];
  }

  const trimmedText = text.trim();

  // If text is shorter than max chunk size, return as single chunk
  if (trimmedText.length <= opts.maxChunkSize) {
    return [
      {
        text: trimmedText,
        startIndex: 0,
        endIndex: trimmedText.length,
        chunkIndex: 0,
      },
    ];
  }

  // Choose chunking strategy
  if (opts.preserveSentences) {
    return chunkWithSentences(trimmedText, opts.maxChunkSize, opts.overlap);
  } else {
    return chunkBySize(trimmedText, opts.maxChunkSize, opts.overlap);
  }
}

/**
 * Estimate token count for text.
 * Uses rough approximation: ~4 characters per token for English.
 * This is a heuristic - actual token count depends on the tokenizer.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if text needs chunking based on estimated token count.
 */
export function needsChunking(text: string, maxTokens: number = 512): boolean {
  return estimateTokenCount(text) > maxTokens;
}
