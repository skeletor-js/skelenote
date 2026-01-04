/**
 * MentionChip - Inline mention component for BlockNote editor
 * Displays object references as styled chips within the editor
 * Dynamically looks up object name to reflect title changes
 * Clicking navigates to the mentioned object
 */

import { createReactInlineContentSpec } from '@blocknote/react';
import { useObjects, useNavigation } from '@/contexts';
import './MentionChip.css';

interface MentionChipProps {
  objectId: string;
  objectName: string;
  objectTypeId: string;
}

/**
 * Inner component that uses hooks - must be a proper React component
 */
function MentionChipComponent({ objectId, objectName, objectTypeId }: MentionChipProps) {
  const { store } = useObjects();
  const { navigateToObject, openInSplit } = useNavigation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (objectId) {
      if (e.metaKey || e.ctrlKey) {
        openInSplit(objectId);
      } else {
        navigateToObject(objectId);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (objectId) {
        if (e.metaKey || e.ctrlKey) {
          openInSplit(objectId);
        } else {
          navigateToObject(objectId);
        }
      }
    }
  };

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
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
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
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
    >
      @{objectName || 'Unknown'}
    </span>
  );
}

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
        <MentionChipComponent
          objectId={objectId}
          objectName={objectName}
          objectTypeId={objectTypeId}
        />
      );
    },
  }
);
