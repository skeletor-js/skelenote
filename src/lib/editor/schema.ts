/**
 * BlockNote editor schema configuration
 * Includes custom mention inline content for object references
 */

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from '@blocknote/core';
import { Mention } from '@/components/editor/MentionChip';

/**
 * Custom schema with mention support
 * Includes all default blocks plus custom mention inline content
 */
export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: Mention,
  },
});

export type EditorSchema = typeof editorSchema;
