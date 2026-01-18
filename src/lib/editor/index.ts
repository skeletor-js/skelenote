// Editor utilities
export { editorSchema, type EditorSchema } from './schema';
export {
  serializeBlockNoteDocument,
  deserializeBlockNoteDocument,
  removeMentionsFromContent,
} from './persistence';
export {
  copyMentionToClipboard,
  getPendingMention,
  clearPendingMention,
  isMentionClipboardText,
  type MentionClipboardData,
} from './mention-clipboard';

// Editor content adapter (abstracts BlockNote JSON structure)
export {
  blockNoteAdapter,
  extractMentionsFromContent,
  extractPlainTextFromContent,
  type EditorContentAdapter,
  type ContentMention,
} from './adapter';
