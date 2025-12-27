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

      // Don't render if object was deleted
      if (store && objectId) {
        const obj = store.get(objectId);
        if (!obj) {
          // Return empty span to not break inline content flow
          return <span />;
        }

        // Use current name from object (reflects title changes)
        const currentName = (obj.properties.title ?? obj.properties.name) as string | undefined;
        const displayName = currentName || objectName || 'Unknown';

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
      }

      // Fallback if store not available
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
