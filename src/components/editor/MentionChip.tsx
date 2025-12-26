/**
 * MentionChip - Inline mention component for BlockNote editor
 * Displays object references as styled chips within the editor
 */

import { createReactInlineContentSpec } from '@blocknote/react';
import './MentionChip.css';

// The mention inline content spec for BlockNote
export const Mention = createReactInlineContentSpec(
  {
    type: 'mention',
    propSchema: {
      objectId: {
        default: '',
      },
      objectName: {
        default: '',
      },
      objectTypeId: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { objectId, objectName, objectTypeId } = props.inlineContent.props;

      return (
        <span
          className="mention-chip"
          data-object-id={objectId}
          data-type-id={objectTypeId}
          contentEditable={false}
        >
          @{objectName || 'Unknown'}
        </span>
      );
    },
  }
);
