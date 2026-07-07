# Getting Started

> [!NOTE]
> **Active Development**: Skelenote is under active development. Your data is safe and backwards-compatible. New features ship regularly.

---

## Installation

There are no prebuilt binaries. Skelenote is build-from-source only, so running it means building it yourself.

You'll need Node.js 22, pnpm, and the Rust toolchain, plus your platform's native build dependencies. See the [README](https://github.com/skeletor-js/skelenote#quickstart) for the full prerequisite list per platform.

```bash
git clone https://github.com/skeletor-js/skelenote.git
cd skelenote
pnpm install
pnpm tauri dev      # run in dev mode with hot reload
```

To produce a local release bundle:

```bash
pnpm tauri build    # output lands in src-tauri/target/release/bundle/
```

### Mobile

The iOS and Android targets build from the same codebase via Tauri but are experimental and not distributed anywhere (no TestFlight, App Store, Play Store, or APK). To try them, build them yourself. See the [Mobile Guide](guides/mobile-guide.md).

---

## Your Skeleton Key

When you first open Skelenote, you'll create a **Skeleton Key**—a 24-word phrase that encrypts everything.

```
abandon ability able about above absent absorb abstract absurd abuse access accident ...
```

Write it down. Store it somewhere safe. This is not a password you can reset.

**We cannot recover your Skeleton Key.** That's the point. If we could recover it, so could someone else.

When you set up another device, enter this same phrase. Your vault follows you through your key, not our servers.

---

## The PARA Method

Skelenote comes with a built-in organization system:

| Section | What Lives Here |
|---------|-----------------|
| **Projects** | Active work with deadlines. Things that end. |
| **Areas** | Ongoing responsibilities. Things you maintain. |
| **Resources** | Reference material, organized by topic. |
| **Archive** | Completed work. Quiet, but searchable. |

This works on day one. Rearrange it as you grow.

---

## Your First Object

Everything in Skelenote is an **Object**. A quick task and a 5,000-word thesis share the same power.

1. Press `Cmd+N` (or `Ctrl+N`)
2. Give it a title
3. Start writing

Type `@` to link to other objects. Links are bidirectional—the other object shows your reference in Backlinks.

---

## The Inbox

New objects land in your **Inbox** by default. It's a holding area for thoughts that need sorting.

1. Capture freely throughout the day
2. Set aside time to process
3. Move each object where it belongs

---

## Daily Notes

Every day gets its own object, created automatically. Use it for morning intentions, meeting notes, or quick thoughts.

---

## Finding Things

- **Omnibar** (`Cmd+K`): Search objects, run commands, navigate anywhere.
- **Semantic search**: Search by meaning, not just keywords. Runs locally on your device.
- **Backlinks**: See what links to each object.

---

## Sync

- **Local sync**: Devices on the same network sync automatically. [Guide](guides/local-sync-guide.md)
- **Self-hosted sync**: Encrypted sync for remote devices through a relay you run. [Guide](guides/cloud-sync-guide.md)
- **Backup**: [Data safety guide](guides/data-safety.md)

---

## History

Made a mistake? Skelenote records your vault's history. Restore any object to any previous state.

---

## Feedback

- **Report issues or request features**: [GitHub Issues](https://github.com/skeletor-js/skelenote/issues)
- **Known issues**: [Status](known-issues.md)

---

## Next Steps

- [Keyboard Shortcuts](guides/keyboard-shortcuts.md)
- [Troubleshooting](troubleshooting.md)
- [Philosophy](about/philosophy-manifesto.md)

**Free. Encrypted. Yours.**
