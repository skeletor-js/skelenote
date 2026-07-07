# Known Issues

This document tracks known bugs and limitations. Check here before reporting an issue.

---

## Critical Issues

*None currently documented.*

---

## Platform-Specific Issues

### macOS

| Issue | Status | Workaround |
|-------|--------|------------|
| *No issues currently documented* | | |

### Windows

| Issue | Status | Workaround |
|-------|--------|------------|
| *No issues currently documented* | | |

### Linux

| Issue | Status | Workaround |
|-------|--------|------------|
| *No issues currently documented* | | |

---

## Sync Issues

### Hearth

| Issue | Status | Workaround |
|-------|--------|------------|
| *No issues currently documented* | | |

### Relay Sync

| Issue | Status | Workaround |
|-------|--------|------------|
| No hosted relay exists | By design | Run your own relay (see [Self-Hosted Sync Guide](../guides/cloud-sync-guide.md)) |
| Sync uses whole-document snapshots | Known limitation | Concurrent edits to the *same* note merge coarsely; different notes reconcile cleanly |

---

## Editor Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| *No issues currently documented* | | |

---

## Search Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| *No issues currently documented* | | |

---

## Performance Notes

- **Large vaults** (1000+ objects): Some operations may be slower. We're optimizing.
- **Lantern**: Embedding generation runs locally and may take time on first use.

---

## Features In Progress

These features are partially implemented or coming soon:

| Feature | Status | Notes |
|---------|--------|-------|
| Mobile (iOS/Android) | Experimental | Builds from source via Tauri; not distributed. See [Mobile Guide](./guides/mobile-guide.md) |
| Graph view | Planned | Backlinks work; visualization later |

---

## Reporting New Issues

If your issue isn't listed here:

1. Try the [Troubleshooting Guide](./troubleshooting.md)
2. Search [existing issues](https://github.com/skeletor-js/skelenote/issues)
3. [File a bug report](https://github.com/skeletor-js/skelenote/issues)

---

*Last updated: July 2026*
