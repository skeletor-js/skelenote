/**
 * MentionChip - Inline mention component for BlockNote editor
 * Displays object references as styled chips within the editor
 * Dynamically looks up object name to reflect title changes
 */

import { createReactInlineContentSpec } from '@blocknote/react';
import { useObjects } from '@/contexts';
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
      const { store } = useObjects();

      // Dynamically look up the current object name
      let displayName = objectName || 'Unknown';
      if (store && objectId) {
        const obj = store.get(objectId);
        if (obj) {
          const currentName = (obj.properties.title ?? obj.properties.name) as string | undefined;
          if (currentName) {
            displayName = currentName;
          }
        }
      }

      return (
        <span
          className="mention-chip"
          data-object-id={objectId}
          data-type-id={objectTypeId}
          contentEditable={false}
        >
          @{displayName}
        </span>
      );
    },
  }
);
