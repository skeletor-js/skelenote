/**
 * BlockNote editor schema configuration
 * Using default BlockNote blocks for now, can be extended for custom blocks later
 */

import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';

/**
 * Default schema using BlockNote's built-in blocks
 * Includes: paragraph, heading, bulletListItem, numberedListItem,
 * checkListItem, table, file, image, video, audio, codeBlock
 */
export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
  },
});

export type EditorSchema = typeof editorSchema;
