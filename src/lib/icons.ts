/**
 * Icon name constants and types for Skelenote
 * Uses Lucide React icons
 */

/**
 * All available icon names in the application
 * These map directly to Lucide icon component names (in kebab-case)
 */
export type IconName =
  // Object types
  | 'circle-check'    // Task
  | 'file-text'       // Note
  | 'folder'          // Project
  | 'layers'          // Area
  | 'link'            // Link
  | 'calendar'        // Meeting
  | 'tag'             // Tag
  | 'user'            // Person
  | 'clipboard'       // Template
  | 'file'            // Default/fallback

  // Navigation
  | 'inbox'           // Inbox
  | 'search'          // Search
  | 'history'         // Time Machine
  | 'calendar-days'   // Daily Notes
  | 'settings'        // Settings

  // Theme
  | 'moon'            // Dark mode
  | 'sun'             // Light mode

  // Actions
  | 'zap'             // Quick Capture
  | 'sparkles'        // AI/Similar
  | 'pin'             // Pin
  | 'pin-off'         // Unpin
  | 'archive'         // Archive
  | 'archive-restore' // Unarchive/Restore
  | 'trash-2'         // Delete
  | 'keyboard'        // Keyboard shortcuts
  | 'columns-2'       // Split view
  | 'plus'            // Add
  | 'x'               // Close
  | 'check'           // Checkmark
  | 'edit-2'          // Edit
  | 'arrow-right'     // Arrow right (open action)
  | 'sliders-horizontal' // Filters/settings
  | 'flag'            // Priority
  | 'shapes'          // Type/Category

  // Arrows & Chevrons
  | 'arrow-left'      // Back/Navigate back
  | 'chevron-left'    // Back/Collapse
  | 'chevron-right'   // Forward/Expand
  | 'chevrons-left'   // Skip back (double)
  | 'chevrons-right'  // Skip forward (double)
  | 'chevron-up'      // Up
  | 'chevron-down'    // Down

  // Status indicators
  | 'alert-triangle'  // Overdue/Warning
  | 'ban'             // Blocked
  | 'check-circle'    // Completed
  | 'circle'          // Pending
  | 'loader'          // Loading

  // Content
  | 'external-link'   // External link
  | 'copy'            // Copy
  | 'download'        // Download
  | 'upload'          // Upload
  | 'refresh-cw'      // Refresh/Sync
  | 'more-horizontal' // More options
  | 'grip-vertical'   // Drag handle
  | 'arrow-up-down'   // Sort
  | 'filter'          // Filter
  | 'list'            // List view
  | 'layout-grid'     // Grid view

  // History
  | 'rotate-ccw'      // Restore/Undo
  | 'git-compare'     // Compare versions

  // Security
  | 'key'             // Encryption key

  // Devices
  | 'monitor'         // Desktop/Web
  | 'laptop'          // Laptop (macOS/Windows/Linux)
  | 'smartphone'      // Mobile (iOS/Android)

  // Time
  | 'clock'           // Clock/Timer

  // Close/Cancel
  | 'x-circle'        // Close with circle

  // Misc
  | 'info'            // Info
  | 'lock'            // Locked/Encrypted
  | 'unlock'          // Unlocked
  | 'globe'           // Web/Public
  | 'shield'          // Security
  | 'wifi'            // Connected
  | 'wifi-off'        // Disconnected

  // Settings & About
  | 'palette'         // Appearance/Theme settings
  | 'book-open'       // Documentation
  | 'github'          // GitHub
  | 'message-circle'; // Feedback/Support

/**
 * Mapping from emoji to Lucide icon names
 * Used for migrating existing emoji-based icons
 */
export const EMOJI_TO_ICON: Record<string, IconName> = {
  // Object types
  '✓': 'circle-check',
  '📝': 'file-text',
  '📁': 'folder',
  '🔗': 'link',
  '📅': 'calendar',
  '🏷️': 'tag',
  '👤': 'user',
  '📋': 'clipboard',
  '📄': 'file',

  // Navigation
  '📥': 'inbox',
  '🔎': 'search',
  '🕰️': 'history',
  '📆': 'calendar-days',
  '⚙': 'settings',
  '⚙️': 'settings',

  // Theme
  '🌙': 'moon',
  '☀️': 'sun',

  // Actions
  '⚡': 'zap',
  '✨': 'sparkles',
  '📌': 'pin',
  '🗑️': 'trash-2',
  '⌨️': 'keyboard',
  '⊞': 'columns-2',
  '➕': 'plus',
  '✕': 'x',
  '✅': 'check-circle',

  // Chevrons
  '◀': 'chevron-left',
  '▶': 'chevron-right',
  '▲': 'chevron-up',
  '▼': 'chevron-down',

  // Status
  '⚠️': 'alert-triangle',
  '🚫': 'ban',

  // Misc
  '⠿': 'grip-vertical',
};

/**
 * Default icon for unknown types
 */
export const DEFAULT_ICON: IconName = 'file';

/**
 * Set of valid icon names for quick lookup
 */
const VALID_ICON_NAMES: Set<string> = new Set([
  // Object types
  'circle-check', 'file-text', 'folder', 'layers', 'link', 'calendar', 'tag', 'user', 'clipboard', 'file',
  // Navigation
  'inbox', 'search', 'history', 'calendar-days', 'settings',
  // Theme
  'moon', 'sun',
  // Actions
  'zap', 'sparkles', 'pin', 'pin-off', 'archive', 'archive-restore', 'trash-2', 'keyboard', 'columns-2', 'plus', 'x', 'check', 'edit-2', 'arrow-right', 'sliders-horizontal', 'flag', 'shapes',
  // Arrows & Chevrons
  'arrow-left', 'chevron-left', 'chevron-right', 'chevrons-left', 'chevrons-right', 'chevron-up', 'chevron-down',
  // Status indicators
  'alert-triangle', 'ban', 'check-circle', 'circle', 'loader',
  // Content
  'external-link', 'copy', 'download', 'upload', 'refresh-cw', 'more-horizontal', 'grip-vertical', 'arrow-up-down', 'filter', 'list', 'layout-grid',
  // History
  'rotate-ccw', 'git-compare',
  // Security
  'key',
  // Devices
  'monitor', 'laptop', 'smartphone',
  // Time
  'clock',
  // Close/Cancel
  'x-circle',
  // Misc
  'info', 'lock', 'unlock', 'globe', 'shield', 'wifi', 'wifi-off',
  // Settings & About
  'palette', 'book-open', 'github', 'message-circle',
]);

/**
 * Get the Lucide icon name for an emoji or icon name, with fallback
 * Handles both emoji-to-icon conversion and passthrough for valid icon names
 */
export function getIconFromEmoji(icon: string): IconName {
  // First check if it's already a valid icon name
  if (VALID_ICON_NAMES.has(icon)) {
    return icon as IconName;
  }
  // Then check emoji mapping
  return EMOJI_TO_ICON[icon] ?? DEFAULT_ICON;
}
