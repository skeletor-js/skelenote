# Visual Assets Plan: "Showing The Study"

**Date:** January 18, 2026
**Status:** DRAFT
**Requirement:** Public Launch V1.0

## 1. Objective

To validate the "Cozy Rationalism" aesthetic claim and reduce onboarding friction by injecting high-quality visuals into key documentation. The docs are currently 95% text, which fails to communicate the specialized design system (Sage/Ember palette, high density).

## 2. Core Principles for Assets

* **Theme:** **Light Mode** primary. It highlights the "Sage/Ember" warmth better than dark mode on most displays.
* **Window State:** "Lived In" but clean. No "Untitled" files. Use realistic dummy data (e.g., "Garden Planning", "Q4 Roadmap").
* **Framing:** Clean window capture with standard macOS shadow. No desktop background wallpapers.

## 3. Required Output List

### A. The "Hero" Shot (Desktop)

* **Target Files:** `README.md`, `docs/user/getting-started.md`.
* **Composition:**
  * **Sidebar:** Expanded. Shows a neatly organized PARA structure (Projects, Areas, Resources, Archives).
  * **Main Pane:** A rich document (e.g., "Weekly Review") with headers, checkboxes, and block-quotes.
  * **Secondary Pane (Opt):** A reference note or task list.
* **Goal:** Prove "High Density, Low Noise."

### B. The "Inbox Ritual"

* **Target File:** `docs/user/getting-started.md` (Section: "The Inbox Ritual").
* **Composition:**
  * Focus on the **Inbox** view.
  * Show 3-5 unprocessed items. Some with tags (`#idea`), some plain text.
* **Goal:** Visualize the "Landing Zone" concept.

### C. Local Sync (Connectivity)

* **Target File:** `docs/user/guides/local-sync-guide.md`.
* **Composition:**
  * **Settings Panel:** Sync / Devices.
  * **Key Element:** "Connected Devices" list showing **Green Dots** (active connection).
  * **Toggle:** "Local Sync" enabled.
* **Goal:** Assurance. Show the user what "It's working" looks like.

### D. Mobile Engagement (Triptych)

* **Target File:** `docs/user/guides/mobile-guide.md`.
* **Composition:** Three iPhone visuals side-by-side.
    1. **Browse:** Bottom tab navigation active.
    2. **Capture:** FAB (Floating Action Button) menu expanded.
    3. **Edit:** Keyboard up, rich text editing.
* **Goal:** Show feature parity with desktop.

### E. Omnibar Speed

* **Target File:** `docs/user/guides/keyboard-shortcuts.md`.
* **Composition:** Center crop of the Omnibar (`Cmd+K`).
* **State:** User has typed "New Pro...", showing "Create New Project" as top hit.
* **Goal:** Demonstrate "Keyboard First" efficiency.

## 4. Production Checklist

* [ ] **Data Prep:** Create a "Press Kit" vault with realistic content.
* [ ] **Capture:** Capture all Desktop assets at Retina (2x) resolution.
* [ ] **Mobile:** Use Xcode Simulator / Android Emulator for clean status bars (9:41 AM, Full Battery).
* [ ] **Optimization:** Convert all PNG to optimized WebP.
* [ ] **Placement:** Commit to `docs/assets/images/` and update references in markdown.
