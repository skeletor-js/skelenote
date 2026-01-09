# Known Issues

This document tracks known bugs and limitations in the current alpha release. Check here before reporting an issue.

**Current Version**: 0.2.0

---

## Critical Issues

*None currently documented.*

---

## Platform-Specific Issues

### macOS

| Issue | Status | Workaround |
|-------|--------|------------|
| App shows "unidentified developer" warning | Expected | Right-click > Open (see [Alpha README](./README.md)) |

### Windows

| Issue | Status | Workaround |
|-------|--------|------------|
| SmartScreen blocks app | Expected | Click "More info" > "Run anyway" |

### Linux

| Issue | Status | Workaround |
|-------|--------|------------|
| AppImage requires executable permission | Expected | Run `chmod +x Skelenote_*.AppImage` |

---

## Sync Issues

### Campfire (Local P2P)

| Issue | Status | Workaround |
|-------|--------|------------|
| *No issues currently documented* | | |

### Cloud Relay

| Issue | Status | Workaround |
|-------|--------|------------|
| Hosted relay not yet available | Planned | Self-host using Docker (see [Cloud Sync Guide](../guides/cloud-sync-guide.md)) |

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
- **Semantic search**: Embedding generation runs locally and may take time on first use.

---

## Features In Progress

These features are partially implemented or coming soon:

| Feature | Status | Notes |
|---------|--------|-------|
| Mobile apps | Planned | Desktop-first for now |
| Graph view | Planned | Backlinks work; visualization later |

---

## Reporting New Issues

If your issue isn't listed here:

1. Try the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Search [existing issues](https://github.com/skeletor-js/skelenote/issues)
3. [Open a bug report](https://github.com/skeletor-js/skelenote/issues/new?template=bug_report.yml)

---

*Last updated: January 2025*
