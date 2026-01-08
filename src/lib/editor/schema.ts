/**
 * BlockNote editor schema configuration
 * Uses BlockNote's default blocks with custom mention inline content
 *
 * Note: Media blocks (image, video, audio, file) are temporarily disabled.
 * See GitHub issue for tracking reimplementation.
 */

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from '@blocknote/core';
import { Mention } from '@/components/editor/MentionChip';

// Exclude media blocks (temporarily disabled due to Tauri asset:// URL issues)
/* eslint-disable @typescript-eslint/no-unused-vars */
const {
  image: _,
  video: _v,
  audio: _a,
  file: _f,
  ...textBlockSpecs
} = defaultBlockSpecs;
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Custom schema with mention support
 *
 * Media blocks (image, video, audio, file) are temporarily disabled
 * due to implementation issues with Tauri asset:// URLs.
 */
export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...textBlockSpecs,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: Mention,
  },
});

export type EditorSchema = typeof editorSchema;
