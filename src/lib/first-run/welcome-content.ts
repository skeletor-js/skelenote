/**
 * Welcome note content for first-run experience
 * Returns BlockNote blocks as a JSON array
 */

/**
 * Generate welcome note content with a link to today's daily note
 */
export function getWelcomeNoteBlocks(
  dailyNoteId: string,
  dailyNoteName: string
): unknown[] {
  return [
    {
      id: 'welcome-1',
      type: 'heading',
      props: { level: 2 },
      content: [{ type: 'text', text: 'Welcome to skelenote', styles: {} }],
      children: [],
    },
    {
      id: 'welcome-2',
      type: 'paragraph',
      props: {},
      content: [
        {
          type: 'text',
          text: 'skelenote is a personal knowledge base built around objects and connections. Here are the key concepts to get you started:',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'welcome-3',
      type: 'heading',
      props: { level: 3 },
      content: [{ type: 'text', text: 'Quick Capture', styles: {} }],
      children: [],
    },
    {
      id: 'welcome-4',
      type: 'paragraph',
      props: {},
      content: [
        { type: 'text', text: 'Press ', styles: {} },
        { type: 'text', text: 'Cmd+N', styles: { code: true } },
        {
          type: 'text',
          text: ' to quickly capture a thought. It goes straight to your inbox for later processing.',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'welcome-5',
      type: 'heading',
      props: { level: 3 },
      content: [{ type: 'text', text: 'Command Palette', styles: {} }],
      children: [],
    },
    {
      id: 'welcome-6',
      type: 'paragraph',
      props: {},
      content: [
        { type: 'text', text: 'Press ', styles: {} },
        { type: 'text', text: 'Cmd+K', styles: { code: true } },
        {
          type: 'text',
          text: ' to open the command palette. From there you can create new objects, search, and navigate anywhere.',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'welcome-7',
      type: 'heading',
      props: { level: 3 },
      content: [{ type: 'text', text: 'Inbox Workflow', styles: {} }],
      children: [],
    },
    {
      id: 'welcome-8',
      type: 'paragraph',
      props: {},
      content: [
        {
          type: 'text',
          text: 'New items land in your Inbox. Process them by opening each item and clicking "Process" when you\'re done reviewing or editing.',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'welcome-9',
      type: 'heading',
      props: { level: 3 },
      content: [{ type: 'text', text: 'Relations & Backlinks', styles: {} }],
      children: [],
    },
    {
      id: 'welcome-10',
      type: 'paragraph',
      props: {},
      content: [
        { type: 'text', text: 'Use ', styles: {} },
        { type: 'text', text: '@', styles: { code: true } },
        {
          type: 'text',
          text: ' to mention other objects in your notes. These create backlinks that help you discover connections between ideas.',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'welcome-11',
      type: 'heading',
      props: { level: 3 },
      content: [{ type: 'text', text: 'Daily Notes', styles: {} }],
      children: [],
    },
    {
      id: 'welcome-12',
      type: 'paragraph',
      props: {},
      content: [
        {
          type: 'text',
          text: "Your daily note is created automatically each day. Use it as a central hub to log thoughts, link to tasks, and capture what happened. Today's note: ",
          styles: {},
        },
        {
          type: 'mention',
          props: {
            objectId: dailyNoteId,
            objectName: dailyNoteName,
            objectTypeId: 'note',
          },
        },
      ],
      children: [],
    },
    {
      id: 'welcome-13',
      type: 'paragraph',
      props: {},
      content: [],
      children: [],
    },
    {
      id: 'welcome-14',
      type: 'paragraph',
      props: {},
      content: [
        {
          type: 'text',
          text: 'Start by processing this welcome note from your inbox, then explore!',
          styles: { italic: true },
        },
      ],
      children: [],
    },
  ];
}
