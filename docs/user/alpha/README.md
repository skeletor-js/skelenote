# Welcome, Alpha Tester

Thank you for helping test Skelenote. Your feedback directly shapes what this app becomes.

## What "Alpha" Means

You're using early software. Expect rough edges:

- Some features may not work as expected
- The UI may change between updates
- Performance might be inconsistent with larger vaults

**Your data is safe.** We maintain backwards compatibility between alpha builds. Your notes, tasks, and Skeleton Key will persist across updates.

## Getting Started

1. **Download** the latest release from [GitHub Releases](https://github.com/skeletor-js/skelenote/releases)
2. **Install** following the platform-specific instructions below
3. **Set up your Skeleton Key** - this is your encryption password. Write down the 24 words somewhere safe.
4. **Explore** - create objects, try sync, break things

### Platform Notes

#### macOS
The app is unsigned during alpha. To open it:
1. Right-click (or Control-click) the app
2. Select "Open" from the context menu
3. Click "Open" in the dialog that appears

You only need to do this once.

#### Windows
Windows Defender may show a SmartScreen warning:
1. Click "More info"
2. Click "Run anyway"

#### Linux
Make the AppImage executable:
```bash
chmod +x Skelenote_*.AppImage
./Skelenote_*.AppImage
```

## How to Help

### Report Bugs
Found something broken? [Open a bug report](https://github.com/skeletor-js/skelenote/issues/new?template=bug_report.yml).

Before reporting:
- Check [Known Issues](./KNOWN_ISSUES.md) to see if it's already documented
- Try the [Troubleshooting Guide](./TROUBLESHOOTING.md) first
- Search [existing issues](https://github.com/skeletor-js/skelenote/issues) to avoid duplicates

Good bug reports include:
- Steps to reproduce
- What you expected vs what happened
- Your OS and app version
- Screenshots or logs if relevant

### Request Features
Have an idea? [Open a feature request](https://github.com/skeletor-js/skelenote/issues/new?template=feature_request.yml).

### Join the Conversation
**Discord**: [Join our server](https://discord.gg/4apsgSRB7D) for real-time discussion, questions, and feedback.

GitHub Issues are for bugs and feature requests. Discord is for everything else.

## What to Test

We want feedback on everything, but here are the core flows to exercise:

### Core Object Workflows
- Create objects of each type (Task, Note, Project, Area, etc.)
- Edit titles and properties
- Use the rich text editor with @mentions
- Delete and archive objects
- Use the Inbox workflow

### Sync
- **Campfire** (local P2P): Connect two devices on the same network
- **Cloud Relay**: Set up relay sync if available
- Test conflict scenarios (edit the same object on two devices)

### Search
- Title search in the command palette (Cmd/Ctrl+K)
- Content search within objects
- Semantic search (if enabled in Settings)

### Daily Notes & Templates
- Let the app create today's Daily Note
- Link objects to the daily note
- Create and apply templates
- Test template placeholders ({{date}}, {{title}}, etc.)

### Import/Export
- Export individual objects as Markdown
- Bulk export your vault
- Verify exported files are readable

See the full [Testing Checklist](./TEST_PLAN.md) for detailed scenarios.

## Feedback That Helps Most

- **Specific > General**: "The save button doesn't respond when I click it after editing a task" is better than "saving is broken"
- **Reproduce > Describe**: Steps we can follow beat descriptions of what happened
- **Screenshots > Words**: A picture is worth a thousand bug reports
- **Harsh > Nice**: Tell us what's frustrating. We'd rather fix problems than hear that everything is fine.

## Quick Reference

| Need | Action |
|------|--------|
| Report a bug | [GitHub Issue](https://github.com/skeletor-js/skelenote/issues/new?template=bug_report.yml) |
| Request a feature | [GitHub Issue](https://github.com/skeletor-js/skelenote/issues/new?template=feature_request.yml) |
| Ask a question | [Discord](https://discord.gg/4apsgSRB7D) |
| Check known issues | [Known Issues](./KNOWN_ISSUES.md) |
| Troubleshoot | [Troubleshooting Guide](./TROUBLESHOOTING.md) |
| Learn the app | [Getting Started](../getting-started.md) |
| Keyboard shortcuts | [Shortcuts Reference](../guides/keyboard-shortcuts.md) |

---

Thanks for being part of building Skelenote.
